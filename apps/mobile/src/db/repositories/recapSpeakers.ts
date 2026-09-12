/** Per-recap diarized speakers, renameable and mappable to reusable profiles. */
import type { RecapSpeaker } from '@ai-recap/core';
import { asc, eq } from 'drizzle-orm';
import { newId } from '../../lib/ids';
import { getDatabase } from '../client';
import { recapSpeakers } from '../schema';

type RecapSpeakerRow = typeof recapSpeakers.$inferSelect;

function toDomain(row: RecapSpeakerRow): RecapSpeaker {
  return {
    id: row.id,
    recapId: row.recapId,
    diarizedLabel: row.diarizedLabel,
    customDisplayName: row.customDisplayName,
    speakerProfileId: row.speakerProfileId,
  };
}

export async function listByRecap(recapId: string): Promise<RecapSpeaker[]> {
  const rows = await getDatabase()
    .select()
    .from(recapSpeakers)
    .where(eq(recapSpeakers.recapId, recapId))
    .orderBy(asc(recapSpeakers.diarizedLabel));
  return rows.map(toDomain);
}

/** Insert a row for any diarized label not already present for this recap (idempotent). */
export async function ensureForLabels(recapId: string, labels: string[]): Promise<void> {
  if (labels.length === 0) return;
  const existing = await listByRecap(recapId);
  const have = new Set(existing.map((s) => s.diarizedLabel));
  const missing = labels.filter((l) => !have.has(l));
  if (missing.length === 0) return;
  await getDatabase()
    .insert(recapSpeakers)
    .values(
      missing.map((label) => ({
        id: newId(),
        recapId,
        diarizedLabel: label,
        customDisplayName: null,
        speakerProfileId: null,
      })),
    );
}

export async function update(
  id: string,
  patch: Partial<Pick<RecapSpeaker, 'customDisplayName' | 'speakerProfileId'>>,
): Promise<void> {
  await getDatabase().update(recapSpeakers).set(patch).where(eq(recapSpeakers.id, id));
}
