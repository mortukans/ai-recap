/**
 * Provisional recap names. The real title comes from the recap model; until then (or when no LLM is
 * available on the Free plan) we name the recap after the first words spoken.
 */
const FILLERS = new Set([
  'nu', 'ok', 'okay', 'tā', 'tad', 'labi', 'jā', 'nē', 'um', 'uh', 'so', 'yes', 'no', 'hello', 'hi', 'sveiki', 'čau', 'paldies',
]);

/** First meaningful words of the transcript, trimmed to `maxWords` and `maxChars`, or '' when there is no speech. */
export function titleFromTranscript(texts: readonly string[], maxWords = 7, maxChars = 48): string {
  const words = texts
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0);
  let start = 0;
  while (start < words.length && FILLERS.has(words[start]!.toLowerCase().replace(/[.,!?…]+$/g, ''))) start += 1;
  const picked = words.slice(start, start + maxWords);
  if (picked.length === 0) return '';
  let title = picked.join(' ').replace(/[.,;:!?…]+$/g, '');
  if (title.length > maxChars) {
    title = title.slice(0, maxChars).replace(/\s+\S*$/, '');
    title += '…';
  } else if (picked.length < words.length - start) {
    title += '…';
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}
