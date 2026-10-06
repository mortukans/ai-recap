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
    message: clip(typeof rawMessage === 'string' ? rawMessage : String(rawMessage ?? ''), LIMITS.message),
    stack: clip(e?.stack, LIMITS.stack),
    context: clip(opts.context ?? breadcrumb, LIMITS.context),
    occurred_at: now.toISOString(),
  };
}

/** A stable-enough signature to suppress duplicate reports of the same fault within a session. */
export function signatureOf(payload: ErrorPayload): string {
  return `${payload.name}|${(payload.message ?? '').slice(0, 120)}|${(payload.stack ?? '').slice(0, 200)}`;
}
