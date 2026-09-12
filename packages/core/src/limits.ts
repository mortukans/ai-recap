/**
 * Free-plan enforcement logic (Product Plan §21/§22). Pure functions — the UI applies them.
 * Recording warns near the cap and auto-stops at it (the recording is still saved + processed).
 */

export interface RecordingLimitState {
  elapsedSeconds: number;
  maxSeconds: number;
  remainingSeconds: number;
  /** Gentle warning window: last 2 minutes before the cap (e.g. 13:00 on a 15-min plan). */
  warn: boolean;
  /** Strong warning window: last 1 minute (e.g. 14:00). */
  strongWarn: boolean;
  /** Cap reached — the recorder should auto-stop (but keep the recording). */
  shouldStop: boolean;
}

export function recordingLimitState(elapsedSeconds: number, maxRecordingMinutes: number): RecordingLimitState {
  const maxSeconds = maxRecordingMinutes * 60;
  const remainingSeconds = Math.max(0, maxSeconds - elapsedSeconds);
  return {
    elapsedSeconds,
    maxSeconds,
    remainingSeconds,
    warn: remainingSeconds <= 120 && remainingSeconds > 60,
    strongWarn: remainingSeconds <= 60 && remainingSeconds > 0,
    shouldStop: elapsedSeconds >= maxSeconds,
  };
}

export interface DailyQuotaState {
  started: number;
  max: number | null;
  canStart: boolean;
  remaining: number | null;
}

export function dailyQuotaState(started: number, maxPerDay: number | null): DailyQuotaState {
  if (maxPerDay === null) {
    return { started, max: null, canStart: true, remaining: null };
  }
  return {
    started,
    max: maxPerDay,
    canStart: started < maxPerDay,
    remaining: Math.max(0, maxPerDay - started),
  };
}

/** Epoch ms for the start of the local day containing `now` (used to count today's recaps). */
export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
