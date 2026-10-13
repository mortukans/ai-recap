import { describe, expect, it } from 'vitest';
import { dayDiff, startOfDay } from './agendaDates';

describe('startOfDay', () => {
  it('truncates to local midnight', () => {
    const d = new Date(2026, 9, 14, 15, 42, 9);
    const s = new Date(startOfDay(d.getTime()));
    expect([s.getFullYear(), s.getMonth(), s.getDate(), s.getHours(), s.getMinutes(), s.getSeconds()]).toEqual([2026, 9, 14, 0, 0, 0]);
  });
});

describe('dayDiff', () => {
  const now = new Date(2026, 9, 14, 9, 0, 0).getTime();
  it('is 0 for the same day regardless of time', () => {
    expect(dayDiff(new Date(2026, 9, 14, 23, 59).getTime(), now)).toBe(0);
    expect(dayDiff(new Date(2026, 9, 14, 0, 1).getTime(), now)).toBe(0);
  });
  it('is +1 tomorrow and -1 yesterday', () => {
    expect(dayDiff(new Date(2026, 9, 15, 6, 0).getTime(), now)).toBe(1);
    expect(dayDiff(new Date(2026, 9, 13, 20, 0).getTime(), now)).toBe(-1);
  });
  it('counts whole days across a week', () => {
    expect(dayDiff(new Date(2026, 9, 21, 9, 0).getTime(), now)).toBe(7);
    expect(dayDiff(new Date(2026, 9, 7, 9, 0).getTime(), now)).toBe(-7);
  });
});
