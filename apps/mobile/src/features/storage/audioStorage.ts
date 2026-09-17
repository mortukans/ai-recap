/**
 * On-device audio storage management (MVP task M6-3 · Storage/Privacy). The native recorder writes
 * every recap's chunks under Documents/Recaps/<recapId>/; transcripts and recaps live in SQLite.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { chunksRepo, recapsRepo } from '../../db';
import { getAudioRetentionDays } from '../../lib/prefs';

const DAY_MS = 24 * 60 * 60 * 1000;

function recapsRoot(): Directory {
  return new Directory(Paths.document, 'Recaps');
}

function dirSize(dir: Directory): number {
  let total = 0;
  for (const entry of dir.list()) {
    if (entry instanceof File) total += entry.size ?? 0;
    else total += dirSize(entry);
  }
  return total;
}

/** Total bytes of recorded audio on this device. */
export async function getAudioStorageBytes(): Promise<number> {
  try {
    const root = recapsRoot();
    return root.exists ? dirSize(root) : 0;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Delete one recap's audio only (keeps transcript + recap). */
export async function deleteRecapAudio(recapId: string): Promise<void> {
  await chunksRepo.deleteChunks(recapId);
  try {
    const dir = new Directory(recapsRoot(), recapId);
    if (dir.exists) dir.delete();
  } catch {
    /* folder already gone */
  }
}

/**
 * Enforce the "keep audio for N days" preference: audio of fully processed recaps older than N days
 * is removed; transcripts and recaps are untouched. No-op when retention is "forever".
 * Returns the number of recaps whose audio was removed.
 */
export async function applyAudioRetention(now = Date.now()): Promise<number> {
  const days = await getAudioRetentionDays();
  if (days === null) return 0;
  const cutoff = now - days * DAY_MS;
  let removed = 0;
  for (const recap of await recapsRepo.listByStatuses(['ready', 'transcribed'])) {
    const finishedAt = recap.endedAt ?? recap.startedAt;
    if (finishedAt < cutoff && (await chunksRepo.listChunks(recap.id)).length > 0) {
      await deleteRecapAudio(recap.id);
      removed += 1;
    }
  }
  return removed;
}

/** Privacy: wipe every recording, transcript and recap from this device. */
export async function deleteAllRecordings(): Promise<void> {
  for (const recap of await recapsRepo.pageRecaps({ limit: 10_000 })) {
    await recapsRepo.deleteRecap(recap.id);
  }
  try {
    const root = recapsRoot();
    if (root.exists) root.delete();
  } catch {
    /* nothing on disk */
  }
}
