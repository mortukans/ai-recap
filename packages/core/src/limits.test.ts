import { describe, expect, it } from 'vitest';
import { dailyQuotaState, recordingLimitState, startOfDay } from './limits';

describe('recordingLimitState (15-min Free plan)', () => {
  it('is calm early on', () => {
    const s = recordingLimitState(60, 15);
    expect(s.warn).toBe(false);
    expect(s.strongWarn).toBe(false);
    expect(s.shouldStop).toBe(false);
    expect(s.remainingSeconds).toBe(840);
  });

  it('warns at 13:00 (2 minutes left)', () => {
    const s = recordingLimitState(13 * 60, 15);
    expect(s.warn).toBe(true);
    expect(s.strongWarn).toBe(false);
  });

  it('strong-warns at 14:00 (1 minute left)', () => {
    const s = recordingLimitState(14 * 60, 15);
    expect(s.warn).toBe(false);
    expect(s.strongWarn).toBe(true);
  });

  it('stops at 15:00', () => {
    const s = recordingLimitState(15 * 60, 15);
    expect(s.shouldStop).toBe(true);
    expect(s.remainingSeconds).toBe(0);
  });
});

describe('dailyQuotaState', () => {
  it('allows starts under the cap', () => {
    const s = dailyQuotaState(3, 5);
    expect(s.canStart).toBe(true);
    expect(s.remaining).toBe(2);
  });

  it('blocks at the cap', () => {
    const s = dailyQuotaState(5, 5);
    expect(s.canStart).toBe(false);
    expect(s.remaining).toBe(0);
  });

  it('is unlimited when max is null', () => {
    const s = dailyQuotaState(999, null);
    expect(s.canStart).toBe(true);
    expect(s.remaining).toBeNull();
  });
});

describe('startOfDay', () => {
  it('zeroes the time-of-day', () => {
    const start = startOfDay(new Date(2026, 8, 12, 15, 42, 7).getTime());
    const d = new Date(start);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });
});
