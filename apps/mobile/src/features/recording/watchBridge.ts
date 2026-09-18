/**
 * Apple Watch remote control (JS side). The native WatchBridge forwards watch commands as
 * `watchCommand` events; the active recording screen registers its controls here, and the recorder
 * state is mirrored back to the watch on every transition (the watch ticks the timer locally).
 *
 * iOS only lets an app *begin* microphone capture while it is in the foreground, so a "start" that
 * arrives while AI Recap is backgrounded/closed cannot start immediately. In that case we post a
 * local notification; tapping it (or simply opening the app) starts the recording.
 */
import { Recorder, type WatchRecorderState } from '@ai-recap/recorder';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AppState, Platform } from 'react-native';

import i18n from '../../i18n';

interface RecordingControls {
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<unknown>;
}

const START_NOTIFICATION_ID = 'airecap.watch.start';

let controls: RecordingControls | null = null;
let started = false;
/** A watch "start" arrived while we could not record; honoured as soon as the app is in front. */
let pendingStart = false;

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

function openRecording(): void {
  pendingStart = false;
  void Notifications.dismissNotificationAsync(START_NOTIFICATION_ID).catch(() => undefined);
  if (!controls) router.push('/recording'); // the screen auto-starts on mount
}

async function notifyStartRequested(): Promise<void> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return; // permission is requested when the bridge starts (foreground)
    await Notifications.scheduleNotificationAsync({
      identifier: START_NOTIFICATION_ID,
      content: {
        title: i18n.t('watch.startTitle'),
        body: i18n.t('watch.startBody'),
        sound: 'default',
        interruptionLevel: 'timeSensitive',
        data: { url: 'airecap://recording' },
      },
      trigger: null,
    });
  } catch {
    /* notifications unavailable — the pending start still fires when the app is opened */
  }
}

function handleStart(): void {
  if (controls) return; // already recording
  if (AppState.currentState === 'active') {
    openRecording();
    return;
  }
  pendingStart = true;
  publishWatchState('idle', 0);
  void notifyStartRequested();
}

/** Install the global command listener once (root layout). */
export function startWatchBridge(): void {
  if (started || Platform.OS !== 'ios') return;
  started = true;
  publishWatchState('idle', 0);

  // Foreground-only notification display (banner + sound) for our own local notifications.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  void Notifications.requestPermissionsAsync().catch(() => undefined);

  Recorder.addListener('watchCommand', ({ command }) => {
    switch (command) {
      case 'start':
        handleStart();
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

  // Tapping the "start recording" notification (cold start or background) → straight into recording.
  Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.notification.request.identifier === START_NOTIFICATION_ID) openRecording();
  });
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response?.notification.request.identifier === START_NOTIFICATION_ID) openRecording();
  });

  // The user opened the app by hand after a watch "start" → honour it.
  AppState.addEventListener('change', (state) => {
    if (state === 'active' && pendingStart) openRecording();
  });
}
