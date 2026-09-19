/**
 * Hosted transcription (Unlimited plan, MVP task M2-1). Each recorded chunk is sent base64-encoded to
 * the `transcribe` Edge Function, which calls the provider with OUR key and meters usage; nothing is
 * stored server-side. Segment times are offset onto the recap timeline here.
 */
import { AiRecapError } from '@ai-recap/core';
import { File } from 'expo-file-system';

import { supabase } from '../../api/supabase';
import { chunksRepo } from '../../db';
import { chunkUri } from '../../features/recap/audioUri';
import type { TranscriptionInput, TranscriptionProvider, TranscriptionResult, TranscriptionResultSegment } from '../types';

interface TranscribeResponse {
  language: string | null;
  segments: { start: number; end: number; text: string; speaker?: string | null }[];
  error?: string;
}

export class HostedTranscriber implements TranscriptionProvider {
  readonly supportsDiarization = true; // rough, per chunk
  readonly runsOnDevice = false;

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const chunks = await chunksRepo.listChunks(input.recapId);
    const segments: TranscriptionResultSegment[] = [];
    const languages = new Set<string>();
    let durationSeconds = 0;

    for (const chunk of chunks) {
      durationSeconds = Math.max(durationSeconds, chunk.startOffset + chunk.duration);
      const audioBase64 = await new File(chunkUri(input.recapId, chunk.relativePath)).base64();

      const { data, error } = await supabase.functions.invoke<TranscribeResponse>('transcribe', {
        body: {
          audioBase64,
          format: 'm4a',
          durationSeconds: chunk.duration,
          recapId: input.recapId,
          languageHint: input.languageHint ?? 'auto',
        },
      });

      if (error || !data || data.error) {
        const status = (error as { context?: { status?: number } } | null)?.context?.status;
        throw new AiRecapError({
          code: status === 402 ? 'llm/missing-key' : 'transcription/failed',
          message:
            status === 402
              ? 'Hosted transcription requires the Unlimited plan.'
              : `Hosted transcription failed: ${data?.error ?? error?.message ?? 'no data'}`,
          retryable: status === undefined || status >= 500,
        });
      }

      if (data.language) languages.add(data.language.toLowerCase());
      for (const s of data.segments) {
        segments.push({
          startTime: chunk.startOffset + Math.max(0, s.start),
          endTime: chunk.startOffset + Math.max(s.end, s.start),
          speakerLabel: s.speaker ?? null,
          language: data.language,
          text: s.text,
        });
      }
    }

    return { segments, detectedLanguages: [...languages], durationSeconds };
  }
}
