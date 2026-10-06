/**
 * Processing Live Activity controller — the Dynamic Island / Lock Screen progress shown while a
 * recording is transcribed and its recap is generated after it stops (Product Plan §7.2). Thin,
 * failure-tolerant facade over expo-widgets so the coordinator never depends on it: on Android, on
 * builds without the ExpoWidgets native module, or when the user has Live Activities disabled, every
 * call is a no-op.
 *
 * expo-widgets is loaded lazily (require inside try/catch) so an older dev build keeps working.
 * iOS lets us START a Live Activity only from the foreground, but UPDATE and END it from the
 * background — so `sync` starts lazily the first time it runs while the app is active, then keeps
 * updating even after the app is backgrounded (matching how processing itself continues on borrowed
 * background time). If processing begins entirely in the background, there is simply no island until
 * the app next comes forward, at which point the next progress tick starts it.
 */
import { AppState, Platform } from 'react-native';

import i18n from '../../i18n';

type Phase = 'transcribing' | 'summarizing';

type Activity = import('expo-widgets').LiveActivity<import('../../widgets/ProcessingActivity').ProcessingActivityProps>;
type Factory = import('expo-widgets').LiveActivityFactory<
  import('../../widgets/ProcessingActivity').ProcessingActivityProps
>;

const DEEP_LINK = 'airecap://recap';

let current: Activity | null = null;
let currentRecapId: string | null = null;

function factory(): Factory | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../../widgets/ProcessingActivity') as { default: Factory }).default;
  } catch {
    return null;
  }
}

function props(input: {
  phase: Phase;
  done: number;
  total: number;
  title: string;
}): import('../../widgets/ProcessingActivity').ProcessingActivityProps {
  const determinate = input.phase === 'transcribing' && input.total > 0;
  const value = determinate ? Math.max(0, Math.min(1, input.done / input.total)) : 0;
  return {
    phase: input.phase,
    value,
    determinate,
    title: input.title.trim() || i18n.t('island.untitled'),
    statusLabel: input.phase === 'summarizing' ? i18n.t('island.summarizing') : i18n.t('island.transcribing'),
    appName: i18n.t('app.name'),
    percentLabel: determinate ? `${Math.round(value * 100)}%` : '',
  };
}

/**
 * Reflect the current processing progress on the island: start it (foreground only) the first time,
 * update it thereafter. Safe to call on every progress tick; a mismatched recap id restarts cleanly.
 */
export async function syncProcessingActivity(input: {
  id: string;
  phase: Phase;
  done: number;
  total: number;
  title: string;
}): Promise<void> {
  const f = factory();
  if (!f) return;
  const p = props(input);
  try {
    if (current && currentRecapId === input.id) {
      await current.update(p);
      return;
    }
    // A different recap is now processing (or none started yet) — drop the old island first.
    if (current) await endProcessingActivity();
    // iOS forbids starting a Live Activity from the background; try again on a later tick once active.
    if (AppState.currentState !== 'active') return;
    await endStaleProcessingActivities();
    current = f.start(p, DEEP_LINK);
    currentRecapId = input.id;
  } catch {
    current = null;
    currentRecapId = null;
  }
}

/** End the processing island (this pass finished, failed, or was stopped). */
export async function endProcessingActivity(): Promise<void> {
  const a = current;
  current = null;
  currentRecapId = null;
  if (!a) return;
  try {
    await a.end('immediate');
  } catch {
    /* ignore — activity may already have been dismissed */
  }
}

/** Dismiss activities left over from a crash/kill so the island never shows phantom processing. */
export async function endStaleProcessingActivities(): Promise<void> {
  const f = factory();
  if (!f) return;
  try {
    for (const a of f.getInstances()) await a.end('immediate');
  } catch {
    /* ignore */
  }
}
