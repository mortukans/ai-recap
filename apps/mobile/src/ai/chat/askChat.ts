/**
 * Ask-AI chat over one recap (MVP task M4-3). Grounds answers in the transcript + context and
 * surfaces [mm:ss] citations. BYOK by default (OpenRouter); hosted path arrives in M5.
 */
import type { Context, TranscriptSegment } from '@ai-recap/core';
import { buildChatMessages } from '@ai-recap/prompts';
import { extractTimestampCitations } from '../../lib/citations';
import type { LLMProvider, LlmMessage } from '../types';

export interface AskChatInput {
  context: Context | null;
  meta: { title?: string; detectedLanguages: string[]; durationSeconds: number; speakers?: string[] };
  transcript: TranscriptSegment[] | string;
  history: LlmMessage[];
  question: string;
  provider: LLMProvider;
  model: string;
}

export async function askChat(input: AskChatInput): Promise<{ answer: string; citations: number[] }> {
  const messages = buildChatMessages({
    context: input.context,
    meta: input.meta,
    transcript: input.transcript,
    history: input.history,
    question: input.question,
  });

  const result = await input.provider.generate({
    model: input.model,
    messages,
    temperature: 0.3,
  });

  return { answer: result.text, citations: extractTimestampCitations(result.text) };
}
