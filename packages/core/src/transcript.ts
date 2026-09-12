/** Transcript grouping for display (AI_RECAP_TECHNICAL_ARCHITECTURE.md §12). */
import type { TranscriptSegment } from './models';

export interface SpeakerGroup {
  speakerLabel: string | null;
  startTime: number;
  segments: TranscriptSegment[];
}

/** Collapse runs of consecutive same-speaker segments into groups (turn-by-turn display). */
export function groupSegmentsBySpeaker(segments: TranscriptSegment[]): SpeakerGroup[] {
  const groups: SpeakerGroup[] = [];
  for (const s of segments) {
    const last = groups[groups.length - 1];
    if (last && last.speakerLabel === s.speakerLabel) {
      last.segments.push(s);
    } else {
      groups.push({ speakerLabel: s.speakerLabel, startTime: s.startTime, segments: [s] });
    }
  }
  return groups;
}
