/**
 * Runtime configuration surfaced from app.config.ts `extra` (populated from environment at build
 * time). No secrets belong here beyond the public Supabase anon key (which is RLS-safe by design).
 */
import Constants from 'expo-constants';

interface Extra {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  revenueCatIosKey?: string;
  revenueCatAndroidKey?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const config = {
  supabaseUrl: extra.supabaseUrl ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? '',
  revenueCatIosKey: extra.revenueCatIosKey ?? '',
  revenueCatAndroidKey: extra.revenueCatAndroidKey ?? '',
} as const;

export function isBackendConfigured(): boolean {
  return config.supabaseUrl.length > 0 && config.supabaseAnonKey.length > 0;
}
