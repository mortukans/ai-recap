/**
 * Apple Watch integration (JS side).
 *  • Remote control: the native WatchBridge forwards watch commands as `watchCommand` events; the
 *    active recording screen registers its controls here.
 *  • State mirroring: recorder state + whether this app is in the foreground go to the watch on every
 *    change. The watch uses `phoneActive` to decide per tap: phone app in front → phone records;
 *    otherwise the watch records with its own mic (iOS cannot begin capture in the background).
 *  • Import: recordings made on the watch arrive via `watchRecordingReceived` (or, if the app was
 *    closed, are picked up at launch by scanning for `watch.json` markers).
 */
import { Recorder, type WatchRecorderState } from '@ai-recap/recorder';
import { router } from 'expo-router';
import { AppState, Platform } from 'react-native';

import { recapsRepo } from '../../db';
import { processingCoordinator } from '../../processing/coordinator';
import { importPendingWatchRecordings, importWatchRecording } from './importWatchRecording';
import { startLiveActivityInteractions } from './liveActivity';

interface RecordingControls {
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<unknown>;
}

let controls: RecordingControls | null = null;
let started = false;
let lastState: WatchRecorderState = 'idle';
let lastElapsed = 0;

/** The recording screen registers/unregisters itself so watch commands act on the live session. */
export function registerRecordingControls(c: RecordingControls | null): void {
  controls = c;
}

function phoneActive(): boolean {
  return AppState.currentState === 'active';
}

/** Mirror state to the watch. Call on every transition; cheap no-op on non-iOS. */
export function publishWatchState(state: WatchRecorderState, elapsedSeconds: number): void {
  if (Platform.OS !== 'ios') return;
  lastState = state;
  lastElapsed = elapsedSeconds;
  const now = Date.now() / 1000;
  const startedAt = state === 'recording' ? now - elapsedSeconds : 0;
  void Recorder.setWatchState(state, startedAt, state === 'paused' ? elapsedSeconds : 0, phoneActive());
}

/** Install the global listeners once (root layout). */
export function startWatchBridge(): void {
  if (started || Platform.OS !== 'ios') return;
  started = true;
  publishWatchState('idle', 0);

  Recorder.addListener('watchCommand', ({ command }) => {
    switch (command) {
      case 'start':
        // Only honoured in the foreground — the watch records locally otherwise.
        if (!controls && phoneActive()) router.push('/recording'); // the screen auto-starts on mount
        break;
      case 'pause':
        void controls?.pause();
        break;
      case 'resume':
        void controls?.resume();
        break;
      case 'finish':
        void controls?.finish();
        break;
      default:
        break;
    }
  });

  // Dynamic Island / Lock Screen buttons act on the same live session as the watch does.
  startLiveActivityInteractions({
    togglePause: () => void (lastState === 'paused' ? controls?.resume() : controls?.pause()),
    finish: () => void controls?.finish(),
  });

  // A watch recording landed (app running in foreground or woken in background) → register + process.
  Recorder.addListener('watchRecordingReceived', (event) => {
    void importWatchRecording(event);
  });

  // Watch home card: the most recent recap and where it is in the pipeline.
  const publishLast = () => {
    recapsRepo
      .pageRecaps({ limit: 1 })
      .then(([r]) => {
        if (r) void Recorder.setWatchLastRecap(r.title, r.status, r.startedAt);
      })
      .catch(() => undefined);
  };
  publishLast();
  processingCoordinator.onChange(publishLast);

  // Foreground/background flips change whether the phone may start recording; tell the watch.
  AppState.addEventListener('change', () => {
    publishWatchState(lastState, lastElapsed);
    if (phoneActive()) void importPendingWatchRecordings();
  });
}
