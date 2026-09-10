/**
 * Hosted transcription provider (default per Product Plan §7 Option C). Uploads chunks to the
 * transient processing bucket and invokes the `/transcription/jobs` Edge Function, which calls the
 * chosen provider (benchmark-selected) and deletes the cloud audio on success.
 *
 * SKELETON: upload + polling implemented in M2 (see AI_RECAP_MVP_TASKS.md M2-1). The provider is
 * chosen by the LV/EN benchmark (M2-2) before this is finalized.
 */
import { AiRecapError } from '@ai-recap/core';
import type { TranscriptionInput, TranscriptionProvider, TranscriptionResult } from '../types';

export class HostedTranscriber implements TranscriptionProvider {
  readonly supportsDiarization = true;
  readonly runsOnDevice = false;

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new AiRecapError({
      code: 'transcription/failed',
      message: 'HostedTranscriber is not implemented yet (MVP task M2-1).',
    });
  }
}
