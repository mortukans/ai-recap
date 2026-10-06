/**
 * Anonymous crash / error diagnostics. Sends the error name, message, stack and a short route
 * breadcrumb — plus app version and device model — to our own EU backend (`log-error` Edge Function).
 * NEVER sends recording content, transcripts, recaps, keys or any personal data.
 *
 * Coverage: uncaught JS errors (global handler) and React render errors (ErrorBoundary). Handled
 * failures can opt in via `reportHandledError`. Best-effort throughout: it never throws and never
 * blocks the app, and it no-ops when the backend is unconfigured.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { supabase } from '../api/supabase';
import { config, isBackendConfigured } from '../config';
import { type DeviceEnv, type ReportOptions, buildErrorPayload, sanitizeRoute, signatureOf } from './crash-format';

export { sanitizeRoute } from './crash-format';
export type { ReportOptions } from './crash-format';

const MAX_PER_SESSION = 20;

let installed = false;
let breadcrumb = 'app';
let sentCount = 0;
const seenSignatures = new Set<string>();

/** Record where the user is, so a later crash report carries a route (ids stripped, no content). */
export function setBreadcrumb(route: string): void {
  breadcrumb = sanitizeRoute(route);
}

function deviceEnv(): DeviceEnv {
  const c = Constants as unknown as { nativeAppVersion?: string | null; nativeBuildVersion?: string | null };
  return {
    appVersion: c.nativeAppVersion ?? Constants.expoConfig?.version ?? null,
    buildNumber: c.nativeBuildVersion ?? null,
    platform: Platform.OS,
    osVersion: Device.osVersion ?? (Platform.Version != null ? String(Platform.Version) : null),
    // Hardware model ("iPhone 15 Pro"), NOT the user-assigned device name (which can contain a person's name).
    deviceModel: Device.modelName ?? null,
  };
}

async function send(body: ReturnType<typeof buildErrorPayload>): Promise<void> {
  if (!isBackendConfigured()) return;
  let token = config.supabaseAnonKey;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) token = data.session.access_token;
  } catch {
    /* fall back to the anon key */
  }
  await fetch(`${config.supabaseUrl}/functions/v1/log-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

/** Report an error. Deduped and throttled; swallows all of its own failures. */
export function reportError(error: unknown, opts: ReportOptions = {}): void {
  try {
    if (sentCount >= MAX_PER_SESSION) return;
    const payload = buildErrorPayload(error, opts, deviceEnv(), breadcrumb);
    const sig = signatureOf(payload);
    if (seenSignatures.has(sig)) return;
    seenSignatures.add(sig);
    sentCount += 1;
    void send(payload).catch(() => undefined);
  } catch {
    /* diagnostics must never make things worse */
  }
}

/** Explicit opt-in for a caught failure worth knowing about (e.g. a background pipeline error). */
export function reportHandledError(error: unknown, context?: string): void {
  reportError(error, { fatal: false, context });
}

/** Install the global JS error handler once. React render errors are caught by ErrorBoundary. */
export function installCrashReporting(): void {
  if (installed) return;
  installed = true;
  try {
    const g = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler?: () => unknown; setGlobalHandler?: (h: unknown) => void } }).ErrorUtils;
    if (g?.getGlobalHandler && g?.setGlobalHandler) {
      const previous = g.getGlobalHandler() as ((error: unknown, isFatal?: boolean) => void) | undefined;
      g.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        reportError(error, { fatal: isFatal ?? true });
        if (typeof previous === 'function') previous(error, isFatal); // keep RedBox / default behaviour
      });
    }
  } catch {
    /* if the host has no ErrorUtils, the ErrorBoundary still covers render errors */
  }
}
