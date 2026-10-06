/**
 * Pure formatting for crash diagnostics — no React Native / Expo imports, so it is unit-testable.
 * See `crash.ts` for the runtime (global handler, throttling, network send).
 */

export interface ReportOptions {
  fatal?: boolean;
  /** Short breadcrumb, e.g. the current route. Never put user content here. */
  context?: string;
}

export interface DeviceEnv {
  appVersion: string | null;
  buildNumber: string | null;
  platform: string;
  osVersion: string | null;
  deviceModel: string | null;
}

export interface ErrorPayload {
  app_version: string | null;
  build_number: string | null;
  platform: string;
  os_version: string | null;
  device_model: string | null;
  fatal: boolean;
  name: string | null;
  message: string | null;
  stack: string | null;
  context: string | null;
  occurred_at: string;
}

export const LIMITS = { name: 200, message: 2000, stack: 8000, context: 500 };

export function clip(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length === 0 ? null : s.slice(0, max);
}

/**
 * Defense-in-depth before an error message/stack leaves the device: redact anything that looks like a
 * credential or embedded audio. Error strings occasionally interpolate provider response bodies
 * (`… ${detail}`), so a future throw must never be able to ship a key, bearer token or base64 blob.
 */
export function scrubSecrets(v: string | null): string | null {
  if (v == null) return v;
  return v
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/gi, 'sk-[redacted]') // OpenRouter / OpenAI API keys
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9._-]{20,}/g, '[jwt]') // JWT-shaped tokens
    // embedded audio / large blobs: a long base64 run (require a digit so prose/repeated letters aren't hit)
    .replace(/(?=[A-Za-z0-9+/]*\d)[A-Za-z0-9+/]{200,}={0,2}/g, '[base64]');
}

/** Reduce a concrete path to its route shape so no content-bearing id leaks: "/recap/abc-123" → "/recap/:id". */
export function sanitizeRoute(path: string): string {
  if (typeof path !== 'string' || path.replace(/\//g, '').length === 0) return 'app';
  return (
    path
      .split('/')
      .map((seg) => (seg.length > 0 && (/^[0-9a-f-]{8,}$/i.test(seg) || /\d/.test(seg)) ? ':id' : seg))
      .join('/')
      .slice(0, LIMITS.context) || 'app'
  );
}

/** Turn an error + context + environment into the wire payload sent to the `log-error` function. */
export function buildErrorPayload(error: unknown, opts: ReportOptions, env: DeviceEnv, breadcrumb = 'app', now: Date = new Date()): ErrorPayload {
  const e = error as { name?: unknown; message?: unknown; stack?: unknown } | null | undefined;
  const rawMessage = e && typeof e === 'object' && 'message' in e ? e.message : error;
  return {
    app_version: env.appVersion,
    build_number: env.buildNumber,
    platform: env.platform,
    os_version: env.osVersion,
    device_model: env.deviceModel,
    fatal: opts.fatal ?? false,
    name: clip(e?.name, LIMITS.name) ?? 'Error',
    message: scrubSecrets(clip(typeof rawMessage === 'string' ? rawMessage : String(rawMessage ?? ''), LIMITS.message)),
    stack: scrubSecrets(clip(e?.stack, LIMITS.stack)),
    context: clip(opts.context ?? breadcrumb, LIMITS.context),
    occurred_at: now.toISOString(),
  };
}

/** A stable-enough signature to suppress duplicate reports of the same fault within a session. */
export function signatureOf(payload: ErrorPayload): string {
  return `${payload.name}|${(payload.message ?? '').slice(0, 120)}|${(payload.stack ?? '').slice(0, 200)}`;
}
