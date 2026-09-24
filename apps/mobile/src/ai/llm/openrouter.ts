/**
 * BYOK OpenRouter LLM provider (AI_RECAP_TECHNICAL_ARCHITECTURE.md §11).
 * Calls OpenRouter DIRECTLY from the device with the user's key — the key never touches our backend.
 * Model list is fetched dynamically (never hard-coded). See Product Plan §8.
 */
import { AiRecapError } from '@ai-recap/core';
import { LLM_TIMEOUT_MS, MODELS_TIMEOUT_MS, timeoutSignal } from '../http';
import { looksLikeSttModel } from '../transcription/sttParse';
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
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
}

interface ModelsResponse {
  data?: {
    id: string;
    name?: string;
    context_length?: number;
    architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  }[];
}

/** Ids seen in OpenRouter's speech-to-text listing this session (refreshed by availableModels). */
const sttIds = new Set<string>();

/** True when `id` should go through /audio/transcriptions rather than chat completions. */
export function isSttModel(id: string): boolean {
  return sttIds.has(id) || looksLikeSttModel(id);
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
      usage: { include: true }, // OpenRouter returns cost per call → usage accounting
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
    const headers = await this.headers();
    const res = await fetch(`${BASE_URL}/models`, { headers, signal: timeoutSignal(MODELS_TIMEOUT_MS) });
    if (!res.ok) {
      throw new AiRecapError({ code: 'llm/failed', message: `OpenRouter /models failed: ${res.status}` });
    }
    const json = (await res.json()) as ModelsResponse;
    const chat: LlmModel[] = (json.data ?? []).map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      contextLength: m.context_length,
      inputModalities: m.architecture?.input_modalities,
      kind: 'chat' as const,
    }));
    // Dedicated speech-to-text models live in a separate listing (Whisper, MAI-Transcribe, Grok STT, …).
    // Optional: if it fails the chat list still works.
    const stt: LlmModel[] = await fetch(`${BASE_URL}/models?output_modalities=transcription`, { headers, signal: timeoutSignal(MODELS_TIMEOUT_MS) })
      .then(async (r) => (r.ok ? ((await r.json()) as ModelsResponse) : { data: [] }))
      .then((j) =>
        (j.data ?? []).map((m) => ({
          id: m.id,
          name: `${m.name ?? m.id} · STT`,
          inputModalities: ['audio'],
          kind: 'stt' as const,
        })),
      )
      .catch(() => []);
    for (const m of stt) sttIds.add(m.id);
    const seen = new Set(chat.map((m) => m.id));
    return [...chat, ...stt.filter((m) => !seen.has(m.id))];
  }

  async generate(req: LlmRequest): Promise<LlmResult> {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: timeoutSignal(LLM_TIMEOUT_MS, req.signal),
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
            costMicros: json.usage.cost ? Math.round(json.usage.cost * 1_000_000) : undefined,
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
