/**
 * Network hygiene for AI calls: every request carries a deadline so a stalled provider can never
 * freeze the processing queue (the queue is sequential — one hung call blocked every later recap).
 */
export const LLM_TIMEOUT_MS = 180_000; // one recap generation
export const AUDIO_CHUNK_TIMEOUT_MS = 120_000; // one ≤60 s chunk
export const MODELS_TIMEOUT_MS = 20_000;

/** AbortSignal that fires after `ms`. Works with React Native's fetch. */
export function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** True when `e` is the abort raised by `timeoutSignal`. */
export function isTimeout(e: unknown): boolean {
  return e instanceof Error && (e.name === 'AbortError' || /aborted/i.test(e.message));
}
