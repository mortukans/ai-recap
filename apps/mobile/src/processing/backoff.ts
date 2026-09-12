/** Exponential backoff with jitter, and a retry wrapper (AI_RECAP_TECHNICAL_ARCHITECTURE.md §9). */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const maxMs = opts.maxMs ?? 5 * 60 * 1000;
  let lastError: unknown;
  for (let attempt = 0; attempt < opts.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (opts.shouldRetry && !opts.shouldRetry(error)) throw error;
      if (attempt < opts.attempts - 1) await sleep(backoffMs(attempt, opts.baseMs, maxMs));
    }
  }
  throw lastError;
}
