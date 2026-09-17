/**
 * Chooses the transcription provider at run time: OpenAI Whisper if the user set an OpenAI key
 * (best LV/EN quality), otherwise Apple on-device (free, no key). Keeps the coordinator agnostic.
 */
import { getOpenAiKey } from '../../security/byok-store';
import type { TranscriptionInput, TranscriptionProvider, TranscriptionResult } from '../types';
import { AppleSpeechTranscriber } from './appleSpeech';
import { OpenAiWhisperTranscriber } from './openaiWhisper';

export class SmartTranscriber implements TranscriptionProvider {
  readonly supportsDiarization = false;
  readonly runsOnDevice = false;

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const key = await getOpenAiKey();
    const impl: TranscriptionProvider = key
      ? new OpenAiWhisperTranscriber(getOpenAiKey)
      : new AppleSpeechTranscriber();
    return impl.transcribe(input);
  }
}
