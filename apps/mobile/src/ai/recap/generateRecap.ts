/**
 * Recap generation service (MVP task M3-3). Transcript + context → structured RecapDocument, stored as
 * a GeneratedArtifact. Regeneration with a different context yields a new artifact (Product Plan §34).
 */
import {
  AiRecapError,
  type Context,
  type GeneratedArtifact,
  RECAP_DOCUMENT_JSON_SCHEMA,
  type RecapDocument,
  type TranscriptSegment,
  parseRecapDocument,
} from '@ai-recap/core';
import { RECAP_PROMPT_VERSION, buildRecapMessages } from '@ai-recap/prompts';
import { artifactsRepo, usageRepo } from '../../db';
import { newId } from '../../lib/ids';
import type { LLMProvider } from '../types';

export interface GenerateRecapInput {
  recapId: string;
  meta: { title?: string; detectedLanguages: string[]; durationSeconds: number; speakers?: string[] };
  context: Context | null;
  transcript: TranscriptSegment[] | string;
  provider: LLMProvider;
  model: string;
  extraContext?: string;
}

/** Extract a JSON object from model output, tolerating ```json fences or surrounding prose. */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateRecap(
  input: GenerateRecapInput,
): Promise<{ artifact: GeneratedArtifact; doc: RecapDocument }> {
  const messages = buildRecapMessages({
    context: input.context,
    templateInstructions: input.context?.instructions ?? '',
    meta: input.meta,
    transcript: input.transcript,
    extraContext: input.extraContext,
  });

  const result = await input.provider.generate({
    model: input.model,
    messages,
    responseJsonSchema: RECAP_DOCUMENT_JSON_SCHEMA,
    temperature: 0.3,
  });

  const doc = parseRecapDocument(extractJson(result.text));
  if (!doc) {
    throw new AiRecapError({
      code: 'llm/invalid-json',
      message: 'The model did not return a valid recap. Try again or pick a different model.',
      retryable: true,
    });
  }

  const artifact: GeneratedArtifact = {
    id: newId(),
    recapId: input.recapId,
    type: 'summary',
    model: result.model,
    promptVersion: RECAP_PROMPT_VERSION,
    contextVersion: input.context?.id ?? 'none',
    content: JSON.stringify(doc),
    createdAt: Date.now(),
  };
  await artifactsRepo.addArtifact(artifact);
  // Usage accounting (M5-5): tokens + model, never content. Mirrored to the backend by syncUsage().
  await usageRepo
    .addUsage({
      id: newId(),
      recapId: input.recapId,
      recordingSeconds: 0,
      transcriptionSeconds: 0,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      model: result.model,
      provider: input.provider.name,
      estimatedCostMicros: 0,
      occurredAt: Date.now(),
      syncedToBackend: false,
    })
    .catch(() => undefined);
  return { artifact, doc };
}
