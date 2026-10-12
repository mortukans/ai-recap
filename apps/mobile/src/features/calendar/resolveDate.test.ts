import { describe, expect, it } from 'vitest';
import { asEventType, toInstant } from './resolveDate';

// A fixed "now" so the out-of-range guard is deterministic (2026-10-12 local).
const NOW = new Date(2026, 9, 12, 12, 0, 0).getTime();

describe('toInstant', () => {
  it('parses an all-day ISO date to local midnight', () => {
    const r = toInstant('2026-11-03', null, NOW);
    expect(r).not.toBeNull();
    expect(r?.allDay).toBe(true);
    const d = new Date(r!.startAt);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 3, 0, 0]);
  });

  it('parses a date + time as a non-all-day instant', () => {
    const r = toInstant('2026-11-03', '14:30', NOW);
    expect(r?.allDay).toBe(false);
    const d = new Date(r!.startAt);
    expect([d.getHours(), d.getMinutes()]).toEqual([14, 30]);
  });

  it('ignores a malformed time but keeps the date', () => {
    const r = toInstant('2026-11-03', '25:99', NOW);
    expect(r?.allDay).toBe(true);
  });

  it('rejects non-ISO or non-string dates', () => {
    expect(toInstant('next Tuesday', null, NOW)).toBeNull();
    expect(toInstant('03/11/2026', null, NOW)).toBeNull();
    expect(toInstant(null, null, NOW)).toBeNull();
    expect(toInstant(20261103, null, NOW)).toBeNull();
  });

  it('rejects impossible months/days and calendar rollovers', () => {
    expect(toInstant('2026-13-01', null, NOW)).toBeNull();
    expect(toInstant('2026-00-10', null, NOW)).toBeNull();
    expect(toInstant('2026-02-31', null, NOW)).toBeNull(); // would roll into March
  });

  it('rejects hallucinated far-past and far-future dates', () => {
    expect(toInstant('1990-01-01', null, NOW)).toBeNull();
    expect(toInstant('2040-01-01', null, NOW)).toBeNull();
  });

  it('accepts dates inside the guard window (past and future)', () => {
    expect(toInstant('2024-06-01', null, NOW)).not.toBeNull();
    expect(toInstant('2028-06-01', null, NOW)).not.toBeNull();
  });
});

describe('asEventType', () => {
  it('passes through known types and defaults the rest to event', () => {
    expect(asEventType('deadline')).toBe('deadline');
    expect(asEventType('mention')).toBe('mention');
    expect(asEventType('event')).toBe('event');
    expect(asEventType('party')).toBe('event');
    expect(asEventType(undefined)).toBe('event');
  });
});
