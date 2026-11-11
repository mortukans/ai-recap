/**
 * Locale-aware date *labels* for the calendar surfaces (tab + Home "Next up" bar). Separate from the
 * pure day-math in agendaDates.ts because these read i18n/Intl; kept out of test modules so vitest never
 * has to parse the app's i18n chain, and imported (opaque) so the React Compiler allows them in render.
 */
import { longDate } from '../../design/format';
import i18n from '../../i18n';
import { dayDiff } from './agendaDates';

export function locale(): string {
  return i18n.language?.startsWith('lv') ? 'lv-LV' : 'en-GB';
}

export function fmt(ms: number, opts: Intl.DateTimeFormatOptions, fallback = ''): string {
  try {
    return new Intl.DateTimeFormat(locale(), opts).format(new Date(ms));
  } catch {
    return fallback;
  }
}

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const weekdayShort = (ms: number) => fmt(ms, { weekday: 'short' }).replace('.', '').toUpperCase();
export const monthShort = (ms: number) => fmt(ms, { month: 'short' }).replace('.', '').toUpperCase();
/** "Sunday, 15 November" (capitalised), for day-list and card headers. */
export const fullWeekday = (ms: number) => cap(fmt(ms, { weekday: 'long', day: 'numeric', month: 'long' }, longDate(ms)));

/** A YYYY-MM-DD string → "6 November" (year shown only when it isn't the current year). Never ISO. */
export function isoDateLabel(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return cap(fmt(d.getTime(), sameYear ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' }));
}

/** Today / Tomorrow / Yesterday / in N days / N days ago, else a full date. */
export function relativeDay(ms: number, now: number): string {
  const d = dayDiff(ms, now);
  if (d === 0) return i18n.t('calendar.today');
  if (d === 1) return i18n.t('calendar.tomorrow');
  if (d === -1) return i18n.t('calendar.yesterday');
  if (d > 1 && d <= 14) return i18n.t('calendar.inDays', { count: d });
  if (d < -1 && d >= -14) return i18n.t('calendar.daysAgo', { count: -d });
  return fullWeekday(ms);
}
