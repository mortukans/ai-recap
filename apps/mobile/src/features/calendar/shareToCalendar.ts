/**
 * Add calendar events to the device's built-in calendar by sharing an .ics file (no calendar
 * permission, no native module). iOS/Android show "Add to Calendar" in the share sheet; the event's
 * reminder (if set) travels along as a VALARM. One event → one file; "add all" exports the lot.
 */
import { type IcsEvent, buildIcs } from '@ai-recap/core';
import type { CalendarEvent } from '../../db';
import { exportTextFile, safeFilename } from '../share/shareService';

export const ICS = { mime: 'text/calendar', uti: 'com.apple.ical.ics' };

function toIcs(ev: CalendarEvent, recapTitle?: string): IcsEvent {
  const description = [ev.note, recapTitle ? `From recap: ${recapTitle}` : ''].filter(Boolean).join('\n');
  return {
    uid: `${ev.id}@airecap`,
    title: ev.title,
    startAt: ev.startAt,
    allDay: ev.allDay,
    description: description || undefined,
    reminderMinutes: ev.reminderMinutes,
  };
}

/** Share one event as an .ics so the user can add it (with its reminder) to their calendar. */
export async function shareEventToCalendar(ev: CalendarEvent, recapTitle?: string): Promise<void> {
  const ics = buildIcs([toIcs(ev, recapTitle)]);
  await exportTextFile(`${safeFilename(ev.title, 'event')}.ics`, ics, ICS.mime, ICS.uti);
}

/** Share several events as a single .ics (e.g. everything from one recap). */
export async function shareEventsToCalendar(events: CalendarEvent[], titles: Record<string, string> = {}, filename = 'calendar'): Promise<void> {
  if (events.length === 0) return;
  const ics = buildIcs(events.map((e) => toIcs(e, titles[e.recapId])));
  await exportTextFile(`${safeFilename(filename)}.ics`, ics, ICS.mime, ICS.uti);
}
