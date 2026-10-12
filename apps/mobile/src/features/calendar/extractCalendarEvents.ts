/**
 * Calendar extraction (beta). Turns one recap into concrete calendar events: appointments, deadlines
 * and dated references. The key job is resolving *relative* dates ("next Tuesday", "in two weeks",
 * "the 15th") to absolute dates — the main recap prompt has no date anchor, so we do it here against
 * the recap's own `startedAt`. Events are stored via calendarRepo; the recap is marked scanned so the
 * launch-time batch scan is idempotent.
 */
import {
  type RecapDocument,
  parseRecapDocument,
} from '@ai-recap/core';
import { DEFAULT_SUMMARY_MODEL, resolveLLMRoute } from '../../ai';
import { artifactsRepo, calendarRepo, recapsRepo, segmentsRepo } from '../../db';
import type { CalendarEvent } from '../../db';
import { newId } from '../../lib/ids';
import { getSummaryModel } from '../../lib/prefs';
import { asEventType, toInstant } from './resolveDate';

const EXTRACT_SYSTEM = [
  'You extract calendar events from a meeting recap for a personal calendar.',
  'You are given the date the meeting was RECORDED. Resolve every relative date to an absolute',
  'calendar date against that recording date: "today" = the recording date, "tomorrow" = +1 day,',
  '"next Tuesday", "this Friday", "in two weeks", "end of the month", "the 15th" — all become a',
  'concrete YYYY-MM-DD. Prefer the nearest sensible future date when a weekday is named without a year.',
  'Include only CONCRETE dated things: appointments, meetings, calls, trips, deadlines, due dates,',
  'birthdays, renewals, payments, and explicit dated references. Skip vague mentions with no resolvable',
  'date ("sometime soon", "later"), and skip durations that are not a point in time.',
  'Classify each as "event" (something happening at a time), "deadline" (something due by a date), or',
  '"mention" (a date referenced but not an appointment or deadline).',
  'Each title is a short noun phrase (max 8 words) in the language it was said in — e.g. "Dentist',
  'appointment", "Projekta deadline", "Flight to Riga". Never invent events that were not mentioned.',
  'Respond with ONLY a JSON object matching the provided schema. No markdown, no prose outside JSON.',
].join(' ');

const EXTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['events'],
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'date', 'time', 'type', 'note', 'timestampRef'],
        properties: {
          title: { type: 'string' },
          date: { type: 'string', description: 'Absolute date, YYYY-MM-DD' },
          time: { type: ['string', 'null'], description: '24h HH:MM when a specific time was said, else null' },
          type: { type: 'string', enum: ['event', 'deadline', 'mention'] },
          note: { type: 'string', description: 'Optional short detail, may be empty' },
          timestampRef: { type: ['number', 'null'], description: 'Transcript second where mentioned, else null' },
        },
      },
    },
  },
} as const;

interface RawEvent {
  title?: unknown;
  date?: unknown;
  time?: unknown;
  type?: unknown;
  note?: unknown;
  timestampRef?: unknown;
}

/** Compact, distilled input for the model: the recap's structured facts (cheaper than the transcript). */
function renderDocInput(doc: RecapDocument): string {
  const parts: string[] = [];
  if (doc.summary) parts.push(`Summary:\n${doc.summary}`);
  if (doc.importantDates.length > 0) {
    parts.push(
      `Important dates mentioned:\n${doc.importantDates
        .map((d) => `- ${d.text}${d.date ? ` (${d.date})` : ''}${d.timestampRefs[0] != null ? ` [@${Math.round(d.timestampRefs[0])}s]` : ''}`)
        .join('\n')}`,
    );
  }
  if (doc.actionItems.length > 0) {
    parts.push(
      `Action items (may carry deadlines):\n${doc.actionItems
        .map((a) => `- ${a.task}${a.owner ? ` (${a.owner})` : ''}${a.deadline ? ` — due ${a.deadline}` : ''}${a.timestampRefs[0] != null ? ` [@${Math.round(a.timestampRefs[0])}s]` : ''}`)
        .join('\n')}`,
    );
  }
  if (doc.decisions.length > 0) {
    parts.push(`Decisions:\n${doc.decisions.map((d) => `- ${d.text}`).join('\n')}`);
  }
  return parts.join('\n\n');
}

function latestDoc(contents: string[]): RecapDocument | null {
  for (const content of contents) {
    try {
      const doc = parseRecapDocument(JSON.parse(content));
      if (doc) return doc;
    } catch {
      /* skip malformed */
    }
  }
  return null;
}

export interface ExtractResult {
  /** Number of events written. */
  count: number;
  /** False when no LLM route was available (recap left unscanned so it retries later). */
  scanned: boolean;
}

/**
 * Extract and persist calendar events for one recap. Idempotent: replaces any existing events for the
 * recap and marks it scanned. Never throws for an LLM/parse failure — returns a zero result instead so
 * the batch scan keeps going; marks the recap scanned so a genuine "no dates" result isn't retried.
 */
export async function extractCalendarEvents(recapId: string, opts?: { signal?: AbortSignal }): Promise<ExtractResult> {
  const recap = await recapsRepo.getRecap(recapId);
  if (!recap) return { count: 0, scanned: false };

  const route = await resolveLLMRoute((await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
  if (!route) return { count: 0, scanned: false }; // no key / not Unlimited — leave unscanned, retry later

  // Prefer the already-distilled recap document; fall back to the raw transcript when there's no summary.
  const summaries = (await artifactsRepo.listArtifacts(recapId)).filter((a) => a.type === 'summary');
  const doc = latestDoc(summaries.map((a) => a.content));
  let body: string;
  if (doc) {
    body = renderDocInput(doc);
  } else {
    const segments = await segmentsRepo.listSegments(recapId);
    body = segments.map((s) => s.text).join(' ').slice(0, 8000);
  }
  if (!body.trim()) {
    await calendarRepo.replaceEventsForRecap(recapId, []);
    await calendarRepo.markScanned(recapId);
    return { count: 0, scanned: true };
  }

  const recordedOn = new Date(recap.startedAt);
  const weekday = (() => {
    try {
      return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(recordedOn);
    } catch {
      return '';
    }
  })();
  const iso = `${recordedOn.getFullYear()}-${String(recordedOn.getMonth() + 1).padStart(2, '0')}-${String(recordedOn.getDate()).padStart(2, '0')}`;
  const userMsg = [
    `Recording date: ${weekday ? `${weekday}, ` : ''}${iso}`,
    recap.title ? `Meeting: ${recap.title}` : '',
    '',
    body,
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n');

  let text: string;
  try {
    const result = await route.provider.generate({
      model: route.model,
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM },
        { role: 'user', content: userMsg },
      ],
      responseJsonSchema: EXTRACT_SCHEMA,
      temperature: 0.1,
      signal: opts?.signal,
    });
    text = result.text;
  } catch {
    return { count: 0, scanned: false }; // network/model error — retry on a later launch
  }

  let rawEvents: RawEvent[] = [];
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    const json = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
    const parsed = JSON.parse(json) as { events?: unknown };
    if (Array.isArray(parsed.events)) rawEvents = parsed.events as RawEvent[];
  } catch {
    // Malformed JSON: treat as "scanned, nothing found" rather than retrying forever.
    await calendarRepo.replaceEventsForRecap(recapId, []);
    await calendarRepo.markScanned(recapId);
    return { count: 0, scanned: true };
  }

  const now = Date.now();
  const seen = new Set<string>();
  const events: CalendarEvent[] = [];
  for (const raw of rawEvents) {
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!title) continue;
    const instant = toInstant(raw.date, raw.time);
    if (!instant) continue;
    const key = `${title.toLowerCase()}|${instant.startAt}`;
    if (seen.has(key)) continue; // de-dupe repeated mentions of the same thing
    seen.add(key);
    events.push({
      id: newId(),
      recapId,
      title: title.slice(0, 140),
      startAt: instant.startAt,
      allDay: instant.allDay,
      type: asEventType(raw.type),
      note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 280) : '',
      timestampRef: typeof raw.timestampRef === 'number' && Number.isFinite(raw.timestampRef) ? raw.timestampRef : null,
      createdAt: now,
    });
  }

  await calendarRepo.replaceEventsForRecap(recapId, events);
  await calendarRepo.markScanned(recapId);
  return { count: events.length, scanned: true };
}
