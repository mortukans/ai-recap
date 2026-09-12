import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backoffMs, withRetry } from './backoff';

describe('backoffMs', () => {
  it('stays within [exp/2, exp] and caps at maxMs', () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const exp = Math.min(1000, 100 * 2 ** attempt);
      const v = backoffMs(attempt, 100, 1000);
      expect(v).toBeGreaterThanOrEqual(exp / 2);
      expect(v).toBeLessThanOrEqual(exp);
    }
  });
});

describe('withRetry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns on the first success without waiting', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { attempts: 3, baseMs: 10 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries then succeeds', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue('ok');
    const p = withRetry(fn, { attempts: 3, baseMs: 10 });
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('exhausts all attempts then throws the last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    const p = withRetry(fn, { attempts: 3, baseMs: 10 });
    const assertion = expect(p).rejects.toThrow('boom');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops immediately when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('nope'));
    await expect(
      withRetry(fn, { attempts: 5, baseMs: 10, shouldRetry: () => false }),
    ).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
