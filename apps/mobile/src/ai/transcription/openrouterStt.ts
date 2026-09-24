/**
 * BYOK transcription through OpenRouter's dedicated speech-to-text endpoint
 * (`POST /audio/transcriptions`): Whisper, GPT-4o Transcribe, MAI-Transcribe, Grok STT, Deepgram,
 * Chirp, Voxtral Transcribe, … — models that are not chat models and cannot take our JSON prompt.
 * Each ≤ 60 s chunk is sent base64-encoded; `verbose_json` gives segment timestamps where the
 * provider supports it, otherwise the chunk's text becomes one utterance. Same key as everything else.
 */
import { AiRecapError } from '@ai-recap/core';
import { File } from 'expo-file-system';

import { chunksRepo } from '../../db';
import { chunkUri } from '../../features/recap/audioUri';
import { AUDIO_CHUNK_TIMEOUT_MS, throwIfAborted, timeoutSignal } from '../http';
import type { TranscriptionInput, TranscriptionProvider, TranscriptionResult, TranscriptionResultSegment } from '../types';
import { type SttResponse, normalizeSttLanguage, sttSegments } from './sttParse';

const BASE_URL = 'https://openrouter.ai/api/v1';
const ATTRIBUTION = { 'HTTP-Referer': 'https://airecap.lv', 'X-Title': 'AI Recap' };

export class OpenRouterSttTranscriber implements TranscriptionProvider {
  readonly supportsDiarization = false; // a few providers label speakers; we pass labels through when present
  readonly runsOnDevice = false;

  constructor(
    private readonly getKey: () => Promise<string | null>,
    private readonly model: string,
  ) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const key = await this.getKey();
    if (!key) throw new AiRecapError({ code: 'transcription/failed', message: 'OpenRouter key not set.' });

    const chunks = await chunksRepo.listChunks(input.recapId);
    const segments: TranscriptionResultSegment[] = [];
    const languages = new Set<string>();
    let durationSeconds = 0;
    // Providers that reject verbose_json fall back to plain json for the rest of this recording.
    let verbose = true;

    for (const chunk of chunks) {
      throwIfAborted(input.signal);
      durationSeconds = Math.max(durationSeconds, chunk.startOffset + chunk.duration);
      const data = await new File(chunkUri(input.recapId, chunk.relativePath)).base64();

      let json = await this.request(key, data, input, verbose);
      if (json === 'unsupported-format' && verbose) {
        verbose = false;
        json = await this.request(key, data, input, false);
      }
      if (json === 'unsupported-format') {
        throw new AiRecapError({ code: 'transcription/failed', message: `${this.model} rejected the transcription request format.` });
      }

      const lang = normalizeSttLanguage(json.language);
      if (lang) languages.add(lang);
      for (const s of sttSegments(json, chunk.duration)) {
        segments.push({
          startTime: chunk.startOffset + s.start,
          endTime: chunk.startOffset + s.end,
          speakerLabel: s.speaker,
          language: lang,
          text: s.text,
        });
      }
    }

    return { segments, detectedLanguages: [...languages], durationSeconds };
  }

  private async request(key: string, data: string, input: TranscriptionInput, verbose: boolean): Promise<SttResponse | 'unsupported-format'> {
    const body: Record<string, unknown> = {
      model: this.model,
      input_audio: { data, format: 'm4a' },
      temperature: 0,
    };
    if (verbose) {
      body.response_format = 'verbose_json';
      body.timestamp_granularities = ['segment'];
    }
    // Only pin the language when the user asked for one; LV/EN mixes are better left to detection.
    if (input.languageHint === 'lv' || input.languageHint === 'en') body.language = input.languageHint;

    const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      signal: timeoutSignal(AUDIO_CHUNK_TIMEOUT_MS, input.signal),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...ATTRIBUTION },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      if (verbose && res.status === 400 && /response_format|verbose|timestamp/i.test(detail)) return 'unsupported-format';
      throw new AiRecapError({
        code: 'transcription/failed',
        message: `OpenRouter speech-to-text ${res.status}: ${detail}`.trim(),
        retryable: res.status >= 500 || res.status === 429,
      });
    }
    const json = (await res.json()) as SttResponse;
    if (json.error?.message) throw new AiRecapError({ code: 'transcription/failed', message: json.error.message });
    return json;
  }
}
