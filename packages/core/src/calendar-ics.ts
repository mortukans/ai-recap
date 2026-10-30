/**
 * iCalendar (.ics, RFC 5545) generation so a recap's dates can be added to the device's built-in
 * calendar via the share sheet — no calendar permission, no native module. Pure string building; the
 * app writes the result to a file and shares it. All-day events use VALUE=DATE with the *local* date
 * components (so they don't drift a day across time zones); timed events use a UTC instant.
 */

export interface IcsEvent {
  /** Stable unique id (recap/event id is fine). */
  uid: string;
  title: string;
  /** Resolved instant, epoch ms. */
  startAt: number;
  allDay: boolean;
  /** Optional details (note, source recap). */
  description?: string;
  /** Minutes before the event to alert; null/undefined = no alarm, 0 = at the time of the event. */
  reminderMinutes?: number | null;
  /** Length of a timed event in minutes (ignored for all-day). Default 60. */
  durationMinutes?: number;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local YYYYMMDD for all-day values (uses the device's local date). */
function dateValue(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** UTC YYYYMMDDTHHMMSSZ for timed values and DTSTAMP. */
function utcStamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escape a TEXT value per RFC 5545 §3.3.11 (backslash, comma, semicolon, newline). */
function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Fold long content lines to ≤75 octets with a leading space on continuations (RFC 5545 §3.1). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

/** Minutes → an iCalendar DURATION for a negative (before-event) alarm trigger, e.g. 90 → "-PT1H30M". */
function triggerFor(minutes: number): string {
  if (minutes <= 0) return 'PT0S'; // at the time of the event
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  let out = '-P';
  if (days > 0) out += `${days}D`;
  if (hours > 0 || mins > 0) {
    out += 'T';
    if (hours > 0) out += `${hours}H`;
    if (mins > 0) out += `${mins}M`;
  }
  return out;
}

function eventLines(ev: IcsEvent, now: number): string[] {
  const lines: string[] = ['BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${utcStamp(now)}`];
  if (ev.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dateValue(ev.startAt)}`);
    lines.push(`DTEND;VALUE=DATE:${dateValue(ev.startAt + 86_400_000)}`);
  } else {
    const duration = Math.max(1, Math.round(ev.durationMinutes ?? 60));
    lines.push(`DTSTART:${utcStamp(ev.startAt)}`);
    lines.push(`DTEND:${utcStamp(ev.startAt + duration * 60_000)}`);
  }
  lines.push(`SUMMARY:${esc(ev.title)}`);
  if (ev.description && ev.description.trim()) lines.push(`DESCRIPTION:${esc(ev.description.trim())}`);
  if (ev.reminderMinutes !== null && ev.reminderMinutes !== undefined) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(ev.title)}`, `TRIGGER:${triggerFor(ev.reminderMinutes)}`, 'END:VALARM');
  }
  lines.push('END:VEVENT');
  return lines;
}

/** Build a complete VCALENDAR document for one or more events. */
export function buildIcs(events: IcsEvent[], opts: { now?: number } = {}): string {
  const now = opts.now ?? Date.now();
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AI Recap//Calendar//EN', 'CALSCALE:GREGORIAN'];
  for (const ev of events) lines.push(...eventLines(ev, now));
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n');
}
