// POST /quota-consume — server-side Free-plan daily cap (anti-tamper, MVP task M5-3).
// Body: { maxPerDay: number | null }. Unlimited users (server entitlement) always pass.
// Returns { allowed: boolean, startedToday: number }.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  let maxPerDay: number | null = null;
  try {
    const body = (await req.json()) as { maxPerDay?: number | null };
    maxPerDay = typeof body.maxPerDay === 'number' ? body.maxPerDay : null;
  } catch {
    /* default: no cap requested by client — server entitlement decides below */
  }

  // Server truth beats the client's claim: an active Unlimited entitlement lifts the cap.
  const { data: ent } = await supabase.from('entitlements').select('unlimited_active, unlimited_expires_at').maybeSingle();
  const exp = ent?.unlimited_expires_at ? new Date(ent.unlimited_expires_at).getTime() : null;
  if (ent?.unlimited_active && (exp === null || exp > Date.now())) maxPerDay = null;

  const { data, error } = await supabase.rpc('consume_daily_quota', { max_per_day: maxPerDay });
  if (error) return new Response(error.message, { status: 500 });

  const result = data as number;
  return Response.json({ allowed: result >= 0, startedToday: result >= 0 ? result : maxPerDay ?? 0 });
});
