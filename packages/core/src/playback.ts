/**
 * Playback position math for chunked recordings (Arch §4: one m4a per ~60 s chunk).
 * Absolute seconds ↔ (chunk index, offset within that chunk).
 */

export interface ChunkPosition {
  /** Index into the chunk array (0-based, in playback order). */
  index: number;
  /** Seconds from the start of that chunk. */
  offset: number;
}

/**
 * Locate an absolute position inside an ordered list of chunk durations.
 * Positions past the end clamp into the last chunk, slightly before its end so playback can start.
 */
export function locateInChunks(durations: readonly number[], seconds: number, endMargin = 0.25): ChunkPosition {
  if (durations.length === 0) return { index: 0, offset: 0 };
  let remaining = Math.max(0, seconds);
  let index = 0;
  while (index < durations.length - 1 && remaining >= (durations[index] ?? 0)) {
    remaining -= durations[index] ?? 0;
    index += 1;
  }
  const last = durations[index] ?? 0;
  const offset = Math.min(remaining, Math.max(0, last - endMargin));
  return { index, offset };
}

/** Absolute position for (chunk index, offset) — the inverse of `locateInChunks`. */
export function absoluteSeconds(durations: readonly number[], index: number, offset: number): number {
  let total = 0;
  for (let i = 0; i < Math.min(index, durations.length); i += 1) total += durations[i] ?? 0;
  return total + Math.max(0, offset);
}
