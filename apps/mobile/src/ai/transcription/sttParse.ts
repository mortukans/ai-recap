/**
 * Pure helpers for OpenRouter's dedicated speech-to-text endpoint (`/audio/transcriptions`).
 * Kept free of React Native imports so they can be unit-tested.
 */

export interface SttResponse {
  text?: string;
  /** Present with response_format=verbose_json; ISO code or an English name ("english"). */
  language?: string | null;
  duration?: number;
  segments?: { start?: number; end?: number; text?: string; speaker?: string | null }[];
  usage?: { cost?: number; seconds?: number; input_tokens?: number; output_tokens?: number };
  error?: { message?: string; code?: number };
}

export interface SttSegment {
  start: number;
  end: number;
  text: string;
  speaker: string | null;
}

/**
 * Dedicated STT models on OpenRouter are listed only under `/models?output_modalities=transcription`
 * and never carry a chat-style architecture. This is the offline guess for ids we have not seen in
 * that list yet (first launch, list fetch failed).
 */
export function looksLikeSttModel(id: string): boolean {
  return /(^|\/)(whisper|gpt-4o(-mini)?-transcribe|gpt-transcribe|mai-transcribe|chirp|nova-\d|parakeet|nemotron[^/]*asr|qwen3-asr|voxtral[^/]*(transcribe|stt)|grok-stt|universal-\d|transcribe-\d|muse-voice-transcribe)/i.test(id);
}

const LANGUAGE_NAMES: Record<string, string> = {
  english: 'en',
  latvian: 'lv',
  russian: 'ru',
  german: 'de',
  french: 'fr',
  spanish: 'es',
  lithuanian: 'lt',
  estonian: 'et',
  polish: 'pl',
  swedish: 'sv',
  finnish: 'fi',
  norwegian: 'no',
  danish: 'da',
  dutch: 'nl',
  italian: 'it',
  portuguese: 'pt',
  ukrainian: 'uk',
};

/** "english" → "en", "lv-LV" → "lv", "en" → "en"; unknown → null. */
export function normalizeSttLanguage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (LANGUAGE_NAMES[v]) return LANGUAGE_NAMES[v];
  const m = v.match(/^([a-z]{2,3})(?:[-_][a-z]{2,4})?$/);
  return m ? m[1]! : null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

/**
 * Segments for one chunk: the provider's timestamped segments when present, otherwise the whole
 * text as a single utterance spanning the chunk (providers without verbose_json support).
 */
export function sttSegments(json: SttResponse, chunkDuration: number): SttSegment[] {
  const fromProvider = (json.segments ?? [])
    .map((s) => {
      const start = clamp(Number(s.start ?? 0), 0, chunkDuration);
      const end = clamp(Number(s.end ?? chunkDuration), 0, chunkDuration);
      return { start, end: Math.max(end, start), text: (s.text ?? '').trim(), speaker: normalizeSpeaker(s.speaker) };
    })
    .filter((s) => s.text.length > 0);
  if (fromProvider.length > 0) return fromProvider;
  const text = (json.text ?? '').trim();
  return text.length > 0 ? [{ start: 0, end: chunkDuration, text, speaker: null }] : [];
}

function normalizeSpeaker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/(\d+)/);
  return m ? `Speaker ${m[1]}` : raw.trim() || null;
}
