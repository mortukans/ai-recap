import { describe, expect, it } from 'vitest';
import { absoluteSeconds, locateInChunks } from './playback';

describe('locateInChunks', () => {
  const durations = [60, 60, 12.5];

  it('maps a position inside the first chunk', () => {
    expect(locateInChunks(durations, 12.3)).toEqual({ index: 0, offset: 12.3 });
  });

  it('crosses chunk boundaries (boundary belongs to the next chunk)', () => {
    expect(locateInChunks(durations, 60)).toEqual({ index: 1, offset: 0 });
    expect(locateInChunks(durations, 125)).toEqual({ index: 2, offset: 5 });
  });

  it('clamps past the end into the last chunk with a start margin', () => {
    expect(locateInChunks(durations, 999)).toEqual({ index: 2, offset: 12.25 });
  });

  it('never goes negative and handles empty lists', () => {
    expect(locateInChunks(durations, -5)).toEqual({ index: 0, offset: 0 });
    expect(locateInChunks([], 30)).toEqual({ index: 0, offset: 0 });
  });

  it('round-trips through absoluteSeconds', () => {
    const p = locateInChunks(durations, 77.7);
    expect(absoluteSeconds(durations, p.index, p.offset)).toBeCloseTo(77.7, 6);
  });
});
