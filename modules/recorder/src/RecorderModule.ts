/**
 * Typed JS wrapper over the native recorder. The native module registers as "AiRecapRecorder".
 * See AI_RECAP_TECHNICAL_ARCHITECTURE.md §7.
 */
import { type EventSubscription, requireNativeModule } from 'expo-modules-core';
import type {
  RecordOptions,
  RecordResult,
  RecorderEventName,
  RecorderEvents,
  WatchRecorderState,
} from './Recorder.types';

interface NativeRecorder {
  requestPermission(): Promise<boolean>;
  getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'>;
  start(recapId: string, chunkSeconds: number, sampleRate: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  finish(): Promise<RecordResult>;
  addMarker(label: string | null): Promise<void>;
  transcribeFile(uri: string, locale: string): Promise<string>;
  setWatchState?(state: WatchRecorderState, startedAt: number, pausedElapsed: number, phoneActive: boolean): Promise<void>;
  setWatchLastRecap?(title: string, status: string, startedAt: number): Promise<void>;
  shareRichText?(html: string, plain: string): Promise<void>;
  addListener<E extends RecorderEventName>(
    event: E,
    listener: (payload: RecorderEvents[E]) => void,
  ): EventSubscription;
}

function createUnavailableStub(): NativeRecorder {
  const unavailable = () =>
    Promise.reject(
      new Error('AiRecapRecorder native module unavailable — build a development build (not Expo Go).'),
    );
  return {
    requestPermission: unavailable,
    getPermissionStatus: () => Promise.resolve('undetermined'),
    start: unavailable,
    pause: unavailable,
    resume: unavailable,
    finish: unavailable,
    addMarker: unavailable,
    transcribeFile: unavailable,
    addListener: () => ({ remove: () => undefined }) as EventSubscription,
  };
}

let native: NativeRecorder;
try {
  native = requireNativeModule<NativeRecorder>('AiRecapRecorder');
} catch {
  // Not present in Expo Go / web / before a dev build. Methods reject with a clear message on use.
  native = createUnavailableStub();
}

export const Recorder = {
  requestPermission: () => native.requestPermission(),
  getPermissionStatus: () => native.getPermissionStatus(),
  start: (recapId: string, opts: RecordOptions) =>
    native.start(recapId, opts.chunkSeconds, opts.sampleRate ?? 16000),
  pause: () => native.pause(),
  resume: () => native.resume(),
  finish: () => native.finish(),
  addMarker: (label: string | null = null) => native.addMarker(label),
  transcribeFile: (uri: string, locale: string) => native.transcribeFile(uri, locale),
  /** Mirror recorder state to a paired Apple Watch (no-op on builds without the bridge). */
  setWatchState: (state: WatchRecorderState, startedAt: number, pausedElapsed: number, phoneActive: boolean) =>
    native.setWatchState
      ? native.setWatchState(state, startedAt, pausedElapsed, phoneActive).catch(() => undefined)
      : Promise.resolve(),
  /** Rich-text share sheet (Notes/Mail get formatted text). Rejects on builds without the function. */
  shareRichText: (html: string, plain: string) =>
    native.shareRichText ? native.shareRichText(html, plain) : Promise.reject(new Error('shareRichText unavailable')),
  /** Latest recap for the watch home card (title, pipeline status, start ms). No-op on old builds. */
  setWatchLastRecap: (title: string, status: string, startedAt: number) =>
    native.setWatchLastRecap ? native.setWatchLastRecap(title, status, startedAt).catch(() => undefined) : Promise.resolve(),
  addListener: <E extends RecorderEventName>(
    event: E,
    listener: (payload: RecorderEvents[E]) => void,
  ): EventSubscription => native.addListener(event, listener),
};

export type RecorderApi = typeof Recorder;
