/** Transcript segment repository. */
import type { TranscriptSegment } from '@ai-recap/core';
import { asc, eq } from 'drizzle-orm';
import { getDatabase } from '../client';
import { transcriptSegments } from '../schema';

type SegmentRow = typeof transcriptSegments.$inferSelect;

function toDomain(row: SegmentRow): TranscriptSegment {
  return {
    id: row.id,
    recapId: row.recapId,
    startTime: row.startTime,
    endTime: row.endTime,
    speakerLabel: row.speakerLabel,
    language: row.language,
    text: row.text,
  };
}

/** Replace the full transcript for a recap (transcription is regenerated atomically). */
export async function replaceSegments(recapId: string, segments: TranscriptSegment[]): Promise<void> {
  const db = getDatabase();
  await db.delete(transcriptSegments).where(eq(transcriptSegments.recapId, recapId));
  if (segments.length > 0) {
    await db.insert(transcriptSegments).values(segments);
  }
}

export async function listSegments(recapId: string): Promise<TranscriptSegment[]> {
  const rows = await getDatabase()
    .select()
    .from(transcriptSegments)
    .where(eq(transcriptSegments.recapId, recapId))
    .orderBy(asc(transcriptSegments.startTime));
  return rows.map(toDomain);
}
