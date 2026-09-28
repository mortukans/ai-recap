/**
 * BYOK transcription through OpenRouter's chat completions API with `input_audio` content parts.
 * One key covers transcription + recap generation. Default model is Gemini 2.5 Flash Lite — cheap,
 * accepts m4a, and good on Latvian and LV/EN code-switching. Dedicated speech-to-text models are
 * routed to `OpenRouterSttTranscriber` (see `isSttModel`). Each recorded chunk (≤ 60 s) is sent base64-encoded and its timestamps are
 * offset onto the recap timeline.
 */
import { AiRecapError } from '@ai-recap/core';
import { File } from 'expo-file-system';

import { chunksRepo } from '../../db';
import { AUDIO_CHUNK_TIMEOUT_MS, throwIfAborted, timeoutSignal } from '../http';
import { chunkUri } from '../../features/recap/audioUri';
import { isSttModel } from '../llm/openrouter';
import { OpenRouterSttTranscriber } from './openrouterStt';
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionResultSegment,
} from '../types';

export const DEFAULT_TRANSCRIPTION_MODEL = 'google/gemini-2.5-flash-lite';

const BASE_URL = 'https://openrouter.ai/api/v1';
const ATTRIBUTION = { 'HTTP-Referer': 'https://airecap.lv', 'X-Title': 'AI Recap' };

/** Attempts per chunk before it is skipped. Kept small so one bad chunk can't balloon a long recording. */
export const CHUNK_ATTEMPTS = 3;

/** Marker on an error's `cause` meaning "stop the whole transcription" (auth failure). */
const FATAL = Symbol('fatal');
function isFatal(e: unknown): boolean {
  return e instanceof Error && (e as { cause?: unknown }).cause === FATAL;
}

/** Delay that rejects early if the user aborts, so a stop is instant. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('aborted'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, { once: true });
  });
}

const SYSTEM_PROMPT = `You are a precise speech-to-text engine. Transcribe the audio verbatim.
The speech is usually Latvian, English, or a mix; keep each utterance in its original language with correct diacritics.
Respond with ONLY a JSON object, no prose, no markdown fences:
{"language":"<dominant ISO 639-1 code>","segments":[{"start":<seconds from audio start>,"end":<seconds>,"speaker":"<Speaker 1|Speaker 2|...>","text":"<utterance>"}]}
Split segments at natural pauses (roughly one sentence each) and whenever the speaker changes. Label distinct voices consistently within this audio as "Speaker 1", "Speaker 2", ... in order of first appearance; use "Speaker 1" if there is clearly only one voice. If there is no speech, return {"language":null,"segments":[]}.`;

type MessageContent = string | { type?: string; text?: string }[] | undefined;

interface ChatCompletionResponse {
  choices?: { message?: { content?: MessageContent }; finish_reason?: string | null }[];
  error?: { message?: string };
}

interface ParsedTranscript {
  language: string | null;
  segments: { start: number; end: number; text: string; speaker: string | null }[];
}

/**
 * Lenient JSON extraction — models occasionally wrap output in fences or leading text.
 * Returns null when the reply clearly started as our JSON but is not parseable: that is a reply cut
 * off mid-way (token limit, dropped connection), and must be retried, never stored as transcript text.
 */
export function parseTranscript(raw: string, chunkDuration: number): ParsedTranscript | null {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith('{') ? trimmed : (trimmed.match(/\{[\s\S]*\}/)?.[0] ?? '');
  const looksLikeOurJson = /^\s*(```(?:json)?\s*)?\{\s*"(language|segments)"/.test(trimmed);
  try {
    const json = JSON.parse(jsonText) as {
      language?: string | null;
      segments?: { start?: number; end?: number; text?: string; speaker?: string | null }[];
    };
    const segments = (json.segments ?? [])
      .map((s) => ({
        start: clamp(Number(s.start ?? 0), 0, chunkDuration),
        end: clamp(Number(s.end ?? chunkDuration), 0, chunkDuration),
        text: (s.text ?? '').trim(),
        speaker: normalizeSpeaker(s.speaker),
      }))
      .filter((s) => s.text.length > 0);
    return { language: json.language ?? null, segments };
  } catch {
    if (looksLikeOurJson) return null; // truncated JSON → caller retries
    // Not JSON at all: treat the whole reply as one utterance spanning the chunk.
    return trimmed.length > 0
      ? { language: null, segments: [{ start: 0, end: chunkDuration, text: trimmed, speaker: null }] }
      : { language: null, segments: [] };
  }
}

/** Normalize model speaker labels to 'Speaker N' (rough per-chunk diarization, MVP task M2-5). */
function normalizeSpeaker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/(\d+)/);
  return m ? `Speaker ${m[1]}` : raw.trim() || null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

function contentToText(content: MessageContent): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => p.text ?? '').join('');
  return '';
}

export class OpenRouterAudioTranscriber implements TranscriptionProvider {
  readonly supportsDiarization = true; // rough, per chunk (labels may not persist across chunks)
  readonly runsOnDevice = false;

  constructor(
    private readonly getKey: () => Promise<string | null>,
    private readonly getModel: () => Promise<string | null> = async () => null,
  ) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const key = await this.getKey();
    if (!key) {
      throw new AiRecapError({ code: 'transcription/failed', message: 'OpenRouter key not set.' });
    }
    const model = (await this.getModel()) || DEFAULT_TRANSCRIPTION_MODEL;
    // Dedicated speech-to-text models (Whisper, MAI-Transcribe, Grok STT, …) use OpenRouter's
    // /audio/transcriptions endpoint; only audio-capable chat models take the JSON prompt below.
    if (isSttModel(model)) return new OpenRouterSttTranscriber(this.getKey, model).transcribe(input);

    const chunks = await chunksRepo.listChunks(input.recapId);
    const segments: TranscriptionResultSegment[] = [];
    const languages = new Set<string>();
    let durationSeconds = 0;
    let failedChunks = 0;
    let failedSeconds = 0;

    for (const chunk of chunks) {
      throwIfAborted(input.signal);
      durationSeconds = Math.max(durationSeconds, chunk.startOffset + chunk.duration);

      let parsed: ParsedTranscript | null = null;
      try {
        // Per-chunk retries live here; a chunk that still fails is SKIPPED, never fatal to the recap.
        parsed = await this.transcribeChunk(chunk, key, model, input);
      } catch (e) {
        if (input.signal?.aborted) throw e; // the user stopped — propagate
        if (isFatal(e)) throw e; // bad key / auth — no point trying the remaining chunks
        failedChunks += 1;
        failedSeconds += chunk.duration;
        console.warn(`[transcription] skipped chunk ${chunk.index}: ${e instanceof Error ? e.message : String(e)}`);
        input.onProgress?.(); // a handled skip is still progress
        continue;
      }

      if (parsed.language) languages.add(parsed.language.toLowerCase());
      for (const s of parsed.segments) {
        segments.push({
          startTime: chunk.startOffset + s.start,
          endTime: chunk.startOffset + Math.max(s.end, s.start),
          speakerLabel: s.speaker,
          language: parsed.language,
          text: s.text,
        });
      }
      input.onProgress?.(); // steady progress keeps the coordinator's stall watchdog from firing
    }

    return { segments, detectedLanguages: [...languages], durationSeconds, failedChunks, failedSeconds };
  }

  /** One chunk with a couple of quick retries. Throws a fatal error for auth issues; otherwise a
   *  retryable error the caller skips after these attempts are exhausted. */
  private async transcribeChunk(
    chunk: { index: number; relativePath: string; startOffset: number; duration: number },
    key: string,
    model: string,
    input: TranscriptionInput,
  ): Promise<ParsedTranscript> {
    const data = await new File(chunkUri(input.recapId, chunk.relativePath)).base64();
    let last: unknown;
    for (let attempt = 0; attempt < CHUNK_ATTEMPTS; attempt++) {
      throwIfAborted(input.signal);
      try {
        return await this.requestChunk(chunk, data, key, model, input);
      } catch (e) {
        if (input.signal?.aborted || isFatal(e)) throw e;
        last = e;
        if (attempt < CHUNK_ATTEMPTS - 1) await delay(2000, input.signal);
      }
    }
    throw last instanceof Error ? last : new Error('chunk transcription failed');
  }

  private async requestChunk(
    chunk: { index: number; duration: number },
    data: string,
    key: string,
    model: string,
    input: TranscriptionInput,
  ): Promise<ParsedTranscript> {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: timeoutSignal(AUDIO_CHUNK_TIMEOUT_MS, input.signal),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...ATTRIBUTION },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 16_000, // a 60 s chunk is a few hundred tokens of JSON; this only guards against runaway output
        reasoning: { effort: 'low' }, // thinking models: keep the budget for the transcript, not deliberation
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Transcribe this ${Math.round(chunk.duration)} second recording.` },
              { type: 'input_audio', input_audio: { data, format: 'm4a' } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 200);
      throw new AiRecapError({
        code: 'transcription/failed',
        message: `OpenRouter transcription ${res.status}: ${detail}`.trim(),
        retryable: res.status >= 500 || res.status === 429,
        // 401/403 are auth problems (bad/expired key) — fatal, so we stop rather than burn every chunk.
        cause: res.status === 401 || res.status === 403 ? FATAL : undefined,
      });
    }

    const json = (await res.json()) as ChatCompletionResponse;
    if (json.error?.message) throw new AiRecapError({ code: 'transcription/failed', message: json.error.message });
    const choice = json.choices?.[0];
    const text = contentToText(choice?.message?.content);
    if (choice?.finish_reason === 'length') {
      throw new AiRecapError({ code: 'transcription/failed', message: `Transcription reply for chunk ${chunk.index} was cut off by the token limit (${model}).`, retryable: true });
    }
    if (text.trim().length === 0) {
      throw new AiRecapError({ code: 'transcription/failed', message: `OpenRouter returned an empty reply for chunk ${chunk.index} (${model}).`, retryable: true });
    }
    const parsed = parseTranscript(text, chunk.duration);
    if (!parsed) {
      throw new AiRecapError({ code: 'transcription/failed', message: `Transcription reply for chunk ${chunk.index} was incomplete (${model}).`, retryable: true });
    }
    return parsed;
  }
}
