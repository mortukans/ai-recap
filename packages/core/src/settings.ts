/**
 * User settings (Product Plan §11 settings, §36). Persisted locally; non-sensitive subset may sync.
 */
import type { AudioRetention, ContextTiming, PresetKey, SupportedLanguage } from './enums';

export interface UserSettings {
  contextSelectionTiming: ContextTiming;
  autoProcessWhenOnline: boolean;
  audioRetention: AudioRetention;
  defaultPresetId: PresetKey;
  /** 'auto' detects mixed LV/EN; otherwise force a language. */
  defaultLanguage: 'auto' | SupportedLanguage;
  /** Recording chunk length. Default 60s; configurable 30–300s (§7). */
  chunkDurationSeconds: number;
  audioQuality: 'standard' | 'high';
  /** Optional spoken "AI Recap recording started" announcement (Product Plan §19). */
  startAnnouncement: boolean;
}

export const MIN_CHUNK_SECONDS = 30;
export const MAX_CHUNK_SECONDS = 300;
export const DEFAULT_CHUNK_SECONDS = 60;

export const DEFAULT_SETTINGS: UserSettings = {
  contextSelectionTiming: 'afterRecording',
  autoProcessWhenOnline: true,
  audioRetention: 'forever',
  defaultPresetId: 'workMeeting',
  defaultLanguage: 'auto',
  chunkDurationSeconds: DEFAULT_CHUNK_SECONDS,
  audioQuality: 'standard',
  startAnnouncement: false,
};

export function clampChunkSeconds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_CHUNK_SECONDS;
  return Math.min(MAX_CHUNK_SECONDS, Math.max(MIN_CHUNK_SECONDS, Math.round(value)));
}
