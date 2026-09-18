// RevenueCat → entitlements (AI_RECAP_TECHNICAL_ARCHITECTURE.md §18, MVP task M5-2).
// Server truth for purchases: the client's RevenueCat state is convenience; hosted features trust this table.
//
// Configure in RevenueCat → Integrations → Webhooks:
//   URL:            https://<project>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization:  Bearer <REVENUECAT_WEBHOOK_SECRET>   (set the same value as a function secret)
// Deploy with --no-verify-jwt (RevenueCat cannot mint Supabase JWTs); auth is the shared secret.
import { createClient } from 'npm:@supabase/supabase-js@2';

type RcEvent = {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  original_transaction_id?: string | null;
  transaction_id?: string | null;
};

const UNLIMITED = 'unlimited';
const BYOK = 'byok';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });

  let event: RcEvent;
  try {
    event = ((await req.json()) as { event: RcEvent }).event;
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  // Dashboard 'Send test event' — nothing to persist.
  if (event.type === 'TEST') return new Response('ok (test event)', { status: 200 });

  // We log in to RevenueCat with the Supabase user id, so one of these is our uuid.
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].filter(Boolean) as string[];
  const userId = candidates.find(isUuid);
  if (!userId) return new Response('No mapped user', { status: 202 }); // acknowledged, nothing to do

  const ids = new Set(event.entitlement_ids ?? []);
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const now = Date.now();

  // Load current row so a BYOK event never clobbers Unlimited state and vice versa.
  const { data: current } = await admin
    .from('entitlements')
    .select('unlimited_active, unlimited_expires_at, byok_lifetime')
    .eq('user_id', userId)
    .maybeSingle();

  const patch: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };

  if (ids.has(UNLIMITED)) {
    const ended = ['EXPIRATION', 'CANCELLATION_EXPIRED', 'REFUND', 'SUBSCRIPTION_PAUSED'].includes(event.type) ||
      (expiresAt !== null && expiresAt.getTime() <= now && event.type !== 'RENEWAL');
    patch.unlimited_active = !ended;
    patch.unlimited_expires_at = expiresAt?.toISOString() ?? null;
  } else if (current) {
    patch.unlimited_active = current.unlimited_active;
    patch.unlimited_expires_at = current.unlimited_expires_at;
  }

  if (ids.has(BYOK)) {
    patch.byok_lifetime = event.type !== 'REFUND';
  } else if (current) {
    patch.byok_lifetime = current.byok_lifetime;
  }

  if (event.original_transaction_id ?? event.transaction_id) {
    patch.original_transaction_id = event.original_transaction_id ?? event.transaction_id;
  }

  const { error } = await admin.from('entitlements').upsert(patch, { onConflict: 'user_id' });
  // 23503 = foreign key violation: the app_user_id is not one of our auth users (e.g. anonymous RC id).
  if (error?.code === '23503') return new Response('Unknown user', { status: 202 });
  if (error) return new Response(error.message, { status: 500 });
  return new Response('ok', { status: 200 });
});
