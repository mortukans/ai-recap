import { describe, expect, it } from 'vitest';
import type { TranscriptSegment } from './models';
import { groupSegmentsBySpeaker } from './transcript';

function seg(speakerLabel: string | null, startTime: number, text = ''): TranscriptSegment {
  return { id: `${startTime}`, recapId: 'r', startTime, endTime: startTime + 1, speakerLabel, language: null, text };
}

describe('groupSegmentsBySpeaker', () => {
  it('collapses consecutive same-speaker segments', () => {
    const groups = groupSegmentsBySpeaker([
      seg('Speaker 1', 0, 'a'),
      seg('Speaker 1', 2, 'b'),
      seg('Speaker 2', 4, 'c'),
      seg('Speaker 1', 6, 'd'),
    ]);
    expect(groups).toHaveLength(3);
    expect(groups[0]?.speakerLabel).toBe('Speaker 1');
    expect(groups[0]?.segments).toHaveLength(2);
    expect(groups[0]?.startTime).toBe(0);
    expect(groups[1]?.speakerLabel).toBe('Speaker 2');
    expect(groups[2]?.startTime).toBe(6);
  });

  it('handles an empty transcript', () => {
    expect(groupSegmentsBySpeaker([])).toEqual([]);
  });
});
