/**
 * Provider selection (Arch §11). Two ways to get an LLM:
 *   • BYOK — the user's OpenRouter key, called directly from the device (Free/BYOK plans)
 *   • Hosted — our Edge Function with our key, metered (Unlimited plan)
 * A user with both gets BYOK (their key, their model choice); Unlimited without a key gets hosted.
 */
import { getEntitlements } from '../purchases/entitlements';
import { getOpenRouterKey } from '../security/byok-store';
import { HostedLLMProvider } from './llm/hosted';
import { OpenRouterLLMProvider } from './llm/openrouter';
import type { LLMProvider } from './types';

/** A sensible, cheap, JSON-capable default for recap generation (user-overridable in Settings). */
export const DEFAULT_SUMMARY_MODEL = 'openai/gpt-4o-mini';
/** Hosted tier used when the user's model preference is a BYOK model id. */
export const HOSTED_DEFAULT_TIER = 'balanced';

export function getByokLLMProvider(): LLMProvider {
  return new OpenRouterLLMProvider({ getKey: getOpenRouterKey });
}

export function getHostedLLMProvider(): LLMProvider {
  return new HostedLLMProvider();
}

export type LlmRoute = { provider: LLMProvider; kind: 'byok' | 'hosted'; model: string } | null;

/**
 * Pick the LLM route for this user, or null when nothing can summarize yet (no key, not Unlimited).
 * `preferredModel` is the Settings choice; hosted routes map non-tier ids to the default tier.
 */
export async function resolveLLMRoute(preferredModel: string): Promise<LlmRoute> {
  if ((await getOpenRouterKey()) !== null) {
    return { provider: getByokLLMProvider(), kind: 'byok', model: preferredModel };
  }
  if (getEntitlements().unlimitedActive) {
    const tier = ['fast', 'balanced', 'best'].includes(preferredModel) ? preferredModel : HOSTED_DEFAULT_TIER;
    return { provider: getHostedLLMProvider(), kind: 'hosted', model: tier };
  }
  return null;
}
