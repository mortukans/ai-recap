/**
 * The structured recap the LLM must return (AI_RECAP_TECHNICAL_ARCHITECTURE.md §12, Product Plan §12).
 * We prefer JSON over free-form markdown for predictable UI, export, search, and timestamp citations.
 *
 * `timestampRefs` are transcript offsets in **seconds** so the UI can render [mm:ss] chips that seek
 * the audio/transcript.
 */

export interface Decision {
  text: string;
  timestampRefs: number[];
}

export interface ActionItem {
  owner: string | null;
  task: string;
  /** ISO date string (YYYY-MM-DD) when present, else null. */
  deadline: string | null;
  timestampRefs: number[];
}

export interface DatedItem {
  text: string;
  /** ISO date string (YYYY-MM-DD) when present, else null. */
  date: string | null;
  timestampRefs: number[];
}

export interface RecapDocument {
  title: string;
  summary: string;
  decisions: Decision[];
  actionItems: ActionItem[];
  importantDates: DatedItem[];
  openQuestions: string[];
  topics: string[];
}

/**
 * JSON Schema for `response_format` / structured-output requests. Kept in sync with `RecapDocument`.
 * Models that lack strict JSON mode still receive this in the prompt; the tolerant parser
 * (see `parseRecapDocument`) is the safety net.
 */
export const RECAP_DOCUMENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'decisions', 'actionItems', 'importantDates', 'openQuestions', 'topics'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'timestampRefs'],
        properties: {
          text: { type: 'string' },
          timestampRefs: { type: 'array', items: { type: 'number' } },
        },
      },
    },
    actionItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['owner', 'task', 'deadline', 'timestampRefs'],
        properties: {
          owner: { type: ['string', 'null'] },
          task: { type: 'string' },
          deadline: { type: ['string', 'null'] },
          timestampRefs: { type: 'array', items: { type: 'number' } },
        },
      },
    },
    importantDates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'date', 'timestampRefs'],
        properties: {
          text: { type: 'string' },
          date: { type: ['string', 'null'] },
          timestampRefs: { type: 'array', items: { type: 'number' } },
        },
      },
    },
    openQuestions: { type: 'array', items: { type: 'string' } },
    topics: { type: 'array', items: { type: 'string' } },
  },
} as const;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Tolerant coercion of raw model output into a valid `RecapDocument`.
 * Never throws: missing/malformed fields degrade to empty defaults so the UI always has something to
 * render. Returns `null` only when the input is not object-shaped at all (caller may then repair-retry).
 */
export function parseRecapDocument(raw: unknown): RecapDocument | null {
  if (!isRecord(raw)) return null;

  const decisions: Decision[] = Array.isArray(raw.decisions)
    ? raw.decisions.filter(isRecord).map((d) => ({
        text: asString(d.text),
        timestampRefs: asNumberArray(d.timestampRefs),
      }))
    : [];

  const actionItems: ActionItem[] = Array.isArray(raw.actionItems)
    ? raw.actionItems.filter(isRecord).map((a) => ({
        owner: asNullableString(a.owner),
        task: asString(a.task),
        deadline: asNullableString(a.deadline),
        timestampRefs: asNumberArray(a.timestampRefs),
      }))
    : [];

  const importantDates: DatedItem[] = Array.isArray(raw.importantDates)
    ? raw.importantDates.filter(isRecord).map((d) => ({
        text: asString(d.text),
        date: asNullableString(d.date),
        timestampRefs: asNumberArray(d.timestampRefs),
      }))
    : [];

  return {
    title: asString(raw.title),
    summary: asString(raw.summary),
    decisions,
    actionItems,
    importantDates,
    openQuestions: asStringArray(raw.openQuestions),
    topics: asStringArray(raw.topics),
  };
}
