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

/**
 * Share one event as an .ics so the user can add it (with its reminder) to their calendar. This is the
 * fallback for addEventToDeviceCalendar() when the native calendar module isn't present.
 */
export async function shareEventToCalendar(ev: CalendarEvent, recapTitle?: string): Promise<void> {
  const ics = buildIcs([toIcs(ev, recapTitle)]);
  await exportTextFile(`${safeFilename(ev.title, 'event')}.ics`, ics, ICS.mime, ICS.uti);
}
