/**
 * Recording integrity (MVP task M1-7). Given the persisted chunk list, detect gaps between chunks and
 * against the recorder's reported total duration, so a long/locked recording gets a definitive
 * "no audio lost" verdict instead of a guess.
 */
import type { AudioChunk } from './models';

export interface ChunkGap {
  /** Seconds into the recording where audio is missing. */
  at: number;
  /** Length of the missing stretch in seconds. */
  seconds: number;
  /** Chunk index the gap precedes (null when the tail is short vs the reported duration). */
  beforeIndex: number | null;
}

export interface IntegrityReport {
  chunkCount: number;
  /** Sum of chunk durations. */
  coveredSeconds: number;
  /** Recorder-reported total (may be 0/unknown → only inter-chunk gaps are checked). */
  reportedSeconds: number;
  gaps: ChunkGap[];
  /** Total missing seconds across all gaps. */
  missingSeconds: number;
  ok: boolean;
}

/** Ignore sub-second jitter from encoder frame rounding at chunk boundaries. */
export const GAP_TOLERANCE_SECONDS = 1;

export function checkRecordingIntegrity(
  chunks: Pick<AudioChunk, 'index' | 'startOffset' | 'duration'>[],
  reportedSeconds: number,
  tolerance = GAP_TOLERANCE_SECONDS,
): IntegrityReport {
  const sorted = [...chunks].sort((a, b) => a.startOffset - b.startOffset);
  const gaps: ChunkGap[] = [];
  let cursor = 0;
  let covered = 0;

  for (const ch of sorted) {
    const gap = ch.startOffset - cursor;
    if (gap > tolerance) gaps.push({ at: round(cursor), seconds: round(gap), beforeIndex: ch.index });
    cursor = Math.max(cursor, ch.startOffset + ch.duration);
    covered += ch.duration;
  }

  if (reportedSeconds > 0) {
    const tail = reportedSeconds - cursor;
    if (tail > tolerance) gaps.push({ at: round(cursor), seconds: round(tail), beforeIndex: null });
  }

  const missing = round(gaps.reduce((s, g) => s + g.seconds, 0));
  return {
    chunkCount: sorted.length,
    coveredSeconds: round(covered),
    reportedSeconds,
    gaps,
    missingSeconds: missing,
    ok: sorted.length > 0 && gaps.length === 0,
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
