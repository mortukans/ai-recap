import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Load the dataset manifest. Each entry references an audio file and a reference transcript
 * (inline `referenceText` or a `reference` file path relative to the manifest).
 */
export function loadDataset(manifestPath) {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const base = dirname(manifestPath);
  return (raw.entries ?? []).map((e) => ({
    id: e.id,
    audioPath: resolve(base, e.audio),
    referenceText: e.referenceText ?? (e.reference ? readFileSync(resolve(base, e.reference), 'utf8') : ''),
    durationSeconds: typeof e.durationSeconds === 'number' ? e.durationSeconds : null,
    language: e.language ?? null,
    speakers: e.speakers ?? null,
  }));
}
