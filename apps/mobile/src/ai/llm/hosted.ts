/**
 * Hosted LLM provider (Unlimited plan). Routes through our Supabase Edge Function so the provider key
 * stays server-side and usage is metered (AI_RECAP_TECHNICAL_ARCHITECTURE.md §11). Model is chosen
 * server-side from a Fast/Balanced/Best tier; the app does not expose raw model ids here.
 *
 * SKELETON: request/response wiring is finalized in M3 alongside the Edge Function.
 */
import { AiRecapError } from '@ai-recap/core';
import { supabase } from '../../api/supabase';
import type { LLMProvider, LlmModel, LlmRequest, LlmResult, LlmStreamChunk } from '../types';

export class HostedLLMProvider implements LLMProvider {
  readonly name = 'hosted';

  async generate(req: LlmRequest): Promise<LlmResult> {
    const { data, error } = await supabase.functions.invoke<LlmResult>('recap-generate', { body: req });
    if (error || !data) {
      throw new AiRecapError({
        code: 'llm/failed',
        message: `Hosted generation failed: ${error?.message ?? 'no data'}`,
        retryable: true,
      });
    }
    return data;
  }

  async *stream(req: LlmRequest): AsyncIterable<LlmStreamChunk> {
    const result = await this.generate(req);
    yield { delta: result.text };
  }

  async availableModels(): Promise<LlmModel[]> {
    // Hosted plan hides concrete models behind tiers.
    return [
      { id: 'fast', name: 'Fast' },
      { id: 'balanced', name: 'Balanced' },
      { id: 'best', name: 'Best' },
    ];
  }
}
