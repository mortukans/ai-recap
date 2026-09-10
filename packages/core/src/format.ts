/** Small, dependency-free formatting helpers used across UI and exports. */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Seconds → citation timestamp. `[mm:ss]`, or `[h:mm:ss]` past an hour.
 * e.g. 1934 → "32:14", 4520 → "1:15:20".
 */
export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * Seconds → human duration for the library, e.g. 4634 → "1h 17m", 154 → "2m 34s".
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
