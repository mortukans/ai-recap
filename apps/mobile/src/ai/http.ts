/**
 * Network hygiene for AI calls: every request carries a deadline so a stalled provider can never
 * freeze the processing queue (the queue is sequential — one hung call blocked every later recap).
 */
export const LLM_TIMEOUT_MS = 180_000; // one recap generation
export const AUDIO_CHUNK_TIMEOUT_MS = 120_000; // one ≤60 s chunk
export const MODELS_TIMEOUT_MS = 20_000;

/**
 * AbortSignal that fires after `ms`, or as soon as `parent` aborts (user force-stop). Works with
 * React Native's fetch; `AbortSignal.any` is not available on Hermes.
 */
export function timeoutSignal(ms: number, parent?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener('abort', () => controller.abort(), { once: true });
  }
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return controller.signal;
}

/** Throw if the user stopped processing — checked between chunks so a stop takes effect quickly. */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const e = new Error('Processing stopped');
    e.name = 'AbortError';
    throw e;
  }
}

/** True when `e` is the abort raised by `timeoutSignal`. */
export function isTimeout(e: unknown): boolean {
  return e instanceof Error && (e.name === 'AbortError' || /aborted/i.test(e.message));
}
