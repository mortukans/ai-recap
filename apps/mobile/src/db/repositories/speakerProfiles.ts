/** Reusable speaker profiles (names only in MVP; voice reference reserved/disabled). */
import type { SpeakerProfile } from '@ai-recap/core';
import { asc, eq } from 'drizzle-orm';
import { getDatabase } from '../client';
import { speakerProfiles } from '../schema';

type ProfileRow = typeof speakerProfiles.$inferSelect;

function toDomain(row: ProfileRow): SpeakerProfile {
  return {
    id: row.id,
    displayName: row.displayName,
    // Reserved/disabled in MVP; blob type is opaque without Node Buffer types.
    voiceReferenceMetadata: (row.voiceReferenceMetadata ?? null) as Uint8Array | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listProfiles(): Promise<SpeakerProfile[]> {
  const rows = await getDatabase().select().from(speakerProfiles).orderBy(asc(speakerProfiles.displayName));
  return rows.map(toDomain);
}

export async function upsertProfile(profile: SpeakerProfile): Promise<void> {
  await getDatabase()
    .insert(speakerProfiles)
    .values(profile)
    .onConflictDoUpdate({
      target: speakerProfiles.id,
      set: { displayName: profile.displayName, updatedAt: Date.now() },
    });
}

export async function deleteProfile(id: string): Promise<void> {
  await getDatabase().delete(speakerProfiles).where(eq(speakerProfiles.id, id));
}
