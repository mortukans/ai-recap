/**
 * Chooses the transcription provider at run time (Product Plan §7):
 *   1. OpenRouter key set  → audio-capable chat / STT model via OpenRouter (one BYOK key for everything;
 *                            Whisper and other dedicated STT models are selectable through OpenRouter)
 *   2. Unlimited plan      → hosted (our key, metered, via Edge Function)
 *   3. otherwise           → Apple on-device (free; English-centric)
 * Keeps the coordinator agnostic of the provider. (BYOK audio only ever goes to OpenRouter — the direct
 * OpenAI path was removed so the data flow matches the privacy policy.)
 */
import { getRecapModels, getTranscriptionModel } from '../../lib/prefs';
import { getEntitlements } from '../../purchases/entitlements';
import { getOpenRouterKey } from '../../security/byok-store';
import type { TranscriptionInput, TranscriptionProvider, TranscriptionResult } from '../types';
import { AppleSpeechTranscriber } from './appleSpeech';
import { HostedTranscriber } from './hosted';
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
    } else if (await getOpenRouterKey()) {
      impl = new OpenRouterAudioTranscriber(getOpenRouterKey, getTranscriptionModel);
    } else if (getEntitlements().unlimitedActive) {
      impl = new HostedTranscriber();
    } else {
      impl = new AppleSpeechTranscriber();
    }
    // Carry the concrete provider's on-device flag so usage accounting can distinguish free on-device
    // transcription from metered network providers (this wrapper's own runsOnDevice is always false).
    const result = await impl.transcribe(input);
    return { ...result, runsOnDevice: impl.runsOnDevice };
  }
}
