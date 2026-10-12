/**
 * Calendar-event repository (beta). Events are derived from recaps by the calendar extractor
 * (features/calendar), never entered by hand, so the engine stays swappable like every other repo.
 */
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDatabase } from '../client';
import { calendarEvents, recaps } from '../schema';

export type CalendarEventType = 'event' | 'deadline' | 'mention';

export interface CalendarEvent {
  id: string;
  recapId: string;
  title: string;
  /** Resolved instant, epoch ms (local midnight for all-day). */
  startAt: number;
  allDay: boolean;
  type: CalendarEventType;
  note: string;
  timestampRef: number | null;
  createdAt: number;
}

type Row = typeof calendarEvents.$inferSelect;

function toDomain(row: Row): CalendarEvent {
  return {
    id: row.id,
    recapId: row.recapId,
    title: row.title,
    startAt: row.startAt,
    allDay: row.allDay,
    type: (row.type as CalendarEventType) ?? 'event',
    note: row.note,
    timestampRef: row.timestampRef,
    createdAt: row.createdAt,
  };
}

/** All events, earliest first (the agenda splits them into past/upcoming itself). */
export async function listEvents(): Promise<CalendarEvent[]> {
  const rows = await getDatabase().select().from(calendarEvents).orderBy(asc(calendarEvents.startAt));
  return rows.map(toDomain);
}

export async function listEventsForRecap(recapId: string): Promise<CalendarEvent[]> {
  const rows = await getDatabase()
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.recapId, recapId))
    .orderBy(asc(calendarEvents.startAt));
  return rows.map(toDomain);
}

/** Replace a recap's events atomically (used by the extractor; a rescan overwrites cleanly). */
export async function replaceEventsForRecap(recapId: string, events: CalendarEvent[]): Promise<void> {
  const db = getDatabase();
  await db.delete(calendarEvents).where(eq(calendarEvents.recapId, recapId));
  if (events.length > 0) await db.insert(calendarEvents).values(events);
}

export async function deleteEvent(id: string): Promise<void> {
  await getDatabase().delete(calendarEvents).where(eq(calendarEvents.id, id));
}

/** Mark a recap scanned (idempotency for the launch-time batch scan), whether or not events were found. */
export async function markScanned(recapId: string, at = Date.now()): Promise<void> {
  await getDatabase().update(recaps).set({ calendarScannedAt: at }).where(eq(recaps.id, recapId));
}

/** Ready recaps never scanned for dates, newest first — the backlog for scanAllRecaps(). */
export async function listUnscannedReadyRecapIds(limit = 50): Promise<string[]> {
  const rows = await getDatabase()
    .select({ id: recaps.id })
    .from(recaps)
    .where(and(eq(recaps.status, 'ready'), isNull(recaps.calendarScannedAt)))
    .orderBy(desc(recaps.startedAt))
    .limit(limit);
  return rows.map((r) => r.id);
}
