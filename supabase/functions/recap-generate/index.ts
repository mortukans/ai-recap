// POST /recap-generate — hosted LLM completion for Unlimited users (Arch §11, MVP task M3-2).
// Body: LlmRequest from the app { model: 'fast'|'balanced'|'best'|<ignored>, messages, temperature?,
//       maxOutputTokens?, responseJsonSchema? } plus optional recapId for metering.
// Returns LlmResult { text, model, usage }.
import { LLM_TIERS, admin, callOpenRouter, costMicros, json, recordUsage, requireUnlimited, requireUser } from '../_shared/hosted.ts';

interface Body {
  model?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxOutputTokens?: number;
  responseJsonSchema?: unknown;
  recapId?: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const who = await requireUser(req);
  if (who instanceof Response) return who;
  const db = admin();
  const denied = await requireUnlimited(db, who.userId);
  if (denied) return denied;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) return json({ error: 'messages_required' }, 400);

  const model = LLM_TIERS[body.model ?? ''] ?? LLM_TIERS.balanced;
  const payload: Record<string, unknown> = { model, messages: body.messages };
  if (body.temperature !== undefined) payload.temperature = body.temperature;
  if (body.maxOutputTokens !== undefined) payload.max_tokens = body.maxOutputTokens;
  if (body.responseJsonSchema !== undefined) {
    payload.response_format = { type: 'json_schema', json_schema: { name: 'recap', strict: true, schema: body.responseJsonSchema } };
  }

  try {
    const r = await callOpenRouter(payload);
    await recordUsage(db, {
      user_id: who.userId,
      recap_client_id: body.recapId ?? null,
      input_tokens: r.usage?.prompt_tokens ?? 0,
      output_tokens: r.usage?.completion_tokens ?? 0,
      model: r.model,
      provider: 'openrouter-hosted',
      estimated_cost_micros: costMicros(r.usage),
    });
    return json({
      text: r.text,
      model: r.model,
      usage: r.usage ? { inputTokens: r.usage.prompt_tokens ?? 0, outputTokens: r.usage.completion_tokens ?? 0 } : null,
    });
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
});
