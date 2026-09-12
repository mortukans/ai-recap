import { describe, expect, it } from 'vitest';
import { extractTimestampCitations } from './citations';

describe('extractTimestampCitations', () => {
  it('parses mm:ss and h:mm:ss', () => {
    expect(extractTimestampCitations('see [32:14] and later [1:02:03]')).toEqual([1934, 3723]);
  });

  it('deduplicates repeated references', () => {
    expect(extractTimestampCitations('[0:10] again at [0:10]')).toEqual([10]);
  });

  it('returns empty when there are no citations', () => {
    expect(extractTimestampCitations('no timestamps here')).toEqual([]);
  });

  it('ignores malformed brackets', () => {
    expect(extractTimestampCitations('[12] [1:2:3xx] [aa:bb]')).toEqual([]);
  });
});
