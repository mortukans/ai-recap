import { File, Paths } from 'expo-file-system';
import { chunksRepo } from '../../db';
import { newId } from '../../lib/ids';

interface ManifestChunk {
  index: number;
  relativePath: string;
  startOffset?: number;
  duration?: number;
  byteSize?: number;
}

/**
 * Reconcile a recap's audio chunks from the native recorder's manifest.json (written to
 * Documents/Recaps/<id>/). This is the source of truth and avoids losing the final chunk's
 * async event on finish. Waits briefly for the manifest to include all expected chunks.
 * Returns the total recorded duration in seconds.
 */
export async function reconcileChunksFromManifest(recapId: string, expectedCount: number): Promise<number> {
  for (let attempt = 0; attempt < 15; attempt++) {
    let chunks: ManifestChunk[] = [];
    try {
      const file = new File(Paths.document, 'Recaps', recapId, 'manifest.json');
      if (file.exists) {
        const parsed = JSON.parse(await file.text()) as { chunks?: ManifestChunk[] };
        chunks = Array.isArray(parsed.chunks) ? parsed.chunks : [];
      }
    } catch {
      chunks = [];
    }

    const enough = chunks.length >= expectedCount;
    if (enough || attempt === 14) {
      const existing = await chunksRepo.listChunks(recapId);
      const haveIndexes = new Set(existing.map((c) => c.index));
      let duration = 0;
      for (const ch of chunks) {
        const start = ch.startOffset ?? 0;
        const dur = ch.duration ?? 0;
        duration = Math.max(duration, start + dur);
        if (!haveIndexes.has(ch.index)) {
          await chunksRepo.addChunk({
            id: newId(),
            recapId,
            index: ch.index,
            relativePath: ch.relativePath,
            startOffset: start,
            duration: dur,
            byteSize: ch.byteSize ?? 0,
            uploadStatus: 'local',
          });
        }
      }
      return duration;
    }

    await new Promise((r) => setTimeout(r, 120));
  }
  return 0;
}
