// POST /log-error — anonymous crash/error diagnostics sink.
// Body (all optional): { app_version, build_number, platform, os_version, device_model,
//                        fatal, name, message, stack, context, occurred_at }
// Stores NO user content — only what the client sends above (error text + device/app metadata).
// verify_jwt is off so reports can be sent even before an anonymous session exists; the Supabase
// gateway still requires the anon apikey. We resolve the user id from the JWT when one is present.
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX = { name: 200, message: 2000, stack: 8000, context: 500, meta: 80 };

function clip(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length === 0 ? null : s.slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Best-effort: attribute to the anonymous account when a valid token is present. Never required.
  let userId: string | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    try {
      const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const { data } = await anon.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      /* anonymous report is fine */
    }
  }

  const occurred = clip(body.occurred_at, 40);
  const row = {
    user_id: userId,
    app_version: clip(body.app_version, MAX.meta),
    build_number: clip(body.build_number, MAX.meta),
    platform: clip(body.platform, MAX.meta),
    os_version: clip(body.os_version, MAX.meta),
    device_model: clip(body.device_model, MAX.meta),
    fatal: body.fatal === true,
    name: clip(body.name, MAX.name),
    message: clip(body.message, MAX.message),
    stack: clip(body.stack, MAX.stack),
    context: clip(body.context, MAX.context),
    occurred_at: occurred && !Number.isNaN(Date.parse(occurred)) ? occurred : new Date().toISOString(),
  };

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.from('error_events').insert(row);
  if (error) return new Response(error.message, { status: 500 });

  return new Response(null, { status: 204 });
});
