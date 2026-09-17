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
  addListener: <E extends RecorderEventName>(
    event: E,
    listener: (payload: RecorderEvents[E]) => void,
  ): EventSubscription => native.addListener(event, listener),
};

export type RecorderApi = typeof Recorder;
