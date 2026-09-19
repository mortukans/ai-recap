/**
 * Recording Live Activity controller (M6-1). Thin, failure-tolerant facade over expo-widgets so the
 * recorder never depends on it: on Android, on builds without the ExpoWidgets native module, or when
 * the user has Live Activities disabled, every call is a no-op.
 *
 * expo-widgets is loaded lazily (require inside try/catch) so an older dev build keeps working.
 */
import { formatTimestamp } from '@ai-recap/core';
import { Platform } from 'react-native';

import i18n from '../../i18n';

type Activity = import('expo-widgets').LiveActivity<import('../../widgets/RecordingActivity').RecordingActivityProps>;
type Factory = import('expo-widgets').LiveActivityFactory<
  import('../../widgets/RecordingActivity').RecordingActivityProps
>;

const DEEP_LINK = 'airecap://recording';

let current: Activity | null = null;
let startedAt = 0; // timer origin (epoch ms); shifted on resume so the island continues from the paused value
let capAt = 0;
let capDurationMs = 0;

function factory(): Factory | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../../widgets/RecordingActivity') as { default: Factory }).default;
  } catch {
    return null;
  }
}

function props(paused: boolean, elapsedSeconds: number) {
  return {
    startEpochMs: startedAt,
    endEpochMs: capAt,
    paused,
    elapsedLabel: formatTimestamp(elapsedSeconds),
    statusLabel: paused ? i18n.t('recording.paused') : i18n.t('recording.recording'),
    appName: i18n.t('app.name'),
    pauseLabel: paused ? i18n.t('recording.resume') : i18n.t('recording.pause'),
    finishLabel: i18n.t('recording.finish'),
  };
}

export interface LiveActivityHandlers {
  /** Pause when recording, resume when paused. */
  togglePause: () => void;
  finish: () => void;
}

let interactionsStarted = false;

/**
 * Route Live Activity button taps (LiveActivityIntent → `onExpoWidgetsUserInteraction`) to the recorder.
 * Install once at app start; the handlers look up the live recording session themselves.
 */
export function startLiveActivityInteractions(handlers: LiveActivityHandlers): void {
  if (interactionsStarted || Platform.OS !== 'ios') return;
  interactionsStarted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widgets = require('expo-widgets') as typeof import('expo-widgets');
    widgets.addUserInteractionListener((event) => {
      if (event.source !== 'RecordingActivity') return;
      if (event.target === 'pause') handlers.togglePause();
      else if (event.target === 'finish') handlers.finish();
    });
  } catch {
    /* module absent on this build — buttons simply do nothing */
  }
}

/** Start the Live Activity for a recording. `maxSeconds` bounds the on-island timer. */
export async function startRecordingActivity(maxSeconds: number): Promise<void> {
  const f = factory();
  if (!f) return;
  try {
    await endStaleRecordingActivities();
    startedAt = Date.now();
    capDurationMs = maxSeconds * 1000;
    capAt = startedAt + capDurationMs;
    current = f.start(props(false, 0), DEEP_LINK);
  } catch {
    current = null;
  }
}

/** Reflect pause/resume. While paused the island shows a frozen elapsed label. */
export async function updateRecordingActivity(paused: boolean, elapsedSeconds: number): Promise<void> {
  if (!current) return;
  try {
    if (!paused) {
      // Resume: shift the timer's origin so it continues from the elapsed value instead of wall-clock.
      startedAt = Date.now() - elapsedSeconds * 1000;
      capAt = startedAt + capDurationMs;
    }
    await current.update(props(paused, elapsedSeconds));
  } catch {
    /* ignore — activity may have been dismissed by the user */
  }
}

/** End the Live Activity right away (recording finished or cancelled). */
export async function endRecordingActivity(): Promise<void> {
  const a = current;
  current = null;
  if (!a) return;
  try {
    await a.end('immediate');
  } catch {
    /* ignore */
  }
}

/** Dismiss activities left over from a crash/kill so the island never shows a phantom recording. */
export async function endStaleRecordingActivities(): Promise<void> {
  const f = factory();
  if (!f) return;
  try {
    for (const a of f.getInstances()) await a.end('immediate');
  } catch {
    /* ignore */
  }
}
