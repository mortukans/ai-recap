import { describe, expect, it } from 'vitest';
import type { RecapSpeaker, TranscriptSegment } from './models';
import { distinctSpeakerLabels, resolveSpeakerName } from './speakers';

function seg(speakerLabel: string | null, text = ''): TranscriptSegment {
  return { id: 's', recapId: 'r', startTime: 0, endTime: 1, speakerLabel, language: null, text };
}

describe('distinctSpeakerLabels', () => {
  it('dedups and preserves first-appearance order', () => {
    expect(distinctSpeakerLabels([seg('Speaker 1'), seg('Speaker 2'), seg('Speaker 1')])).toEqual([
      'Speaker 1',
      'Speaker 2',
    ]);
  });

  it('ignores null/empty labels', () => {
    expect(distinctSpeakerLabels([seg(null), seg(''), seg('Speaker 1')])).toEqual(['Speaker 1']);
  });
});

describe('resolveSpeakerName', () => {
  const base: RecapSpeaker = {
    id: 'x',
    recapId: 'r',
    diarizedLabel: 'Speaker 1',
    customDisplayName: null,
    speakerProfileId: null,
  };

  it('prefers the custom name', () => {
    expect(resolveSpeakerName({ ...base, customDisplayName: 'Jānis' }, 'Profile Name')).toBe('Jānis');
  });

  it('falls back to the linked profile name', () => {
    expect(resolveSpeakerName(base, 'Mārtiņš')).toBe('Mārtiņš');
  });

  it('falls back to the diarized label', () => {
    expect(resolveSpeakerName(base, null)).toBe('Speaker 1');
    expect(resolveSpeakerName({ ...base, customDisplayName: '   ' })).toBe('Speaker 1');
  });
});
