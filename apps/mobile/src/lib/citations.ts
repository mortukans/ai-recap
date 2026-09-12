/**
 * Parse `[mm:ss]` / `[h:mm:ss]` citations out of assistant text into transcript offsets (seconds),
 * so the UI can render tappable chips that seek the audio/transcript (AI_RECAP_TECHNICAL_ARCHITECTURE.md §12).
 */
export function extractTimestampCitations(text: string): number[] {
  const re = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;
  const out: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const a = Number(match[1] ?? '0');
    const b = Number(match[2] ?? '0');
    const c = match[3] !== undefined ? Number(match[3]) : null;
    const seconds = c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
    if (Number.isFinite(seconds)) out.push(seconds);
  }
  return [...new Set(out)];
}
