/**
 * BYOK OpenRouter LLM provider (AI_RECAP_TECHNICAL_ARCHITECTURE.md §11).
 * Calls OpenRouter DIRECTLY from the device with the user's key — the key never touches our backend.
 * Model list is fetched dynamically (never hard-coded). See Product Plan §8.
 */
import { AiRecapError } from '@ai-recap/core';
import type { LLMProvider, LlmModel, LlmRequest, LlmResult, LlmStreamChunk } from '../types';

const BASE_URL = 'https://openrouter.ai/api/v1';

/** Attribution headers OpenRouter uses for its rankings (Product Plan §8). */
const ATTRIBUTION = {
  'HTTP-Referer': 'https://airecap.lv',
  'X-Title': 'AI Recap',
};

export interface OpenRouterConfig {
  /** Resolves the user's key from secure storage; null when not configured. */
  getKey: () => Promise<string | null>;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface ModelsResponse {
  data?: { id: string; name?: string; context_length?: number }[];
}

export class OpenRouterLLMProvider implements LLMProvider {
  readonly name = 'openrouter';

  constructor(private readonly config: OpenRouterConfig) {}

  private async headers(): Promise<Record<string, string>> {
    const key = await this.config.getKey();
    if (!key) {
      throw new AiRecapError({ code: 'llm/missing-key', message: 'OpenRouter API key is not set.' });
    }
    return {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...ATTRIBUTION,
    };
  }

  private body(req: LlmRequest, stream: boolean): string {
    const payload: Record<string, unknown> = {
      model: req.model,
      messages: req.messages,
      stream,
    };
    if (req.temperature !== undefined) payload.temperature = req.temperature;
    if (req.maxOutputTokens !== undefined) payload.max_tokens = req.maxOutputTokens;
    if (req.responseJsonSchema !== undefined) {
      payload.response_format = {
        type: 'json_schema',
        json_schema: { name: 'recap', strict: true, schema: req.responseJsonSchema },
      };
    }
    return JSON.stringify(payload);
  }

  async availableModels(): Promise<LlmModel[]> {
    const res = await fetch(`${BASE_URL}/models`, { headers: await this.headers() });
    if (!res.ok) {
      throw new AiRecapError({ code: 'llm/failed', message: `OpenRouter /models failed: ${res.status}` });
    }
    const json = (await res.json()) as ModelsResponse;
    return (json.data ?? []).map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      contextLength: m.context_length,
    }));
  }

  async generate(req: LlmRequest): Promise<LlmResult> {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: await this.headers(),
      body: this.body(req, false),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new AiRecapError({
        code: 'llm/failed',
        message: `OpenRouter completion failed: ${res.status} ${detail}`.trim(),
        retryable: res.status >= 500 || res.status === 429,
      });
    }
    const json = (await res.json()) as ChatCompletionResponse;
    const text = json.choices?.at(0)?.message?.content ?? '';
    return {
      text,
      model: json.model ?? req.model,
      usage: json.usage
        ? {
            inputTokens: json.usage.prompt_tokens ?? 0,
            outputTokens: json.usage.completion_tokens ?? 0,
          }
        : null,
    };
  }

  /**
   * Streaming default: falls back to a single non-streamed chunk. Wire true SSE streaming via
   * `expo/fetch` (which supports ReadableStream) in M4 chat polish — RN's core fetch does not.
   */
  async *stream(req: LlmRequest): AsyncIterable<LlmStreamChunk> {
    const result = await this.generate(req);
    yield { delta: result.text };
  }

  /** Validate a key for the guided BYOK setup "Test connection" (Product Plan §36). */
  async testConnection(): Promise<boolean> {
    const models = await this.availableModels();
    return models.length > 0;
  }
}
