import type { RecapStatus } from '@ai-recap/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shared mutable state, hoisted so the vi.mock factories can safely reference it.
const h = vi.hoisted(() => ({
  store: new Map<string, { id: string; status: string; [k: string]: unknown }>(),
  state: {
    online: true,
    key: null as string | null,
    pausedPref: false,
    segments: null as unknown[] | null, // null → one fixed segment (see segmentsRepo mock)
    generate: (async () => ({})) as () => Promise<unknown>,
  },
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: async () => ({ isConnected: h.state.online }),
    addEventListener: () => () => {},
  },
}));

// react-native ships Flow syntax that the node test runner can't parse; the coordinator only needs AppState.
vi.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove: () => undefined }) },
}));

vi.mock('../features/recap/transcriptResume', () => ({ clearResume: async () => undefined }));

vi.mock('../db', () => ({
  recapsRepo: {
    getRecap: async (id: string) => h.store.get(id) ?? null,
    updateRecapStatus: async (id: string, status: string) => {
      const r = h.store.get(id);
      if (r) r.status = status;
    },
    updateRecap: async (id: string, patch: Record<string, unknown>) => {
      const r = h.store.get(id);
      if (r) Object.assign(r, patch);
    },
    listByStatuses: async (statuses: string[]) =>
      [...h.store.values()].filter((r) => statuses.includes(r.status)),
  },
  chunksRepo: { listChunks: async () => [] },
  segmentsRepo: {
    replaceSegments: async () => {},
    listSegments: async () =>
      h.state.segments ?? [{ id: 's', recapId: 'x', startTime: 0, endTime: 1, speakerLabel: null, language: 'lv', text: 'hi' }],
  },
  contextsRepo: { getContext: async () => null },
  attachmentsRepo: { collectExtraContext: async () => undefined },
  usageRepo: { addUsage: async () => {} },
}));
vi.mock('../features/usage/syncUsage', () => ({ syncUsage: async () => 0 }));
vi.mock('../features/recap/normalizeChunks', () => ({ ensureShortChunks: async () => 0 }));

vi.mock('../ai', () => ({
  SmartTranscriber: class {
    supportsDiarization = false;
    runsOnDevice = true;
    async transcribe() {
      return { segments: [], detectedLanguages: ['lv'], durationSeconds: 0 };
    }
  },
  DEFAULT_SUMMARY_MODEL: 'test-model',
  getByokLLMProvider: () => ({}),
  // Mirrors the real route: a BYOK key (h.state.key) unlocks summarization; nothing else in tests.
  resolveLLMRoute: async () => (h.state.key ? { provider: {}, kind: 'byok', model: 'openai/gpt-4o-mini' } : null),
  generateRecap: () => h.state.generate(),
}));

vi.mock('../security/byok-store', () => ({ getOpenRouterKey: async () => h.state.key }));
vi.mock('../lib/prefs', () => ({
  getRecapModels: async () => ({}),
  getSummaryModel: async () => null,
  getProcessingPaused: async () => h.state.pausedPref,
  setProcessingPaused: async (v: boolean) => {
    h.state.pausedPref = v;
  },
  setTranscriptionCoverage: async () => {},
}));
vi.mock('../lib/ids', () => ({ newId: () => Math.random().toString(36).slice(2) }));

const { ProcessingCoordinator } = await import('./coordinator');

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function seed(id: string, status: RecapStatus) {
  h.store.set(id, {
    id,
    status,
    title: '',
    startedAt: 0,
    endedAt: null,
    durationSeconds: 3, // short: an empty transcript is legitimate silence in these tests
    detectedLanguages: [],
    presetId: null,
    contextId: null,
    createdAt: 0,
    updatedAt: 0,
  });
}

function makeTranscriber(fail = false) {
  return {
    supportsDiarization: true,
    runsOnDevice: true,
    transcribe: vi.fn(async () => {
      if (fail) throw new Error('transcribe failed');
      return { segments: [], detectedLanguages: ['lv', 'en'], durationSeconds: 100 };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('ProcessingCoordinator', () => {
  beforeEach(() => {
    h.store.clear();
    h.state.online = true;
    h.state.key = null;
    h.state.pausedPref = false;
    h.state.segments = null;
    h.state.generate = async () => ({});
  });

  it('a recap left at transcribed with an empty transcript is transcribed again when run', async () => {
    seed('m', 'transcribed');
    h.store.get('m')!.durationSeconds = 525;
    h.state.segments = []; // stored by an older build
    const transcriber = makeTranscriber(); // still returns nothing → surfaces as a failure with Retry
    const c = new ProcessingCoordinator(transcriber);
    await c.enqueue('m');
    expect(transcriber.transcribe).toHaveBeenCalledTimes(1);
    expect(h.store.get('m')?.status).toBe('transcriptionFailed');
  });

  it('a force-stop survives relaunch: recover() rewinds but does not restart the queue', async () => {
    seed('j', 'transcribing'); // orphaned by a kill while busy
    h.state.pausedPref = true; // the user force-stopped before the relaunch
    const transcriber = makeTranscriber();
    const c = new ProcessingCoordinator(transcriber);
    await c.recover();
    await flush();
    expect(h.store.get('j')?.status).toBe('recorded'); // rewound, not stuck as "transcribing"
    expect(transcriber.transcribe).not.toHaveBeenCalled(); // and not re-run behind the user's back
    expect(c.isPaused()).toBe(true);

    await c.enqueue('j'); // explicit Run from the recap → processes and clears the pause
    expect(h.store.get('j')?.status).toBe('transcribed');
    expect(h.state.pausedPref).toBe(false);
  });

  it('parks an offline recap at waitingForNetwork', async () => {
    h.state.online = false;
    seed('a', 'recorded');
    const c = new ProcessingCoordinator(makeTranscriber());
    c.start();
    await flush(); // let the initial NetInfo.fetch() resolve
    await c.enqueue('a');
    expect(h.store.get('a')?.status).toBe('waitingForNetwork');
    c.stop();
  });

  it('rests at transcribed when no BYOK key is set', async () => {
    h.state.key = null;
    seed('b', 'recorded');
    const c = new ProcessingCoordinator(makeTranscriber());
    await c.enqueue('b');
    expect(h.store.get('b')?.status).toBe('transcribed');
  });

  it('drives to ready when a key is present', async () => {
    h.state.key = 'sk-or-xxx';
    h.state.generate = async () => ({ artifact: {}, doc: {} });
    seed('c', 'recorded');
    const c = new ProcessingCoordinator(makeTranscriber());
    await c.enqueue('c');
    expect(h.store.get('c')?.status).toBe('ready');
  });

  it('lands in transcriptionFailed after retries are exhausted', async () => {
    vi.useFakeTimers();
    seed('d', 'recorded');
    const c = new ProcessingCoordinator(makeTranscriber(true));
    const p = c.enqueue('d');
    await vi.runAllTimersAsync();
    await p;
    vi.useRealTimers();
    expect(h.store.get('d')?.status).toBe('transcriptionFailed');
  });

  it('retry() reprocesses a failed recap through to ready', async () => {
    h.state.key = 'sk-or-xxx';
    h.state.generate = async () => ({ artifact: {}, doc: {} });
    seed('e', 'transcriptionFailed');
    const c = new ProcessingCoordinator(makeTranscriber());
    await c.retry('e');
    expect(h.store.get('e')?.status).toBe('ready');
  });

  it('forceStop() rewinds a recap whose worker never finishes and frees the queue', async () => {
    seed('g', 'recorded');
    seed('h2', 'recorded');
    // A transcriber that ignores the abort signal and never resolves (e.g. a hung native call).
    let calls = 0;
    const hanging = {
      supportsDiarization: false,
      runsOnDevice: true,
      transcribe: vi.fn(() => {
        calls++;
        return calls === 1 ? new Promise(() => undefined) : Promise.resolve({ segments: [], detectedLanguages: ['lv'], durationSeconds: 1 });
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const c = new ProcessingCoordinator(hanging);
    const run = c.enqueue('g');
    await flush();
    expect(h.store.get('g')?.status).toBe('transcribing');
    expect(c.currentId()).toBe('g');

    await c.forceStop();
    expect(h.store.get('g')?.status).toBe('recorded'); // rerunnable, not stuck
    expect(c.currentId()).toBeNull();
    expect(c.isPaused()).toBe(true);
    await run; // pump() returned without waiting for the hung worker

    // Queue is usable again straight away: the next recap goes through with the same coordinator.
    await c.enqueue('h2');
    expect(h.store.get('h2')?.status).toBe('transcribed');
    expect(h.store.get('g')?.status).toBe('recorded'); // the orphaned pass did not write anything
  });

  it('force-stop during transcription leaves the recap rerunnable', async () => {
    seed('i', 'recorded');
    // A transcriber that only settles when the abort signal fires (like a long in-flight upload).
    const hanging = {
      supportsDiarization: false,
      runsOnDevice: false,
      transcribe: vi.fn(
        (input: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            input.signal?.addEventListener('abort', () => {
              const e = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          }),
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const c = new ProcessingCoordinator(hanging);
    const run = c.enqueue('i');
    await flush();
    expect(h.store.get('i')?.status).toBe('transcribing');
    await c.forceStop();
    await run;
    expect(h.store.get('i')?.status).toBe('recorded'); // rewound by forceStop, rerunnable
  });

  it('a partial transcript (some chunks skipped) still produces a recap', async () => {
    h.state.key = 'sk-or-xxx';
    h.state.generate = async () => ({ artifact: {}, doc: {} });
    seed('p', 'recorded');
    h.store.get('p')!.durationSeconds = 600;
    const partial = {
      supportsDiarization: false,
      runsOnDevice: false,
      transcribe: vi.fn(async () => ({
        segments: [{ startTime: 0, endTime: 2, speakerLabel: null, language: 'lv', text: 'hi' }],
        detectedLanguages: ['lv'],
        durationSeconds: 600,
        failedChunks: 2,
        failedSeconds: 120,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const c = new ProcessingCoordinator(partial);
    await c.enqueue('p');
    expect(partial.transcribe).toHaveBeenCalledTimes(1); // no whole-transcript retry loop anymore
    expect(h.store.get('p')?.status).toBe('ready');
  });

  it('an empty transcript for a real recording fails visibly instead of resting at transcribed', async () => {
    seed('k', 'recorded');
    h.store.get('k')!.durationSeconds = 525; // 8:45 watch recording
    const c = new ProcessingCoordinator(makeTranscriber()); // returns zero segments
    await c.enqueue('k');
    expect(h.store.get('k')?.status).toBe('transcriptionFailed');
    expect(c.getLastError('k')).toMatch(/empty/i);
  });

  it('a transcriber that throws (e.g. exhausted timeouts) fails visibly, not silently', async () => {
    seed('l', 'recorded');
    h.store.get('l')!.durationSeconds = 600;
    // Per-chunk retries now live inside the transcriber; the coordinator calls it once. If it still
    // throws, the recap must land in transcriptionFailed (Retry), never a silent stop.
    const failing = {
      supportsDiarization: false,
      runsOnDevice: false,
      transcribe: vi.fn(async () => {
        throw new Error('all chunks failed');
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const c = new ProcessingCoordinator(failing);
    await c.enqueue('l');
    expect(failing.transcribe).toHaveBeenCalledTimes(1); // no whole-transcript retry loop
    expect(h.store.get('l')?.status).toBe('transcriptionFailed');
  });

  it('a long transcription that keeps making progress is not killed by the watchdog', async () => {
    vi.useFakeTimers();
    h.state.key = 'sk-or-xxx';
    h.state.generate = async () => ({ artifact: {}, doc: {} });
    seed('w', 'recorded');
    h.store.get('w')!.durationSeconds = 9000; // 2.5 h
    const slow = {
      supportsDiarization: false,
      runsOnDevice: false,
      // 40 "chunks" 5 min apart = 200 min total, far past any flat deadline, but a heartbeat every
      // 5 min keeps the 8-min stall watchdog from firing.
      transcribe: vi.fn(async (input: { onProgress?: () => void }) => {
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 5 * 60_000));
          input.onProgress?.();
        }
        return { segments: [{ startTime: 0, endTime: 1, speakerLabel: null, language: 'lv', text: 'hi' }], detectedLanguages: ['lv'], durationSeconds: 9000 };
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const c = new ProcessingCoordinator(slow);
    const p = c.enqueue('w');
    await vi.runAllTimersAsync();
    await p;
    vi.useRealTimers();
    expect(h.store.get('w')?.status).toBe('ready');
  });

  it('a stalled transcription (no progress) is failed by the watchdog', async () => {
    vi.useFakeTimers();
    seed('s2', 'recorded');
    h.store.get('s2')!.durationSeconds = 600;
    const stuck = {
      supportsDiarization: false,
      runsOnDevice: false,
      transcribe: vi.fn(() => new Promise(() => undefined)), // never resolves, never heartbeats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const c = new ProcessingCoordinator(stuck);
    const p = c.enqueue('s2');
    await vi.advanceTimersByTimeAsync(9 * 60_000); // past the 8-min stall deadline
    await p;
    vi.useRealTimers();
    expect(h.store.get('s2')?.status).toBe('transcriptionFailed');
  });

  it('never deletes the recap on failure (audio invariant)', async () => {
    vi.useFakeTimers();
    seed('f', 'recorded');
    const c = new ProcessingCoordinator(makeTranscriber(true));
    const p = c.enqueue('f');
    await vi.runAllTimersAsync();
    await p;
    vi.useRealTimers();
    expect(h.store.has('f')).toBe(true);
  });
});
