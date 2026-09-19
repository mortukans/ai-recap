// Shared helpers for the hosted-AI Edge Functions (Unlimited plan, Arch §11 / §16).
// - resolve the caller from their Supabase JWT
// - require an active `unlimited` entitlement (server truth, RLS-independent via service role)
// - call OpenRouter with OUR key (never shipped to the client)
// - meter usage into `usage_events`
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ATTRIBUTION = { 'HTTP-Referer': 'https://airecap.lv', 'X-Title': 'AI Recap (hosted)' };

/** Hosted tiers hide concrete models from the client; change here without an app release. */
export const LLM_TIERS: Record<string, string> = {
  fast: 'openai/gpt-4o-mini',
  balanced: 'openai/gpt-4o-mini',
  best: 'anthropic/claude-sonnet-4',
};
export const TRANSCRIPTION_MODEL = 'google/gemini-2.5-flash';

export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** Returns the caller's user id, or a 401 Response. */
export async function requireUser(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.getUser();
  if (error || !data.user) return new Response('Unauthorized', { status: 401 });
  return { userId: data.user.id };
}

/** Hosted AI is an Unlimited feature; refuse otherwise (402 so the client can show the paywall). */
export async function requireUnlimited(db: SupabaseClient, userId: string): Promise<Response | null> {
  const { data } = await db
    .from('entitlements')
    .select('unlimited_active, unlimited_expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  const exp = data?.unlimited_expires_at ? new Date(data.unlimited_expires_at).getTime() : null;
  const active = !!data?.unlimited_active && (exp === null || exp > Date.now());
  return active ? null : json({ error: 'unlimited_required' }, 402);
}

/** Fair-use guards for hosted AI (Arch §18): generous for real meetings, hostile to abuse. */
export const FAIR_USE = {
  /** Transcription minutes per user per rolling 24 h (Unlimited = 60-min recordings; ~10 meetings/day). */
  transcriptionMinutesPerDay: 600,
  /** Hosted LLM calls per user per rolling 24 h (recaps + chat). */
  llmCallsPerDay: 400,
};

/**
 * Returns a 429 Response when the caller exceeded the rolling-24h fair-use budget, else null.
 * Reads our own usage_events (service role); never blocks on metering errors.
 */
export async function requireFairUse(
  db: SupabaseClient,
  userId: string,
  kind: 'transcription' | 'llm',
): Promise<Response | null> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await db
      .from('usage_events')
      .select('transcription_seconds, input_tokens, output_tokens')
      .eq('user_id', userId)
      .eq('provider', 'openrouter-hosted')
      .gte('occurred_at', since);
    const rows = data ?? [];
    if (kind === 'transcription') {
      const minutes = rows.reduce((s, r) => s + (r.transcription_seconds ?? 0), 0) / 60;
      if (minutes >= FAIR_USE.transcriptionMinutesPerDay) return json({ error: 'fair_use_exceeded', kind }, 429);
    } else {
      const calls = rows.filter((r) => (r.input_tokens ?? 0) + (r.output_tokens ?? 0) > 0).length;
      if (calls >= FAIR_USE.llmCallsPerDay) return json({ error: 'fair_use_exceeded', kind }, 429);
    }
    return null;
  } catch (_) {
    return null;
  }
}

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  /** USD credits charged for this call (OpenRouter returns it when usage.include = true). */
  cost?: number;
}

/** Micro-dollars from OpenRouter's cost field (0 when unknown). */
export function costMicros(u: OpenRouterUsage | null): number {
  return u?.cost ? Math.round(u.cost * 1_000_000) : 0;
}

export async function callOpenRouter(body: Record<string, unknown>): Promise<{
  text: string;
  model: string;
  usage: OpenRouterUsage | null;
}> {
  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) throw new Error('OPENROUTER_API_KEY secret is not set');
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json', ...ATTRIBUTION },
    body: JSON.stringify({ ...body, usage: { include: true } }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`OpenRouter ${res.status}: ${detail}`);
  }
  const j = (await res.json()) as {
    model?: string;
    usage?: OpenRouterUsage;
    choices?: { message?: { content?: string | { text?: string }[] } }[];
  };
  const content = j.choices?.[0]?.message?.content;
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((p) => p.text ?? '').join('') : '';
  return { text, model: j.model ?? String(body.model), usage: j.usage ?? null };
}

/** Fire-and-forget metering; never fails the request. */
export async function recordUsage(
  db: SupabaseClient,
  row: {
    user_id: string;
    recap_client_id?: string | null;
    transcription_seconds?: number;
    input_tokens?: number;
    output_tokens?: number;
    model: string;
    provider: string;
    estimated_cost_micros?: number;
  },
): Promise<void> {
  try {
    await db.from('usage_events').insert({
      user_id: row.user_id,
      recap_client_id: row.recap_client_id ?? null,
      transcription_seconds: row.transcription_seconds ?? 0,
      input_tokens: row.input_tokens ?? 0,
      output_tokens: row.output_tokens ?? 0,
      model: row.model,
      provider: row.provider,
      estimated_cost_micros: row.estimated_cost_micros ?? 0,
    });
  } catch (_) {
    /* metering must never break the product */
  }
}
