import { describe, expect, it } from 'vitest';
import { formatDuration, formatTimestamp } from './format';
import { DEFAULT_CHUNK_SECONDS, MAX_CHUNK_SECONDS, MIN_CHUNK_SECONDS, clampChunkSeconds } from './settings';

describe('formatTimestamp', () => {
  it('formats mm:ss', () => expect(formatTimestamp(1934)).toBe('32:14'));
  it('formats h:mm:ss past an hour', () => expect(formatTimestamp(4520)).toBe('1:15:20'));
  it('zero-pads seconds', () => expect(formatTimestamp(5)).toBe('0:05'));
  it('clamps negatives to zero', () => expect(formatTimestamp(-3)).toBe('0:00'));
});

describe('formatDuration', () => {
  it('formats hours+minutes', () => expect(formatDuration(4634)).toBe('1h 17m'));
  it('formats minutes+seconds', () => expect(formatDuration(154)).toBe('2m 34s'));
  it('formats seconds only', () => expect(formatDuration(45)).toBe('45s'));
});

describe('clampChunkSeconds', () => {
  it('clamps below the minimum', () => expect(clampChunkSeconds(5)).toBe(MIN_CHUNK_SECONDS));
  it('clamps above the maximum', () => expect(clampChunkSeconds(9999)).toBe(MAX_CHUNK_SECONDS));
  it('rounds to whole seconds', () => expect(clampChunkSeconds(60.7)).toBe(61));
  it('falls back on non-finite input', () => expect(clampChunkSeconds(Number.NaN)).toBe(DEFAULT_CHUNK_SECONDS));
});
