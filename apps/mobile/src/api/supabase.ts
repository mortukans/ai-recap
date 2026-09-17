/**
 * Supabase client (service plane only — no user content at rest).
 * Mints an anonymous session on first launch so backend calls are authorized and meterable without a
 * signup wall (AI_RECAP_TECHNICAL_ARCHITECTURE.md §17). Upgradable to Sign in with Apple/Google later.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { config, isBackendConfigured } from '../config';

// Fall back to harmless placeholders when the backend isn't configured, so importing this module
// never throws at startup. When unconfigured, ensureSession() no-ops and no requests are made.
const SUPABASE_URL = config.supabaseUrl || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = config.supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Ensure there is a session (anonymous if the user hasn't signed in). No-op if backend unconfigured. */
export async function ensureSession(): Promise<void> {
  if (!isBackendConfigured()) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    await supabase.auth.signInAnonymously();
  }
}
