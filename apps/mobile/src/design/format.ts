/** Locale-aware date/duration formatting for the redesigned screens. */
import i18n from '../i18n';

function lang(): string {
  return i18n.language?.startsWith('lv') ? 'lv-LV' : 'en-GB';
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Svētdiena, 20. septembris" / "Sunday, 20 September". */
export function longDate(ms: number): string {
  try {
    return cap(new Intl.DateTimeFormat(lang(), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(ms)));
  } catch {
    return new Date(ms).toDateString();
  }
}

/** "14:32" */
export function clock(ms: number): string {
  try {
    return new Intl.DateTimeFormat(lang(), { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));
  } catch {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

/** Day heading for grouped lists: Today / Yesterday / "16. septembris". */
export function dayLabel(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const n = new Date(now);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, n)) return i18n.t('ui.today');
  const y = new Date(now - 86_400_000);
  if (sameDay(d, y)) return i18n.t('ui.yesterday');
  try {
    const opts: Intl.DateTimeFormatOptions = d.getFullYear() === n.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' };
    return cap(new Intl.DateTimeFormat(lang(), opts).format(d));
  } catch {
    return d.toLocaleDateString();
  }
}

/** "Šodien 14:32" / "16. septembris 09:12" */
export function dayAndClock(ms: number): string {
  return `${dayLabel(ms)} ${clock(ms)}`;
}

/** Compact duration for list rows: "38 min", "16 s", "1 h 12 min". */
export function shortDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return i18n.t('ui.secShort', { n: s });
  const m = Math.round(s / 60);
  if (m < 60) return i18n.t('ui.minShort', { n: m });
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${i18n.t('ui.minShort', { n: rem })}`;
}

/** Start of the current calendar month (local time). */
export function startOfMonth(now = Date.now()): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
