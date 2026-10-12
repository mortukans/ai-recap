/**
 * Pure date coercion for the calendar extractor — kept free of app imports so it is unit-testable.
 * The LLM returns absolute YYYY-MM-DD (+ optional HH:MM); we turn that into a local epoch-ms instant,
 * reject malformed or wildly out-of-range values, and normalise the event type.
 */
export type CalendarEventType = 'event' | 'deadline' | 'mention';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK = /^(\d{1,2}):(\d{2})$/;

/** Parse the model's YYYY-MM-DD (+ optional HH:MM) into a local epoch-ms instant; null if unusable. */
export function toInstant(date: unknown, time: unknown, now = Date.now()): { startAt: number; allDay: boolean } | null {
  if (typeof date !== 'string') return null;
  const m = ISO_DATE.exec(date.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let hours = 0;
  let minutes = 0;
  let allDay = true;
  if (typeof time === 'string') {
    const c = CLOCK.exec(time.trim());
    if (c) {
      const h = Number(c[1]);
      const min = Number(c[2]);
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        hours = h;
        minutes = min;
        allDay = false;
      }
    }
  }

  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  // Reject rollovers (e.g. 2026-02-31 → March) so a nonsense date never becomes a real one.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  // Guard against hallucinated far-off dates (generous window around "now").
  if (d.getTime() < now - 5 * 365 * 86_400_000 || d.getTime() > now + 6 * 365 * 86_400_000) return null;
  return { startAt: d.getTime(), allDay };
}

export function asEventType(v: unknown): CalendarEventType {
  return v === 'deadline' || v === 'mention' ? v : 'event';
}
