/**
 * Provider selection. MVP: BYOK OpenRouter (key from secure store). Hosted (Unlimited) is added in M5.
 */
import { getOpenRouterKey } from '../security/byok-store';
import { OpenRouterLLMProvider } from './llm/openrouter';
import type { LLMProvider } from './types';

/** A sensible, cheap, JSON-capable default for recap generation (user-overridable in Settings). */
export const DEFAULT_SUMMARY_MODEL = 'openai/gpt-4o-mini';

export function getByokLLMProvider(): LLMProvider {
  return new OpenRouterLLMProvider({ getKey: getOpenRouterKey });
}
