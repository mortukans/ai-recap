/**
 * Apple Watch remote control (JS side). The native WatchBridge forwards watch commands as
 * `watchCommand` events; the active recording screen registers its controls here, and the recorder
 * state is mirrored back to the watch on every transition (the watch ticks the timer locally).
 */
import { Recorder, type WatchRecorderState } from '@ai-recap/recorder';
import { router } from 'expo-router';
import { Platform } from 'react-native';

interface RecordingControls {
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<unknown>;
}

let controls: RecordingControls | null = null;
let started = false;

/** The recording screen registers/unregisters itself so watch commands act on the live session. */
export function registerRecordingControls(c: RecordingControls | null): void {
  controls = c;
}

/** Mirror state to the watch. Call on every transition; cheap no-op on non-iOS. */
export function publishWatchState(state: WatchRecorderState, elapsedSeconds: number): void {
  if (Platform.OS !== 'ios') return;
  const now = Date.now() / 1000;
  const startedAt = state === 'recording' ? now - elapsedSeconds : 0;
  void Recorder.setWatchState(state, startedAt, state === 'paused' ? elapsedSeconds : 0);
}

/** Install the global command listener once (root layout). */
export function startWatchBridge(): void {
  if (started || Platform.OS !== 'ios') return;
  started = true;
  publishWatchState('idle', 0);
  Recorder.addListener('watchCommand', ({ command }) => {
    switch (command) {
      case 'start':
        // The recording screen auto-starts on mount; if a session is live, ignore.
        if (!controls) router.push('/recording');
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
}
