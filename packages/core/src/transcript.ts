/** Transcript grouping for display (AI_RECAP_TECHNICAL_ARCHITECTURE.md §12). */
import { formatTimestamp } from './format';
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

/**
 * Plain-text transcript for the separate explicit export (Product Plan §36A). Speaker turns headed by
 * resolved name + [mm:ss]. Not part of the normal recap share.
 */
export function formatTranscriptText(
  segments: TranscriptSegment[],
  nameForLabel: (label: string | null) => string,
): string {
  const groups = groupSegmentsBySpeaker(segments);
  const out: string[] = [];
  for (const g of groups) {
    const name = nameForLabel(g.speakerLabel);
    const head = `[${formatTimestamp(g.startTime)}]`;
    out.push(name ? `${name} ${head}` : head);
    for (const s of g.segments) out.push(s.text);
    out.push('');
  }
  return `${out.join('\n').trim()}\n`;
}
