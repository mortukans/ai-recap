/**
 * Add a recap date to the device's built-in calendar through Apple's native event editor
 * (EventKitUI's EKEventEditViewController, surfaced by expo-calendar). The user sees the system
 * "New Event" sheet pre-filled, picks the calendar, and taps Add — no in-app calendar read access
 * (write-only, iOS 17+). This replaces the old .ics-share flow, which the OS never offered "Add to
 * Calendar" for (it forced an email-to-self detour).
 *
 * The module is loaded lazily and guarded: on a build that predates the native module (or any failure)
 * we fall back to sharing an .ics so the action still does something.
 */
import type { CalendarEvent } from '../../db';
import { shareEventToCalendar } from './shareToCalendar';

export type AddToCalendarResult = 'added' | 'canceled' | 'shared';

/** Minutes-before (our model) → an EventKit alarm offset (negative = before the start). */
function alarmsFor(reminderMinutes: number | null): { relativeOffset: number }[] | undefined {
  if (reminderMinutes === null || reminderMinutes === undefined) return undefined;
  return [{ relativeOffset: -Math.abs(reminderMinutes) }];
}

export async function addEventToDeviceCalendar(ev: CalendarEvent, recapTitle?: string): Promise<AddToCalendarResult> {
  try {
    // Lazy, typed require (same pattern as the Live Activity facade): only a native build that bundled
    // expo-calendar has this; otherwise the require/throws and we fall back below.
    const Calendar = require('expo-calendar/legacy') as typeof import('expo-calendar/legacy');
    const description = [ev.note, recapTitle ? `From recap: ${recapTitle}` : ''].filter(Boolean).join('\n');
    const result = await Calendar.createEventInCalendarAsync({
      title: ev.title,
      startDate: new Date(ev.startAt),
      // All-day spans one day; timed events default to a 1-hour block in the editor (the user can adjust).
      endDate: new Date(ev.allDay ? ev.startAt + 86_400_000 : ev.startAt + 60 * 60_000),
      allDay: ev.allDay,
      notes: description || undefined,
      alarms: alarmsFor(ev.reminderMinutes),
    });
    if (result?.action === 'saved' || result?.id != null) return 'added';
    return 'canceled'; // 'canceled' or iOS 'done' (closed without saving)
  } catch {
    // No native module (older build) or the editor failed — share an .ics as a fallback.
    await shareEventToCalendar(ev, recapTitle).catch(() => undefined);
    return 'shared';
  }
}
