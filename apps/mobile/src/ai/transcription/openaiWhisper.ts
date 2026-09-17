/**
 * BYOK transcription via OpenAI's audio API (whisper-1 / gpt-4o-transcribe). Handles Latvian and
 * LV/EN code-switching well. The audio file is uploaded directly from the device with the user's key.
 */
import { AiRecapError } from '@ai-recap/core';
import { chunksRepo } from '../../db';
import { chunkUri } from '../../features/recap/audioUri';
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionResultSegment,
} from '../types';

interface WhisperVerboseJson {
  text?: string;
  language?: string;
  segments?: { start?: number; end?: number; text?: string }[];
}

export class OpenAiWhisperTranscriber implements TranscriptionProvider {
  readonly supportsDiarization = false;
  readonly runsOnDevice = false;

  constructor(
    private readonly getKey: () => Promise<string | null>,
    private readonly model = 'whisper-1',
  ) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const key = await this.getKey();
    if (!key) {
      throw new AiRecapError({ code: 'transcription/failed', message: 'OpenAI key not set.' });
    }

    const chunks = await chunksRepo.listChunks(input.recapId);
    const segments: TranscriptionResultSegment[] = [];
    const languages = new Set<string>();
    let durationSeconds = 0;

    for (const chunk of chunks) {
      durationSeconds = Math.max(durationSeconds, chunk.startOffset + chunk.duration);

      const form = new FormData();
      form.append('file', {
        uri: chunkUri(input.recapId, chunk.relativePath),
        name: `chunk_${chunk.index}.m4a`,
        type: 'audio/m4a',
        // React Native's FormData file object isn't typed as Blob.
      } as unknown as Blob);
      form.append('model', this.model);
      form.append('response_format', 'verbose_json');

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 200);
        throw new AiRecapError({
          code: 'transcription/failed',
          message: `OpenAI transcription ${res.status}: ${detail}`.trim(),
          retryable: res.status >= 500 || res.status === 429,
        });
      }

      const json = (await res.json()) as WhisperVerboseJson;
      const lang = json.language ?? null;
      if (lang) languages.add(lang);

      const segs = json.segments ?? [];
      if (segs.length > 0) {
        for (const s of segs) {
          const text = (s.text ?? '').trim();
          if (text.length === 0) continue;
          segments.push({
            startTime: chunk.startOffset + (s.start ?? 0),
            endTime: chunk.startOffset + (s.end ?? chunk.duration),
            speakerLabel: null,
            language: lang,
            text,
          });
        }
      } else if (json.text && json.text.trim().length > 0) {
        segments.push({
          startTime: chunk.startOffset,
          endTime: chunk.startOffset + chunk.duration,
          speakerLabel: null,
          language: lang,
          text: json.text.trim(),
        });
      }
    }

    return { segments, detectedLanguages: [...languages], durationSeconds };
  }
}
