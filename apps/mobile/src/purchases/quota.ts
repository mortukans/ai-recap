/**
 * Free-plan daily quota (MVP task M5-3). The local count is the UX; when the backend is configured the
 * server also consumes a slot (anti-tamper). A network failure never blocks recording — the local
 * count still applies.
 */
import { isBackendConfigured } from '../config';
import { ensureSession, supabase } from '../api/supabase';

export interface QuotaDecision {
  allowed: boolean;
  startedToday: number | null;
}

export async function consumeQuota(maxPerDay: number | null): Promise<QuotaDecision> {
  if (!isBackendConfigured()) return { allowed: true, startedToday: null };
  try {
    await ensureSession();
    const { data, error } = await supabase.functions.invoke<{ allowed: boolean; startedToday: number }>(
      'quota-consume',
      { body: { maxPerDay } },
    );
    if (error || !data) return { allowed: true, startedToday: null };
    return { allowed: data.allowed, startedToday: data.startedToday };
  } catch {
    return { allowed: true, startedToday: null };
  }
}
