/** Public types for the recorder native module (AI_RECAP_TECHNICAL_ARCHITECTURE.md §7.1). */

export interface RecordOptions {
  /** Chunk rotation length in seconds (30–300, default 60). */
  chunkSeconds: number;
  /** Capture sample rate; 16000 is enough for speech ASR. */
  sampleRate?: number;
}

export interface RecordResult {
  durationSeconds: number;
  chunkCount: number;
}

export interface DurationEvent {
  seconds: number;
}

export interface ChunkClosedEvent {
  index: number;
  /** Path relative to the recap directory, e.g. "chunks/chunk_0001.m4a". */
  relativePath: string;
  startOffset: number;
  duration: number;
  byteSize: number;
}

export interface InterruptedEvent {
  reason: string;
}

export interface RecorderErrorEvent {
  code: string;
  message: string;
}

/** Remote-control command from the Apple Watch app. */
export interface WatchCommandEvent {
  command: 'start' | 'pause' | 'resume' | 'finish' | (string & {});
}

export type WatchRecorderState = 'idle' | 'recording' | 'paused' | 'finishing';

export interface RecorderEvents {
  duration: DurationEvent;
  chunkClosed: ChunkClosedEvent;
  interrupted: InterruptedEvent;
  resumed: Record<string, never>;
  error: RecorderErrorEvent;
  watchCommand: WatchCommandEvent;
}

export type RecorderEventName = keyof RecorderEvents;
