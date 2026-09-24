/**
 * On-device transcription via Apple's Speech framework (Product Plan §7 Option C).
 * Transcribes each recorded audio chunk (≤ chunk length, within Apple's per-request limits) and
 * places the text on the recap timeline using chunk offsets. No external key or cost.
 *
 * NOTE: Latvian may not be supported by Apple on-device recognition; it falls back to en-US in the
 * native layer. A hosted provider (Speechmatics/Whisper) remains the path for production LV quality.
 */
import { Recorder } from '@ai-recap/recorder';
import { chunksRepo } from '../../db';
import { chunkUri } from '../../features/recap/audioUri';
import { throwIfAborted } from '../http';
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionResultSegment,
} from '../types';

function localeFor(hint: TranscriptionInput['languageHint']): string {
  if (hint === 'en') return 'en-US';
  return 'lv-LV'; // default; native falls back to en-US if unsupported
}

export class AppleSpeechTranscriber implements TranscriptionProvider {
  readonly supportsDiarization = false;
  readonly runsOnDevice = true;

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const chunks = await chunksRepo.listChunks(input.recapId);
    const locale = localeFor(input.languageHint);
    const lang = locale.split('-')[0] ?? 'lv';

    const segments: TranscriptionResultSegment[] = [];
    let durationSeconds = 0;
    for (const chunk of chunks) {
      throwIfAborted(input.signal); // a force-stop takes effect at the next chunk (one native request cannot be cancelled)
      durationSeconds = Math.max(durationSeconds, chunk.startOffset + chunk.duration);
      let text = '';
      try {
        text = await Recorder.transcribeFile(chunkUri(input.recapId, chunk.relativePath), locale);
      } catch {
        text = '';
      }
      if (text.trim().length > 0) {
        segments.push({
          startTime: chunk.startOffset,
          endTime: chunk.startOffset + chunk.duration,
          speakerLabel: null,
          language: lang,
          text: text.trim(),
        });
      }
    }

    return { segments, detectedLanguages: [lang], durationSeconds };
  }
}
