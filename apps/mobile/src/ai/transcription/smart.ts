/**
 * Chooses the transcription provider at run time (Product Plan §7):
 *   1. OpenAI key set      → Whisper (dedicated speech API)
 *   2. OpenRouter key set  → audio-capable chat model via OpenRouter (one BYOK key for everything)
 *   3. Unlimited plan      → hosted (our key, metered, via Edge Function)
 *   4. otherwise           → Apple on-device (free; English-centric)
 * Keeps the coordinator agnostic of the provider.
 */
import { getRecapModels, getTranscriptionModel } from '../../lib/prefs';
import { getEntitlements } from '../../purchases/entitlements';
import { getOpenAiKey, getOpenRouterKey } from '../../security/byok-store';
import type { TranscriptionInput, TranscriptionProvider, TranscriptionResult } from '../types';
import { AppleSpeechTranscriber } from './appleSpeech';
import { HostedTranscriber } from './hosted';
import { OpenAiWhisperTranscriber } from './openaiWhisper';
import { OpenRouterAudioTranscriber } from './openrouterAudio';

export class SmartTranscriber implements TranscriptionProvider {
  readonly supportsDiarization = false;
  readonly runsOnDevice = false;

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    let impl: TranscriptionProvider;
    const override = (await getRecapModels(input.recapId)).transcriptionModel;
    if (override && (await getOpenRouterKey())) {
      // Per-recap model experiment (quality tuning) — always through OpenRouter.
      impl = new OpenRouterAudioTranscriber(getOpenRouterKey, async () => override);
    } else if (await getOpenAiKey()) {
      impl = new OpenAiWhisperTranscriber(getOpenAiKey);
    } else if (await getOpenRouterKey()) {
      impl = new OpenRouterAudioTranscriber(getOpenRouterKey, getTranscriptionModel);
    } else if (getEntitlements().unlimitedActive) {
      impl = new HostedTranscriber();
    } else {
      impl = new AppleSpeechTranscriber();
    }
    return impl.transcribe(input);
  }
}
