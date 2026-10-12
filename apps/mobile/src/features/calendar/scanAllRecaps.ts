/**
 * Launch-time calendar backfill (beta). Scans ready recaps that have never been scanned for dates and
 * populates the calendar, so a tester who opens the app during the test period already sees their past
 * commitments and upcoming appointments without lifting a finger.
 *
 * Design: idempotent (each recap is marked scanned), sequential (one LLM call at a time — never hammer
 * the provider), capped per launch (the rest are picked up next launch), and a no-op when no LLM route
 * is available. Safe to call unawaited from bootstrap.
 */
import { calendarRepo } from '../../db';
import { extractCalendarEvents } from './extractCalendarEvents';

let running = false;

export interface ScanSummary {
  recapsScanned: number;
  eventsAdded: number;
}

/**
 * Scan up to `maxPerRun` unscanned ready recaps. Stops early if a scan reports no LLM route (nothing
 * can be scanned yet), leaving the backlog for a later launch once the user adds a key / goes Unlimited.
 */
export async function scanAllRecapsForDates(maxPerRun = 25, signal?: AbortSignal): Promise<ScanSummary> {
  const summary: ScanSummary = { recapsScanned: 0, eventsAdded: 0 };
  if (running) return summary; // guard against overlapping runs (bootstrap + manual trigger)
  running = true;
  try {
    const ids = await calendarRepo.listUnscannedReadyRecapIds(maxPerRun);
    for (const id of ids) {
      if (signal?.aborted) break;
      const { count, scanned } = await extractCalendarEvents(id, { signal });
      if (!scanned) break; // no LLM route (or transient error) — try again next launch
      summary.recapsScanned += 1;
      summary.eventsAdded += count;
    }
  } catch {
    /* best-effort backfill; never surfaces to the UI */
  } finally {
    running = false;
  }
  return summary;
}
