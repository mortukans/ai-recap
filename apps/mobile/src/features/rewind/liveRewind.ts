/**
 * Live Rewind (beta). A rolling audio buffer: while "listening", the mic stays on and we keep only the
 * most recent ~60 seconds of audio. At any moment the user can "rewind" — turn that last minute into a
 * normal recap (transcript + recap) — so a thing someone just said isn't lost even though you weren't
 * recording.
 *
 * Built entirely on the existing native recorder (continuous AAC chunks + background audio) with NO
 * native changes: we record into a throwaway buffer id, drop chunk files older than the window as they
 * close, and on capture promote the surviving chunks into a real recap with re-based timestamps.
 */
import { Recorder } from '@ai-recap/recorder';
import { File } from 'expo-file-system';

import { chunksRepo, recapsRepo } from '../../db';
import { newId } from '../../lib/ids';
import { getDefaultContextId } from '../../lib/prefs';
import { processingCoordinator } from '../../processing/coordinator';
import { chunkUri } from '../recap/audioUri';
import { deleteRecapCompletely } from '../recap/deleteRecap';

/** Keep a little over a minute so a full 60 s is always available once the buffer has filled. */
const WINDOW_SECONDS = 60;
/** 10 s chunks: ~6–7 per captured minute, so playback has few chunk transitions (smoother, and fewer
 * of the item swaps that playback has to handle) while pruning stays reasonably precise (±10 s). */
const CHUNK_SECONDS = 10;

interface Buffered {
  relativePath: string;
  startOffset: number;
  duration: number;
  byteSize: number;
}

let active = false;
let bufferId: string | null = null;
let buffer: Buffered[] = [];
let subs: { remove: () => void }[] = [];
let lastLevel = 0;

const listeners = new Set<() => void>();
function notify(): void {
  for (const l of listeners) l();
}
/** Subscribe to Live Rewind state changes (returns an unsubscribe). */
export function onRewindChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isRewindActive(): boolean {
  return active;
}

/** Snapshot for the UI: whether listening, how much audio is buffered (0…60 s shown), and the live level. */
export function rewindState(): { active: boolean; bufferedSeconds: number; level: number } {
  const buffered = buffer.reduce((s, c) => s + c.duration, 0);
  return { active, bufferedSeconds: Math.min(60, buffered), level: active ? lastLevel : 0 };
}

function deleteFile(relativePath: string): void {
  if (!bufferId) return;
  try {
    const f = new File(chunkUri(bufferId, relativePath));
    if (f.exists) f.delete();
  } catch {
    /* best-effort */
  }
}

/** Drop whole chunks older than the window, deleting their files, so storage + memory stay bounded. */
function prune(): void {
  let total = buffer.reduce((s, c) => s + c.duration, 0);
  while (buffer.length > 1 && total - buffer[0].duration >= WINDOW_SECONDS) {
    const old = buffer.shift();
    if (!old) break;
    total -= old.duration;
    deleteFile(old.relativePath);
  }
}

/** Begin listening (mic on). Returns false if microphone permission was denied. */
export async function startRewind(): Promise<boolean> {
  if (active) return true;
  const granted = await Recorder.requestPermission();
  if (!granted) return false;
  bufferId = `rewind-${newId()}`;
  buffer = [];
  lastLevel = 0;
  subs = [
    Recorder.addListener('level', ({ level }) => {
      lastLevel = level;
      notify();
    }),
    Recorder.addListener('chunkClosed', (chunk) => {
      buffer.push({ relativePath: chunk.relativePath, startOffset: chunk.startOffset, duration: chunk.duration, byteSize: chunk.byteSize });
      prune();
      notify();
    }),
  ];
  try {
    await Recorder.start(bufferId, { chunkSeconds: CHUNK_SECONDS });
  } catch {
    await teardown(true);
    return false;
  }
  active = true;
  notify();
  return true;
}

async function teardown(deleteDir: boolean): Promise<void> {
  const id = bufferId;
  active = false;
  for (const s of subs) s.remove();
  subs = [];
  await Recorder.finish().catch(() => undefined);
  if (deleteDir && id) await deleteRecapCompletely(id).catch(() => undefined); // removes the throwaway audio folder
  buffer = [];
  bufferId = null;
  lastLevel = 0;
  notify();
}

/** Stop listening and discard the buffer (nothing is saved). */
export async function stopRewind(): Promise<void> {
  if (!active && !bufferId) return;
  await teardown(true);
}

/**
 * Save the last ~60 s as a recap and start processing it. Waits briefly for the final partial chunk so
 * the most recent words (the whole point) are included, then promotes the surviving chunks into a recap
 * with timestamps re-based to 0. Returns the new recap id, or null if there was nothing buffered.
 */
export async function captureRewind(): Promise<string | null> {
  if (!active || !bufferId) return null;
  const id = bufferId;
  active = false;
  for (const s of subs) s.remove();
  subs = [];

  // The recorder closes the current chunk on finish() and emits one last chunkClosed asynchronously —
  // wait for it (bounded) so we don't drop the final few seconds.
  const flushed = new Promise<void>((resolve) => {
    const sub = Recorder.addListener('chunkClosed', (chunk) => {
      buffer.push({ relativePath: chunk.relativePath, startOffset: chunk.startOffset, duration: chunk.duration, byteSize: chunk.byteSize });
      sub.remove();
      resolve();
    });
    setTimeout(() => {
      sub.remove();
      resolve();
    }, 700);
  });
  await Recorder.finish().catch(() => undefined);
  await flushed;
  prune();

  const kept = buffer.slice();
  buffer = [];
  bufferId = null;
  lastLevel = 0;
  notify();

  if (kept.length === 0) {
    await deleteRecapCompletely(id).catch(() => undefined);
    return null;
  }

  const now = Date.now();
  const totalDuration = kept.reduce((s, c) => s + c.duration, 0);
  await recapsRepo.createRecap({
    id,
    title: '',
    startedAt: now,
    endedAt: now,
    durationSeconds: totalDuration,
    detectedLanguages: [],
    status: 'recorded',
    presetId: null,
    contextId: await getDefaultContextId(),
    createdAt: now,
    updatedAt: now,
  });
  let offset = 0;
  for (let i = 0; i < kept.length; i++) {
    const c = kept[i];
    if (!c) continue;
    await chunksRepo.addChunk({
      id: newId(),
      recapId: id,
      index: i + 1,
      relativePath: c.relativePath,
      startOffset: offset, // re-based: the captured minute reads as 0…60 s, not its position in the buffer
      duration: c.duration,
      byteSize: c.byteSize,
      uploadStatus: 'local',
    });
    offset += c.duration;
  }
  await processingCoordinator.enqueue(id); // transcribe → recap, same pipeline as a normal recording
  return id;
}
