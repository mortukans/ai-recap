/**
 * Pure day-math for the calendar agenda — no app imports, so it is unit-testable and the React Compiler
 * treats it as opaque (the screen can call it during render without tripping the impure-call rule, as
 * long as it passes `now` rather than letting the helper read the clock itself).
 */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole-day offset from today: 0 today, 1 tomorrow, -1 yesterday. */
export function dayDiff(ms: number, now: number): number {
  return Math.round((startOfDay(ms) - startOfDay(now)) / 86_400_000);
}
