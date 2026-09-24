/**
 * ProcessingCoordinator — drives recaps through the pipeline
 *   recorded → [waitingForNetwork] → transcribing → transcribed → summarizing → ready
 * with an ordered offline queue, connectivity-aware resumption, and bounded retries.
 * (AI_RECAP_TECHNICAL_ARCHITECTURE.md §6/§9, MVP task M2-3.)
 *
 * INVARIANT: a failure never deletes source audio; failed recaps rest until retry().
 * Transcription uses an injected TranscriptionProvider (MockTranscriber today; HostedTranscriber in M2).
 * Summarization reuses generateRecap (BYOK); if no key is set, the recap rests at `transcribed`.
 */
import { AiRecapError, type Recap, type TranscriptSegment, isAiRecapError, retryTarget, titleFromTranscript } from '@ai-recap/core';
import { presetContextId } from '@ai-recap/prompts';
import NetInfo from '@react-native-community/netinfo';

import {
  DEFAULT_SUMMARY_MODEL,
  SmartTranscriber,
  type TranscriptionProvider,
  generateRecap,
  resolveLLMRoute,
} from '../ai';
import { attachmentsRepo, chunksRepo, contextsRepo, recapsRepo, segmentsRepo, usageRepo } from '../db';
import { ensureShortChunks } from '../features/recap/normalizeChunks';
import { syncUsage } from '../features/usage/syncUsage';
import { newId } from '../lib/ids';
import { getProcessingPaused, getRecapModels, getSummaryModel, setProcessingPaused } from '../lib/prefs';
import { withRetry } from './backoff';

const PASS_DEADLINE_MS = 25 * 60_000;

/** Resolves when `signal` aborts (never, if it does not). */
function onAbort(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) resolve();
    else signal.addEventListener('abort', () => resolve(), { once: true });
  });
}

export class ProcessingCoordinator {
  private queue: string[] = [];
  private processing = false;
  /** The recap being worked on right now and the controller that cancels its network calls. */
  private current: { id: string; controller: AbortController } | null = null;
  /** Set by forceStop(); nothing runs until the user reruns a recap or resumes. */
  private paused = false;
  private online = true;
  private netUnsub: (() => void) | null = null;
  private listeners = new Set<() => void>();
  /** Last failure per recap (in-memory) so the UI can explain a *Failed status and offer Retry. */
  private lastErrors = new Map<string, string>();

  constructor(private readonly transcriber: TranscriptionProvider) {}

  /** Human-readable reason for the most recent failure of this recap, if any. */
  getLastError(recapId: string): string | null {
    return this.lastErrors.get(recapId) ?? null;
  }

  private recordFailure(recapId: string, stage: 'transcription' | 'summary', e: unknown): void {
    const message = e instanceof Error ? e.message : String(e);
    this.lastErrors.set(recapId, message);
    console.warn(`[processing] ${stage} failed for ${recapId}:`, message);
  }

  start(): void {
    void NetInfo.fetch().then((s) => {
      this.online = s.isConnected !== false;
    });
    this.netUnsub = NetInfo.addEventListener((s) => {
      const wasOnline = this.online;
      this.online = s.isConnected !== false;
      if (!wasOnline && this.online) void this.pump(); // reconnected → drain queue
    });
  }

  stop(): void {
    this.netUnsub?.();
    this.netUnsub = null;
  }

  /** Subscribe to status changes (UI can refresh). Returns an unsubscribe function. */
  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  async enqueue(recapId: string): Promise<void> {
    await this.setPaused(false);
    if (!this.queue.includes(recapId)) this.queue.push(recapId);
    await this.pump();
  }

  /** True while this recap's transcription/summary call is actually in flight (not merely resting). */
  isActive(recapId: string): boolean {
    return this.current?.id === recapId;
  }

  private async setPaused(paused: boolean): Promise<void> {
    this.paused = paused;
    await setProcessingPaused(paused);
  }

  /** Id of the recap currently being processed (for the "Apstrādā…" banner), if any. */
  currentId(): string | null {
    return this.current?.id ?? null;
  }

  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Force stop: abort the in-flight network call, rewind the current recap to its last resting
   * state (so it can be rerun from its screen), drop the rest of the queue and pause. Nothing runs
   * again until the user reruns a recap (Retry / Restart / Generate) or calls resumeAll().
   */
  async forceStop(): Promise<void> {
    await this.setPaused(true);
    this.queue = [];
    const stopped = this.current;
    this.current = null;
    // Abort the in-flight call. The worker may not be cancellable (Apple on-device recognition, a
    // hung native call), so don't wait for it: rewind the resting state here and detach (pump() races
    // the pass against its abort signal, and an orphaned pass never writes once its signal is aborted).
    stopped?.controller.abort();
    await this.rewindBusy();
    this.notify();
  }

  /** Every recap that looks busy rests at its last stable state: transcribing → recorded, summarizing → transcribed. */
  private async rewindBusy(): Promise<void> {
    for (const r of await recapsRepo.listByStatuses(['transcribing'])) {
      await recapsRepo.updateRecapStatus(r.id, 'recorded');
    }
    for (const r of await recapsRepo.listByStatuses(['summarizing'])) {
      await recapsRepo.updateRecapStatus(r.id, 'transcribed');
    }
  }

  /** Continue processing every recap that is resting mid-pipeline. */
  async resumeAll(): Promise<void> {
    await this.setPaused(false);
    const resumable = await recapsRepo.listByStatuses(['recorded', 'waitingForNetwork', 'transcribed']);
    for (const r of resumable) if (!this.queue.includes(r.id)) this.queue.push(r.id);
    this.notify();
    await this.pump();
  }

  private isAbort(e: unknown): boolean {
    return e instanceof Error && (e.name === 'AbortError' || /aborted|stopped/i.test(e.message));
  }

  async retry(recapId: string): Promise<void> {
    const recap = await recapsRepo.getRecap(recapId);
    if (!recap) return;
    const target = retryTarget(recap.status);
    if (target) {
      this.lastErrors.delete(recapId);
      await recapsRepo.updateRecapStatus(recapId, target);
      this.notify();
    }
    await this.enqueue(recapId);
  }

  /**
   * User-initiated restart of a recap that looks stuck while "busy": rewind to the last resting state
   * (recorded, or transcribed when a transcript exists) and put it at the front of the queue.
   */
  async restart(recapId: string): Promise<void> {
    const recap = await recapsRepo.getRecap(recapId);
    if (!recap || recap.status === 'recording') return;
    const hasTranscript = (await segmentsRepo.listSegments(recapId)).length > 0;
    const target: Recap['status'] = hasTranscript && ['summarizing', 'transcribed', 'summaryFailed', 'ready'].includes(recap.status) ? 'transcribed' : 'recorded';
    this.lastErrors.delete(recapId);
    if (this.current?.id === recapId) {
      this.current.controller.abort(); // cancel the in-flight attempt first; pump() moves on without waiting for it
      this.current = null;
    }
    await recapsRepo.updateRecapStatus(recapId, target);
    this.queue = this.queue.filter((q) => q !== recapId);
    this.queue.unshift(recapId);
    await this.setPaused(false);
    this.notify();
    void this.pump();
  }

  /** On launch: reset recaps orphaned mid-processing by a crash, then enqueue anything resumable. */
  async recover(): Promise<void> {
    // Recording interrupted by a crash: rebuild from the chunks already persisted on disk (§5.5).
    for (const r of await recapsRepo.listByStatuses(['recording'])) {
      const chunks = await chunksRepo.listChunks(r.id);
      const duration = chunks.reduce((sum, c) => sum + c.duration, 0);
      await recapsRepo.updateRecap(r.id, { status: 'recorded', durationSeconds: duration, endedAt: Date.now() });
    }
    for (const r of await recapsRepo.listByStatuses(['transcribing'])) {
      await recapsRepo.updateRecapStatus(r.id, 'recorded');
    }
    for (const r of await recapsRepo.listByStatuses(['summarizing'])) {
      await recapsRepo.updateRecapStatus(r.id, 'transcribed');
    }
    // A force-stop survives relaunch: resting recaps stay put until the user runs one or resumes all.
    if (await getProcessingPaused()) {
      this.paused = true;
      this.notify();
      return;
    }
    const resumable = await recapsRepo.listByStatuses(['recorded', 'waitingForNetwork', 'transcribed']);
    for (const r of resumable) {
      if (!this.queue.includes(r.id)) this.queue.push(r.id);
    }
    this.notify();
    // Processing runs in the background — callers (bootstrap) must never wait on network/AI work.
    void this.pump();
  }

  private async pump(): Promise<void> {
    if (this.processing || this.paused) return;
    this.processing = true;
    try {
      while (this.queue.length > 0 && !this.paused) {
        const id = this.queue[0];
        if (!id) break;
        const controller = new AbortController();
        const pass = { id, controller };
        this.current = pass;
        this.notify();
        try {
          // A force-stop/restart aborts the signal; the pass is then abandoned immediately even if the
          // underlying work cannot be cancelled (it is guarded against writing after abort).
          await Promise.race([
            this.withWatchdog(id, this.processRecap(id, controller.signal), controller.signal).catch(() => undefined),
            onAbort(controller.signal),
          ]);
        } finally {
          if (this.current === pass) this.current = null;
          this.notify();
        }
        this.queue = this.queue.filter((q) => q !== id);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * The queue is sequential, so one stalled recap would block every later one. Network calls already
   * carry their own timeouts; this is the last line of defence: after `PASS_DEADLINE_MS` the recap is
   * marked failed (Retry stays available) and the queue moves on.
   */
  private async withWatchdog(id: string, work: Promise<void>, signal: AbortSignal): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), PASS_DEADLINE_MS);
    });
    try {
      const outcome = await Promise.race([work.then(() => 'done' as const), deadline]);
      if (outcome === 'timeout' && !signal.aborted) {
        const recap = await recapsRepo.getRecap(id);
        const stage = recap?.status === 'summarizing' ? 'summary' : 'transcription';
        this.recordFailure(id, stage, new Error(`Processing exceeded ${Math.round(PASS_DEADLINE_MS / 60000)} min — stopped so other recordings can continue.`));
        await this.setStatus(id, stage === 'summary' ? 'summaryFailed' : 'transcriptionFailed');
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async setStatus(id: string, status: Recap['status']): Promise<void> {
    await recapsRepo.updateRecapStatus(id, status);
    this.notify();
  }

  private async processRecap(id: string, signal: AbortSignal): Promise<void> {
    // Advance one recap as far as it can go this pass. `guard` prevents any accidental infinite loop.
    for (let guard = 0; guard < 12; guard++) {
      if (signal.aborted) return; // stopped by the user — the coordinator already rewound the status
      const recap = await recapsRepo.getRecap(id);
      if (!recap || signal.aborted) return;

      switch (recap.status) {
        case 'recorded':
        case 'waitingForNetwork': {
          if (!this.online) {
            await this.setStatus(id, 'waitingForNetwork');
            return;
          }
          await this.setStatus(id, 'transcribing');
          break;
        }
        case 'transcribing': {
          try {
            await this.doTranscription(recap, signal);
            if (signal.aborted) return;
            await this.setStatus(id, 'transcribed');
          } catch (e) {
            if (signal.aborted) return; // force-stopped: forceStop() already rewound to `recorded`
            this.recordFailure(id, 'transcription', e); // includes request timeouts — never leave it "transcribing"

            await this.setStatus(id, 'transcriptionFailed');
            return;
          }
          break;
        }
        case 'transcribed': {
          const segCount = (await segmentsRepo.listSegments(recap.id)).length;
          if (segCount === 0) {
            // Older builds stored an empty transcript for a real recording (one long watch chunk → empty
            // model reply). Running such a recap means transcribing it again, not summarizing nothing.
            if (recap.durationSeconds >= 5) {
              await this.setStatus(id, 'recorded');
              break;
            }
            return; // genuinely silent clip: nothing to summarize
          }
          if ((await resolveLLMRoute(DEFAULT_SUMMARY_MODEL)) === null) return; // rest until a key or Unlimited is available
          await this.setStatus(id, 'summarizing');
          break;
        }
        case 'summarizing': {
          try {
            await this.doSummary(recap, signal);
            if (signal.aborted) return;
            await this.setStatus(id, 'ready');
          } catch (e) {
            if (signal.aborted) return; // force-stopped: forceStop() already rewound to `transcribed`
            if (isAiRecapError(e) && e.code === 'llm/missing-key') {
              await this.setStatus(id, 'transcribed');
              return;
            }
            this.recordFailure(id, 'summary', e);
            await this.setStatus(id, 'summaryFailed');
            return;
          }
          break;
        }
        default:
          void syncUsage(); // recap reached a resting state → mirror usage to the backend
          return; // ready, or a failed state awaiting retry()
      }
    }
  }

  private async doTranscription(recap: Recap, signal?: AbortSignal): Promise<void> {
    // Watch recordings arrive as one long file; transcribe in ≤ 60 s pieces like phone recordings.
    await ensureShortChunks(recap.id).catch((e) => console.warn('[processing] chunk split skipped:', String(e)));
    const chunks = await chunksRepo.listChunks(recap.id);
    const result = await withRetry(
      () => this.transcriber.transcribe({ recapId: recap.id, audioUris: chunks.map((ch) => ch.relativePath), signal }),
      // Timeouts are retried; only the user's stop ends the attempts early.
      { attempts: 3, baseMs: 10_000, shouldRetry: () => !signal?.aborted, signal },
    );
    if (result.segments.length === 0 && recap.durationSeconds >= 5) {
      // An empty transcript for a real recording is a failure to surface (Retry), not a resting state:
      // otherwise the recap sits at "transcribed" forever with nothing to summarize.
      throw new AiRecapError({ code: 'transcription/failed', message: 'The transcript came back empty (no speech recognized). Try again or choose another transcription model.', retryable: true });
    }
    const segments = result.segments.map<TranscriptSegment>((s) => ({
      id: newId(),
      recapId: recap.id,
      startTime: s.startTime,
      endTime: s.endTime,
      speakerLabel: s.speakerLabel,
      language: s.language,
      text: s.text,
    }));
    await segmentsRepo.replaceSegments(recap.id, segments);
    // Provisional name from the first words spoken; replaced by the AI title once the recap is generated.
    const provisionalTitle = recap.title.trim() ? undefined : titleFromTranscript(segments.map((s) => s.text));
    await recapsRepo.updateRecap(recap.id, {
      detectedLanguages: result.detectedLanguages,
      ...(provisionalTitle ? { title: provisionalTitle } : {}),
    });
    // Usage accounting (M5-5): seconds transcribed + which provider did it.
    await usageRepo
      .addUsage({
        id: newId(),
        recapId: recap.id,
        recordingSeconds: 0,
        transcriptionSeconds: result.durationSeconds || recap.durationSeconds,
        inputTokens: 0,
        outputTokens: 0,
        model: '',
        provider: this.transcriber.runsOnDevice ? 'on-device' : 'transcription',
        estimatedCostMicros: 0,
        occurredAt: Date.now(),
        syncedToBackend: false,
      })
      .catch(() => undefined);
  }

  private async doSummary(recap: Recap, signal?: AbortSignal): Promise<void> {
    const segments = await segmentsRepo.listSegments(recap.id);
    const context =
      (await contextsRepo.getContext(recap.contextId ?? presetContextId('workMeeting'))) ?? null;
    const override = (await getRecapModels(recap.id)).summaryModel;
    const route = await resolveLLMRoute(override ?? (await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
    if (!route) throw new AiRecapError({ code: 'llm/missing-key', message: 'No LLM available (no key, not Unlimited).' });
    const extraContext = await attachmentsRepo.collectExtraContext(recap.id).catch(() => undefined);
    const generated = await withRetry(
      () =>
        generateRecap({
          recapId: recap.id,
          meta: {
            title: recap.title || undefined,
            detectedLanguages: recap.detectedLanguages,
            durationSeconds: recap.durationSeconds,
          },
          context,
          transcript: segments,
          provider: route.provider,
          model: route.model,
          extraContext,
          signal,
        }),
      {
        attempts: 2,
        baseMs: 5_000,
        shouldRetry: (e) => !(isAiRecapError(e) && e.code === 'llm/missing-key') && !this.isAbort(e),
        signal,
      },
    );
    // Auto-name the recap from the model's title (the user can rename it any time on the recap screen).
    // Auto-name: the model's title replaces an empty title or the provisional first-words title, but
    // never a name the user typed.
    const aiTitle = generated?.doc?.title?.trim();
    const current = recap.title.trim();
    const provisional = titleFromTranscript(segments.map((s) => s.text));
    if (aiTitle && (!current || current === provisional)) {
      await recapsRepo.updateRecap(recap.id, { title: aiTitle });
    }
  }
}

/** App-wide singleton. OpenAI Whisper if an OpenAI key is set, else Apple on-device (Product Plan §7). */
export const processingCoordinator = new ProcessingCoordinator(new SmartTranscriber());
