/** Exponential backoff with jitter, and a retry wrapper (AI_RECAP_TECHNICAL_ARCHITECTURE.md §9). */

/** Sleep that ends early (rejecting with an AbortError) when `signal` aborts, so a stop never waits out a backoff. */
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => {
      if (timer) clearTimeout(timer);
      const e = new Error('Processing stopped');
      e.name = 'AbortError';
      reject(e);
    };
    if (signal?.aborted) return abort();
    timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });

export function backoffMs(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  // full jitter over [exp/2, exp]
  return exp / 2 + Math.random() * (exp / 2);
}

export interface RetryOptions {
  attempts: number;
  baseMs: number;
  maxMs?: number;
  /** Return false to stop retrying a given error (e.g. a missing API key). */
  shouldRetry?: (error: unknown) => boolean;
  /** Aborting it stops retrying at once (no further attempt, no waiting out the backoff). */
  signal?: AbortSignal;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const maxMs = opts.maxMs ?? 5 * 60 * 1000;
  let lastError: unknown;
  for (let attempt = 0; attempt < opts.attempts; attempt++) {
    if (opts.signal?.aborted) break;
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (opts.signal?.aborted) throw error;
      if (opts.shouldRetry && !opts.shouldRetry(error)) throw error;
      if (attempt < opts.attempts - 1) await sleep(backoffMs(attempt, opts.baseMs, maxMs), opts.signal);
    }
  }
  throw lastError;
}
