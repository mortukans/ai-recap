/**
 * Resumable transcription cache. Each successfully transcribed chunk is persisted (keyed by recap +
 * chunk index) so an interrupted transcription — the app suspended, killed, or force-stopped mid-way,
 * or a very long recording — continues where it left off instead of restarting. Kept in AsyncStorage
 * (no DB migration); it holds transcript text for one in-flight recap and is cleared once the recap
 * transcribes fully. Failed chunks are NOT cached, so a retry re-attempts them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TranscriptionResultSegment } from '../../ai/types';

const PREFIX = 'airecap.pref.transcriptResume.';

export interface ChunkResult {
  language: string | null;
  segments: TranscriptionResultSegment[]; // already offset onto the recap timeline
}

export interface ResumeState {
  /** Which model produced the cache; a different model discards it (a fresh transcript). */
  model: string;
  /** Successful chunk index → its result. Failed chunks are absent and get re-attempted. */
  chunks: Record<number, ChunkResult>;
}

function empty(model: string): ResumeState {
  return { model, chunks: {} };
}

/** Load the cache for this recap+model, or an empty one (also when the stored model differs). */
export async function loadResume(recapId: string, model: string): Promise<ResumeState> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + recapId);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ResumeState>;
      if (p && p.model === model && p.chunks && typeof p.chunks === 'object') {
        return { model, chunks: p.chunks as Record<number, ChunkResult> };
      }
    }
  } catch {
    /* corrupt/absent → fresh */
  }
  return empty(model);
}

export async function saveResume(recapId: string, state: ResumeState): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + recapId, JSON.stringify(state));
  } catch {
    /* non-fatal: worst case we re-transcribe a chunk */
  }
}

export async function clearResume(recapId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + recapId);
  } catch {
    /* non-fatal */
  }
}

/** Count of chunks already cached (for a "resuming N/M" style log or UI, if wanted). */
export function resumedCount(state: ResumeState): number {
  return Object.keys(state.chunks).length;
}
