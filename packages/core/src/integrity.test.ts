import { describe, expect, it } from 'vitest';
import { checkRecordingIntegrity } from './integrity';

const chunk = (index: number, startOffset: number, duration: number) => ({ index, startOffset, duration });

describe('checkRecordingIntegrity', () => {
  it('passes a contiguous recording with sub-second boundary jitter', () => {
    const r = checkRecordingIntegrity([chunk(1, 0, 60), chunk(2, 60.3, 60), chunk(3, 120.5, 12.2)], 132.7);
    expect(r.ok).toBe(true);
    expect(r.gaps).toEqual([]);
    expect(r.chunkCount).toBe(3);
    expect(r.coveredSeconds).toBe(132.2);
  });

  it('reports a gap between chunks with its position and length', () => {
    const r = checkRecordingIntegrity([chunk(1, 0, 60), chunk(2, 75, 60)], 135);
    expect(r.ok).toBe(false);
    expect(r.gaps).toEqual([{ at: 60, seconds: 15, beforeIndex: 2 }]);
    expect(r.missingSeconds).toBe(15);
  });

  it('reports a short tail when the recorder counted more than the chunks hold', () => {
    const r = checkRecordingIntegrity([chunk(1, 0, 60), chunk(2, 60, 30)], 100);
    expect(r.gaps).toEqual([{ at: 90, seconds: 10, beforeIndex: null }]);
  });

  it('only checks inter-chunk gaps when the reported total is unknown', () => {
    const r = checkRecordingIntegrity([chunk(1, 0, 60), chunk(2, 60, 60)], 0);
    expect(r.ok).toBe(true);
  });

  it('fails an empty recording', () => {
    expect(checkRecordingIntegrity([], 30).ok).toBe(false);
  });

  it('tolerates unsorted input', () => {
    const r = checkRecordingIntegrity([chunk(2, 60, 60), chunk(1, 0, 60)], 120);
    expect(r.ok).toBe(true);
  });
});
