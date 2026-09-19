/**
 * Usage accounting sync (MVP task M5-5, Arch §23). Local `usage_records` rows are mirrored into the
 * backend `usage_events` table (RLS: user can only insert their own) so unit economics can be studied
 * without any content leaving the device — only seconds, tokens, model/provider names.
 *
 * Best-effort and idempotent: rows are marked synced only after the insert succeeds; the backend row
 * id is the local id, so a retry after a half-failure cannot double count.
 */
import { isBackendConfigured } from '../../config';
import { ensureSession, supabase } from '../../api/supabase';
import { usageRepo } from '../../db';

let inFlight: Promise<number> | null = null;

/** Push unsynced usage; returns how many rows were synced. Never throws. */
export function syncUsage(): Promise<number> {
  if (inFlight) return inFlight;
  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run(): Promise<number> {
  if (!isBackendConfigured()) return 0;
  try {
    await ensureSession();
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return 0;

    const pending = await usageRepo.listUnsyncedUsage();
    if (pending.length === 0) return 0;

    const rows = pending.map((r) => ({
      id: r.id,
      user_id: userId,
      recap_client_id: r.recapId,
      recording_seconds: r.recordingSeconds,
      transcription_seconds: r.transcriptionSeconds,
      input_tokens: r.inputTokens,
      output_tokens: r.outputTokens,
      model: r.model,
      provider: r.provider,
      estimated_cost_micros: r.estimatedCostMicros,
      occurred_at: new Date(r.occurredAt).toISOString(),
    }));

    // upsert on id → safe to retry a batch that partially landed.
    const { error } = await supabase.from('usage_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      console.warn('[usage] sync failed:', error.message);
      return 0;
    }
    await usageRepo.markUsageSynced(pending.map((r) => r.id));
    return pending.length;
  } catch (e) {
    console.warn('[usage] sync error:', String(e));
    return 0;
  }
}
