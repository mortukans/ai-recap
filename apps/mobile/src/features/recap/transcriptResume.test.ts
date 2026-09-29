import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
    removeItem: async (k: string) => void store.delete(k),
  },
}));

const { loadResume, saveResume, clearResume, resumedCount } = await import('./transcriptResume');

const seg = (text: string) => ({ startTime: 0, endTime: 1, speakerLabel: null, language: 'lv', text });

describe('transcriptResume', () => {
  beforeEach(() => store.clear());

  it('round-trips cached chunks for the same model', async () => {
    const s = await loadResume('r1', 'gemini');
    s.chunks[1] = { language: 'lv', segments: [seg('a')] };
    s.chunks[2] = { language: 'en', segments: [seg('b')] };
    await saveResume('r1', s);

    const again = await loadResume('r1', 'gemini');
    expect(resumedCount(again)).toBe(2);
    expect(again.chunks[1].segments[0].text).toBe('a');
  });

  it('discards the cache when the model changes (fresh transcript)', async () => {
    const s = await loadResume('r2', 'gemini');
    s.chunks[1] = { language: 'lv', segments: [seg('x')] };
    await saveResume('r2', s);

    const other = await loadResume('r2', 'whisper');
    expect(resumedCount(other)).toBe(0);
  });

  it('clearResume empties it', async () => {
    const s = await loadResume('r3', 'gemini');
    s.chunks[1] = { language: 'lv', segments: [seg('y')] };
    await saveResume('r3', s);
    await clearResume('r3');
    expect(resumedCount(await loadResume('r3', 'gemini'))).toBe(0);
  });

  it('returns an empty cache when nothing is stored', async () => {
    expect(resumedCount(await loadResume('nope', 'gemini'))).toBe(0);
  });
});
