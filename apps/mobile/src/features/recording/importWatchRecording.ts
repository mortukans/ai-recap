/**
 * Register recordings captured on the Apple Watch as recaps. The native WatchBridge has already
 * moved the audio into Documents/Recaps/<id>/chunks/ and written manifest.json + watch.json; here we
 * create the DB row (idempotent), persist the chunk, and queue transcription → recap.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { recapsRepo } from '../../db';
import { getDefaultContextId } from '../../lib/prefs';
import { processingCoordinator } from '../../processing/coordinator';
import { reconcileChunksFromManifest } from '../recap/manifest';

export interface WatchRecordingMarker {
  recapId: string;
  startedAt: number;
  durationSeconds: number;
}

export async function importWatchRecording(marker: WatchRecordingMarker): Promise<void> {
  const { recapId } = marker;
  if (!recapId) return;
  try {
    if (!(await recapsRepo.getRecap(recapId))) {
      const startedAt = Number.isFinite(marker.startedAt) && marker.startedAt > 0 ? marker.startedAt : Date.now();
      const duration = Math.max(0, marker.durationSeconds || 0);
      const now = Date.now();
      await recapsRepo.createRecap({
        id: recapId,
        title: '',
        startedAt,
        endedAt: startedAt + duration * 1000,
        durationSeconds: duration,
        detectedLanguages: [],
        status: 'recorded',
        presetId: null,
        contextId: await getDefaultContextId(),
        createdAt: now,
        updatedAt: now,
      });
    }
    const manifestDuration = await reconcileChunksFromManifest(recapId, 1);
    if (manifestDuration > (marker.durationSeconds || 0)) {
      await recapsRepo.updateRecap(recapId, { durationSeconds: manifestDuration });
    }
    // Marker consumed: a future launch must not re-import.
    try {
      const m = new File(Paths.document, 'Recaps', recapId, 'watch.json');
      if (m.exists) m.delete();
    } catch {
      /* ignore */
    }
    void processingCoordinator.enqueue(recapId);
  } catch (e) {
    console.warn('[watch] import failed:', String(e));
  }
}

/** Launch/foreground sweep: import watch recordings that arrived while the app was closed. */
export async function importPendingWatchRecordings(): Promise<number> {
  let count = 0;
  try {
    const root = new Directory(Paths.document, 'Recaps');
    if (!root.exists) return 0;
    for (const entry of root.list()) {
      if (entry instanceof File) continue;
      const marker = new File(entry, 'watch.json');
      if (!marker.exists) continue;
      try {
        const parsed = JSON.parse(await marker.text()) as Partial<WatchRecordingMarker>;
        if (parsed.recapId) {
          await importWatchRecording({
            recapId: parsed.recapId,
            startedAt: Number(parsed.startedAt ?? 0),
            durationSeconds: Number(parsed.durationSeconds ?? 0),
          });
          count += 1;
        }
      } catch {
        /* malformed marker — skip */
      }
    }
  } catch {
    /* storage unavailable */
  }
  return count;
}
