import { describe, expect, it } from 'vitest';

import { looksLikeSttModel, normalizeSttLanguage, sttSegments } from './sttParse';

describe('looksLikeSttModel', () => {
  it('recognises the dedicated speech-to-text ids', () => {
    for (const id of [
      'openai/whisper-large-v3',
      'openai/whisper-1',
      'openai/gpt-4o-mini-transcribe',
      'openai/gpt-transcribe',
      'microsoft/mai-transcribe-2',
      'x-ai/grok-stt-1.0',
      'deepgram/nova-3',
      'google/chirp-3',
      'nvidia/parakeet-tdt-0.6b-v3',
      'qwen/qwen3-asr-1.7b',
      'mistralai/voxtral-mini-transcribe',
      'mistralai/voxtral-small-24b-2507-stt',
      'assemblyai/universal-3-5-pro',
      'fish-audio/transcribe-1',
    ]) {
      expect(looksLikeSttModel(id), id).toBe(true);
    }
  });

  it('leaves audio-capable chat models on the chat path', () => {
    for (const id of ['google/gemini-2.5-flash-lite', 'google/gemini-3.5-flash', 'mistralai/voxtral-small-24b-2507', 'openai/gpt-audio']) {
      expect(looksLikeSttModel(id), id).toBe(false);
    }
  });
});

describe('normalizeSttLanguage', () => {
  it('maps names and locale codes to ISO-639-1', () => {
    expect(normalizeSttLanguage('english')).toBe('en');
    expect(normalizeSttLanguage('Latvian')).toBe('lv');
    expect(normalizeSttLanguage('lv-LV')).toBe('lv');
    expect(normalizeSttLanguage('en')).toBe('en');
    expect(normalizeSttLanguage('')).toBeNull();
    expect(normalizeSttLanguage(undefined)).toBeNull();
    expect(normalizeSttLanguage('klingon-ish?')).toBeNull();
  });
});

describe('sttSegments', () => {
  it('uses provider segments, clamped to the chunk, dropping empty ones', () => {
    const out = sttSegments(
      { text: 'a b', segments: [{ start: 0.5, end: 7.6, text: ' Sveiki ' }, { start: 7.6, end: 99, text: 'hello' }, { start: 8, end: 9, text: '  ' }] },
      60,
    );
    expect(out).toEqual([
      { start: 0.5, end: 7.6, text: 'Sveiki', speaker: null },
      { start: 7.6, end: 60, text: 'hello', speaker: null },
    ]);
  });

  it('falls back to the whole text spanning the chunk', () => {
    expect(sttSegments({ text: 'Rītdien jāpiezvana.' }, 42)).toEqual([{ start: 0, end: 42, text: 'Rītdien jāpiezvana.', speaker: null }]);
  });

  it('returns nothing for silence', () => {
    expect(sttSegments({ text: '   ' }, 10)).toEqual([]);
    expect(sttSegments({}, 10)).toEqual([]);
  });
});
