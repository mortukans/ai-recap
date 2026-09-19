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
import { AiRecapError, type Recap, type TranscriptSegment, isAiRecapError, retryTarget } from '@ai-recap/core';
import { presetContextId } from '@ai-recap/prompts';
import NetInfo from '@react-native-community/netinfo';

import {
  DEFAULT_SUMMARY_MODEL,
  SmartTranscriber,
  type TranscriptionProvider,
  generateRecap,
  resolveLLMRoute,
} from '../ai';
import { attachmentsRepo, chunksRepo, contextsRepo, recapsRepo, segmentsRepo } from '../db';
import { newId } from '../lib/ids';
import { getSummaryModel } from '../lib/prefs';
import { withRetry } from './backoff';

export class ProcessingCoordinator {
  private queue: string[] = [];
  private processing = false;
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
    if (!this.queue.includes(recapId)) this.queue.push(recapId);
    await this.pump();
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
    const resumable = await recapsRepo.listByStatuses(['recorded', 'waitingForNetwork', 'transcribed']);
    for (const r of resumable) {
      if (!this.queue.includes(r.id)) this.queue.push(r.id);
    }
    this.notify();
    await this.pump();
  }

  private async pump(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const id = this.queue[0];
        if (!id) break;
        await this.processRecap(id).catch(() => undefined);
        this.queue.shift();
      }
    } finally {
      this.processing = false;
    }
  }

  private async setStatus(id: string, status: Recap['status']): Promise<void> {
    await recapsRepo.updateRecapStatus(id, status);
    this.notify();
  }

  private async processRecap(id: string): Promise<void> {
    // Advance one recap as far as it can go this pass. `guard` prevents any accidental infinite loop.
    for (let guard = 0; guard < 12; guard++) {
      const recap = await recapsRepo.getRecap(id);
      if (!recap) return;

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
            await this.doTranscription(recap);
            await this.setStatus(id, 'transcribed');
          } catch (e) {
            this.recordFailure(id, 'transcription', e);
            await this.setStatus(id, 'transcriptionFailed');
            return;
          }
          break;
        }
        case 'transcribed': {
          if ((await resolveLLMRoute(DEFAULT_SUMMARY_MODEL)) === null) return; // rest until a key or Unlimited is available
          const segCount = (await segmentsRepo.listSegments(recap.id)).length;
          if (segCount === 0) return; // nothing to summarize (unsupported language / silence)
          await this.setStatus(id, 'summarizing');
          break;
        }
        case 'summarizing': {
          try {
            await this.doSummary(recap);
            await this.setStatus(id, 'ready');
          } catch (e) {
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
          return; // ready, or a failed state awaiting retry()
      }
    }
  }

  private async doTranscription(recap: Recap): Promise<void> {
    const chunks = await chunksRepo.listChunks(recap.id);
    const result = await withRetry(
      () => this.transcriber.transcribe({ recapId: recap.id, audioUris: chunks.map((ch) => ch.relativePath) }),
      { attempts: 3, baseMs: 10_000 },
    );
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
    await recapsRepo.updateRecap(recap.id, { detectedLanguages: result.detectedLanguages });
  }

  private async doSummary(recap: Recap): Promise<void> {
    const segments = await segmentsRepo.listSegments(recap.id);
    const context =
      (await contextsRepo.getContext(recap.contextId ?? presetContextId('workMeeting'))) ?? null;
    const route = await resolveLLMRoute((await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
    if (!route) throw new AiRecapError({ code: 'llm/missing-key', message: 'No LLM available (no key, not Unlimited).' });
    const extraContext = await attachmentsRepo.collectExtraContext(recap.id).catch(() => undefined);
    await withRetry(
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
        }),
      {
        attempts: 2,
        baseMs: 5_000,
        shouldRetry: (e) => !(isAiRecapError(e) && e.code === 'llm/missing-key'),
      },
    );
  }
}

/** App-wide singleton. OpenAI Whisper if an OpenAI key is set, else Apple on-device (Product Plan §7). */
export const processingCoordinator = new ProcessingCoordinator(new SmartTranscriber());
