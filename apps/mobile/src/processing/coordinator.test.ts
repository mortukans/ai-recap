import type { RecapStatus } from '@ai-recap/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shared mutable state, hoisted so the vi.mock factories can safely reference it.
const h = vi.hoisted(() => ({
  store: new Map<string, { id: string; status: string; [k: string]: unknown }>(),
  state: { online: true, key: null as string | null, generate: (async () => ({})) as () => Promise<unknown> },
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: async () => ({ isConnected: h.state.online }),
    addEventListener: () => () => {},
  },
}));

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
    listSegments: async () => [
      { id: 's', recapId: 'x', startTime: 0, endTime: 1, speakerLabel: null, language: 'lv', text: 'hi' },
    ],
  },
  contextsRepo: { getContext: async () => null },
  attachmentsRepo: { collectExtraContext: async () => undefined },
}));

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
  generateRecap: () => h.state.generate(),
}));

vi.mock('../security/byok-store', () => ({ getOpenRouterKey: async () => h.state.key }));
vi.mock('../lib/prefs', () => ({ getSummaryModel: async () => null }));
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
    durationSeconds: 100,
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
    h.state.generate = async () => ({});
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
