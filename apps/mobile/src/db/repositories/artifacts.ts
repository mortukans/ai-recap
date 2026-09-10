/** Generated artifact repository (structured recaps, alternative summaries). */
import type { ArtifactType, GeneratedArtifact } from '@ai-recap/core';
import { desc, eq } from 'drizzle-orm';
import { getDatabase } from '../client';
import { generatedArtifacts } from '../schema';

type ArtifactRow = typeof generatedArtifacts.$inferSelect;

function toDomain(row: ArtifactRow): GeneratedArtifact {
  return {
    id: row.id,
    recapId: row.recapId,
    type: row.type as ArtifactType,
    model: row.model,
    promptVersion: row.promptVersion,
    contextVersion: row.contextVersion,
    content: row.content,
    createdAt: row.createdAt,
  };
}

export async function addArtifact(artifact: GeneratedArtifact): Promise<void> {
  await getDatabase().insert(generatedArtifacts).values(artifact);
}

export async function listArtifacts(recapId: string): Promise<GeneratedArtifact[]> {
  const rows = await getDatabase()
    .select()
    .from(generatedArtifacts)
    .where(eq(generatedArtifacts.recapId, recapId))
    .orderBy(desc(generatedArtifacts.createdAt));
  return rows.map(toDomain);
}

export async function latestArtifactOfType(
  recapId: string,
  type: ArtifactType,
): Promise<GeneratedArtifact | null> {
  const all = await listArtifacts(recapId);
  return all.find((a) => a.type === type) ?? null;
}
