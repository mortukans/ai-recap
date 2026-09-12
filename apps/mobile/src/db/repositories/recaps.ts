/**
 * Recap repository. All feature code goes through repositories — never raw Drizzle — so the storage
 * engine stays swappable (AI_RECAP_TECHNICAL_ARCHITECTURE.md §5.1).
 */
import type { Recap, RecapStatus } from '@ai-recap/core';
import { count, desc, eq, gte, inArray, like } from 'drizzle-orm';
import { getDatabase } from '../client';
import { recaps } from '../schema';

type RecapRow = typeof recaps.$inferSelect;

function toDomain(row: RecapRow): Recap {
  return {
    id: row.id,
    title: row.title,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationSeconds: row.durationSeconds,
    detectedLanguages: row.detectedLanguages,
    status: row.status as RecapStatus,
    presetId: row.presetId,
    contextId: row.contextId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createRecap(recap: Recap): Promise<void> {
  await getDatabase().insert(recaps).values(recap);
}

export async function getRecap(id: string): Promise<Recap | null> {
  const rows = await getDatabase().select().from(recaps).where(eq(recaps.id, id)).limit(1);
  const row = rows.at(0);
  return row ? toDomain(row) : null;
}

export interface RecapPageParams {
  offset?: number;
  limit?: number;
  query?: string;
}

export async function pageRecaps({ offset = 0, limit = 50, query }: RecapPageParams = {}): Promise<Recap[]> {
  const db = getDatabase();
  const base = db.select().from(recaps).orderBy(desc(recaps.startedAt)).limit(limit).offset(offset);
  const rows = query && query.trim().length > 0
    ? await db
        .select()
        .from(recaps)
        .where(like(recaps.title, `%${query.trim()}%`))
        .orderBy(desc(recaps.startedAt))
        .limit(limit)
        .offset(offset)
    : await base;
  return rows.map(toDomain);
}

/** Count recaps started at or after `since` (for Free daily-quota enforcement). */
export async function countStartedSince(since: number): Promise<number> {
  const rows = await getDatabase()
    .select({ n: count() })
    .from(recaps)
    .where(gte(recaps.startedAt, since));
  return rows.at(0)?.n ?? 0;
}

export async function listByStatuses(statuses: RecapStatus[]): Promise<Recap[]> {
  if (statuses.length === 0) return [];
  const rows = await getDatabase()
    .select()
    .from(recaps)
    .where(inArray(recaps.status, statuses))
    .orderBy(desc(recaps.startedAt));
  return rows.map(toDomain);
}

export async function updateRecapStatus(id: string, status: RecapStatus): Promise<void> {
  await getDatabase()
    .update(recaps)
    .set({ status, updatedAt: Date.now() })
    .where(eq(recaps.id, id));
}

export async function updateRecap(id: string, patch: Partial<Omit<Recap, 'id' | 'createdAt'>>): Promise<void> {
  await getDatabase()
    .update(recaps)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(recaps.id, id));
}

/** Deleting a recap cascades to chunks/segments/artifacts/speakers/chat via FK ON DELETE CASCADE. */
export async function deleteRecap(id: string): Promise<void> {
  await getDatabase().delete(recaps).where(eq(recaps.id, id));
}
