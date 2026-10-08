/**
 * App Store rating prompt. Shown at most once, at a genuinely positive moment — after the user has had
 * a couple of *successful* recaps (never on a failure, never on first run). We set a one-time flag;
 * iOS additionally throttles the system prompt to a few times per year and may show nothing at all.
 */
import * as StoreReview from 'expo-store-review';

import { recapsRepo } from '../../db';
import { getRatingPrompted, setRatingPrompted } from '../../lib/prefs';

/** The user needs at least this many completed recaps before we consider asking. */
const MIN_READY_RECAPS = 2;

export async function maybeRequestReview(): Promise<void> {
  try {
    if (await getRatingPrompted()) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    const ready = await recapsRepo.listByStatuses(['ready']);
    if (ready.length < MIN_READY_RECAPS) return;
    // Mark first so a transient error in requestReview() can't make us re-ask on every recap.
    await setRatingPrompted();
    await StoreReview.requestReview();
  } catch {
    // A rating prompt must never disrupt the app.
  }
}
