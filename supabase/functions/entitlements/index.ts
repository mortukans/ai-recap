// GET /entitlements — authoritative entitlement state for the calling (anonymous or signed-in) user.
// Reads via the caller's JWT so RLS applies. Expired Unlimited subscriptions read as inactive even if
// the webhook hasn't fired yet.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('entitlements')
    .select('unlimited_active, unlimited_expires_at, byok_lifetime, updated_at')
    .maybeSingle();
  if (error) return new Response(error.message, { status: 500 });

  const expires = data?.unlimited_expires_at ? new Date(data.unlimited_expires_at).getTime() : null;
  const unlimitedActive = !!data?.unlimited_active && (expires === null || expires > Date.now());

  return Response.json({
    unlimitedActive,
    byokLifetime: !!data?.byok_lifetime,
    unlimitedExpiresAt: data?.unlimited_expires_at ?? null,
    updatedAt: data?.updated_at ?? null,
  });
});
