/** Audio chunk repository (AI_RECAP_TECHNICAL_ARCHITECTURE.md §5.2 / §7). */
import type { AudioChunk, UploadStatus } from '@ai-recap/core';
import { asc, eq } from 'drizzle-orm';
import { getDatabase } from '../client';
import { audioChunks } from '../schema';

type ChunkRow = typeof audioChunks.$inferSelect;

function toDomain(row: ChunkRow): AudioChunk {
  return {
    id: row.id,
    recapId: row.recapId,
    index: row.index,
    relativePath: row.relativePath,
    startOffset: row.startOffset,
    duration: row.duration,
    byteSize: row.byteSize,
    uploadStatus: row.uploadStatus as UploadStatus,
  };
}

export async function addChunk(chunk: AudioChunk): Promise<void> {
  await getDatabase().insert(audioChunks).values(chunk);
}

export async function listChunks(recapId: string): Promise<AudioChunk[]> {
  const rows = await getDatabase()
    .select()
    .from(audioChunks)
    .where(eq(audioChunks.recapId, recapId))
    .orderBy(asc(audioChunks.index));
  return rows.map(toDomain);
}

/** Remove a recap's chunk rows (audio retention: transcript/recap stay, audio goes). */
export async function deleteChunks(recapId: string): Promise<void> {
  await getDatabase().delete(audioChunks).where(eq(audioChunks.recapId, recapId));
}

export async function setChunkUploadStatus(chunkId: string, status: UploadStatus): Promise<void> {
  await getDatabase().update(audioChunks).set({ uploadStatus: status }).where(eq(audioChunks.id, chunkId));
}
