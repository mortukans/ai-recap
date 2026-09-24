/**
 * Long single-file recordings (Apple Watch hands over one .m4a) are split into ≤ 60 s chunks before
 * transcription, so every provider gets the same short requests as phone recordings. One 9-minute
 * request to an audio LLM tends to come back truncated or empty; sixty-second ones do not.
 * Idempotent: chunks already short enough are left alone. Never deletes audio before its parts exist.
 */
import type { AudioChunk } from '@ai-recap/core';
import { Recorder } from '@ai-recap/recorder';
import { File, Paths } from 'expo-file-system';

import { chunksRepo } from '../../db';
import { newId } from '../../lib/ids';
import { chunkUri } from './audioUri';

export const MAX_CHUNK_SECONDS = 60;
/** Chunks up to this length are accepted as-is (the recorder's own chunks can run slightly over). */
const TOLERANCE_SECONDS = 90;

/** Returns the number of chunks that were split. */
export async function ensureShortChunks(recapId: string, maxSeconds = MAX_CHUNK_SECONDS): Promise<number> {
  const chunks = await chunksRepo.listChunks(recapId);
  if (!chunks.some((c) => c.duration > TOLERANCE_SECONDS)) return 0;

  const next: AudioChunk[] = [];
  const toDelete: string[] = [];
  let split = 0;
  for (const chunk of chunks) {
    if (chunk.duration <= TOLERANCE_SECONDS) {
      next.push(chunk);
      continue;
    }
    const parts = await Recorder.splitAudioFile(chunkUri(recapId, chunk.relativePath), maxSeconds);
    if (parts.length < 2) {
      next.push(chunk); // could not split (old native build, corrupt file) — keep the original
      continue;
    }
    const dir = chunk.relativePath.includes('/') ? chunk.relativePath.slice(0, chunk.relativePath.lastIndexOf('/') + 1) : '';
    let offset = chunk.startOffset;
    for (const part of parts) {
      next.push({
        id: newId(),
        recapId,
        index: 0, // renumbered below
        relativePath: dir + part.fileName,
        startOffset: offset,
        duration: part.duration,
        byteSize: part.byteSize,
        uploadStatus: 'local',
      });
      offset += part.duration;
    }
    toDelete.push(chunk.relativePath);
    split += 1;
  }
  if (split === 0) return 0;

  next.sort((a, b) => a.startOffset - b.startOffset);
  next.forEach((c, i) => {
    c.index = i + 1;
  });
  await chunksRepo.replaceChunks(recapId, next);
  await rewriteManifest(recapId, next);
  for (const rel of toDelete) {
    try {
      const f = new File(chunkUri(recapId, rel));
      if (f.exists) f.delete();
    } catch {
      /* the original may stay; it is no longer referenced */
    }
  }
  return split;
}

/** Keep manifest.json in step, otherwise a later reconcile would re-add the long chunk. */
async function rewriteManifest(recapId: string, chunks: AudioChunk[]): Promise<void> {
  try {
    const file = new File(Paths.document, 'Recaps', recapId, 'manifest.json');
    let parsed: Record<string, unknown> = {};
    if (file.exists) {
      try {
        parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
    }
    parsed.chunks = chunks.map((c) => ({
      index: c.index,
      relativePath: c.relativePath,
      startOffset: c.startOffset,
      duration: c.duration,
      byteSize: c.byteSize,
    }));
    file.write(JSON.stringify(parsed, null, 2));
  } catch {
    /* non-fatal: the DB rows are authoritative for playback and transcription */
  }
}
