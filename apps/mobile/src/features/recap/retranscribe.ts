/**
 * Model experiments (quality tuning): re-transcribe a recap with a chosen OpenRouter audio model,
 * keeping every transcript version as a `transcript` artifact so outputs can be compared.
 */
import type { GeneratedArtifact, TranscriptSegment } from '@ai-recap/core';
import { AiRecapError } from '@ai-recap/core';

import { DEFAULT_TRANSCRIPTION_MODEL, OpenRouterAudioTranscriber } from '../../ai';
import { artifactsRepo, chunksRepo, recapsRepo, segmentsRepo } from '../../db';
import { newId } from '../../lib/ids';
import { getTranscriptionModel } from '../../lib/prefs';
import { getOpenRouterKey } from '../../security/byok-store';

export interface TranscriptVersion {
  artifact: GeneratedArtifact;
  segments: TranscriptSegment[];
  language: string | null;
}

export function parseTranscriptArtifact(a: GeneratedArtifact): TranscriptVersion {
  try {
    const parsed = JSON.parse(a.content) as { segments?: TranscriptSegment[]; language?: string | null };
    return { artifact: a, segments: parsed.segments ?? [], language: parsed.language ?? null };
  } catch {
    return { artifact: a, segments: [], language: null };
  }
}

export async function listTranscriptVersions(recapId: string): Promise<TranscriptVersion[]> {
  return (await artifactsRepo.listArtifacts(recapId)).filter((a) => a.type === 'transcript').map(parseTranscriptArtifact);
}

async function archive(recapId: string, segments: TranscriptSegment[], model: string, language: string | null): Promise<GeneratedArtifact> {
  const artifact: GeneratedArtifact = {
    id: newId(),
    recapId,
    type: 'transcript',
    model,
    promptVersion: '',
    contextVersion: '',
    content: JSON.stringify({ segments, language }),
    createdAt: Date.now(),
  };
  await artifactsRepo.addArtifact(artifact);
  return artifact;
}

/** Make an archived transcript version the live transcript (used by the recap + chat). */
export async function activateTranscriptVersion(recapId: string, version: TranscriptVersion): Promise<void> {
  const segments = version.segments.map((s) => ({ ...s, id: newId(), recapId }));
  await segmentsRepo.replaceSegments(recapId, segments);
  if (version.language) await recapsRepo.updateRecap(recapId, { detectedLanguages: [version.language] });
}

/**
 * Transcribe again with `model`. The current transcript is archived first (if it isn't already a
 * version), then replaced. Returns the new version.
 */
export async function retranscribe(recapId: string, model: string): Promise<TranscriptVersion> {
  if ((await getOpenRouterKey()) === null) {
    throw new AiRecapError({ code: 'llm/missing-key', message: 'OpenRouter key required for model experiments.' });
  }
  const current = await segmentsRepo.listSegments(recapId);
  const versions = await listTranscriptVersions(recapId);
  if (current.length > 0 && versions.length === 0) {
    const recap = await recapsRepo.getRecap(recapId);
    await archive(recapId, current, (await getTranscriptionModel()) ?? DEFAULT_TRANSCRIPTION_MODEL, recap?.detectedLanguages[0] ?? null);
  }

  const chunks = await chunksRepo.listChunks(recapId);
  const transcriber = new OpenRouterAudioTranscriber(getOpenRouterKey, async () => model);
  const result = await transcriber.transcribe({ recapId, audioUris: chunks.map((ch) => ch.relativePath) });
  const segments: TranscriptSegment[] = result.segments.map((s) => ({
    id: newId(),
    recapId,
    startTime: s.startTime,
    endTime: s.endTime,
    speakerLabel: s.speakerLabel,
    language: s.language,
    text: s.text,
  }));
  await segmentsRepo.replaceSegments(recapId, segments);
  await recapsRepo.updateRecap(recapId, { detectedLanguages: result.detectedLanguages });
  const artifact = await archive(recapId, segments, model, result.detectedLanguages[0] ?? null);
  return { artifact, segments, language: result.detectedLanguages[0] ?? null };
}

/** Short display name for a model id ("google/gemini-2.5-flash" → "gemini-2.5-flash"). */
export function shortModel(id: string): string {
  return id.includes('/') ? id.slice(id.indexOf('/') + 1) : id;
}
