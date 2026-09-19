/**
 * BYOK transcription through OpenRouter's chat completions API with `input_audio` content parts
 * (OpenRouter has no Whisper-style endpoint). One key covers transcription + recap generation.
 * Default model is Gemini 2.5 Flash — cheap, accepts m4a, and strong on Latvian and LV/EN
 * code-switching. Each recorded chunk (≤ 60 s) is sent base64-encoded and its timestamps are
 * offset onto the recap timeline.
 */
import { AiRecapError } from '@ai-recap/core';
import { File } from 'expo-file-system';

import { chunksRepo } from '../../db';
import { chunkUri } from '../../features/recap/audioUri';
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionResultSegment,
} from '../types';

export const DEFAULT_TRANSCRIPTION_MODEL = 'google/gemini-2.5-flash';

const BASE_URL = 'https://openrouter.ai/api/v1';
const ATTRIBUTION = { 'HTTP-Referer': 'https://airecap.lv', 'X-Title': 'AI Recap' };

const SYSTEM_PROMPT = `You are a precise speech-to-text engine. Transcribe the audio verbatim.
The speech is usually Latvian, English, or a mix; keep each utterance in its original language with correct diacritics.
Respond with ONLY a JSON object, no prose, no markdown fences:
{"language":"<dominant ISO 639-1 code>","segments":[{"start":<seconds from audio start>,"end":<seconds>,"speaker":"<Speaker 1|Speaker 2|...>","text":"<utterance>"}]}
Split segments at natural pauses (roughly one sentence each) and whenever the speaker changes. Label distinct voices consistently within this audio as "Speaker 1", "Speaker 2", ... in order of first appearance; use "Speaker 1" if there is clearly only one voice. If there is no speech, return {"language":null,"segments":[]}.`;

type MessageContent = string | { type?: string; text?: string }[] | undefined;

interface ChatCompletionResponse {
  choices?: { message?: { content?: MessageContent } }[];
  error?: { message?: string };
}

interface ParsedTranscript {
  language: string | null;
  segments: { start: number; end: number; text: string; speaker: string | null }[];
}

/** Lenient JSON extraction — models occasionally wrap output in fences or leading text. */
function parseTranscript(raw: string, chunkDuration: number): ParsedTranscript {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith('{') ? trimmed : (trimmed.match(/\{[\s\S]*\}/)?.[0] ?? '');
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

    const chunks = await chunksRepo.listChunks(input.recapId);
    const segments: TranscriptionResultSegment[] = [];
    const languages = new Set<string>();
    let durationSeconds = 0;

    for (const chunk of chunks) {
      durationSeconds = Math.max(durationSeconds, chunk.startOffset + chunk.duration);
      const data = await new File(chunkUri(input.recapId, chunk.relativePath)).base64();

      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...ATTRIBUTION },
        body: JSON.stringify({
          model,
          temperature: 0,
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
        });
      }

      const json = (await res.json()) as ChatCompletionResponse;
      if (json.error?.message) {
        throw new AiRecapError({ code: 'transcription/failed', message: json.error.message });
      }
      const parsed = parseTranscript(contentToText(json.choices?.[0]?.message?.content), chunk.duration);
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
    }

    return { segments, detectedLanguages: [...languages], durationSeconds };
  }
}
