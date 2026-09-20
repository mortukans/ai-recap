/**
 * Domain enumerations. Modeled as `as const` string tuples + derived union types so they are
 * tree-shakeable, JSON-friendly, and safe to persist directly to SQLite / send over the wire.
 * Mirrors AI_RECAP_TECHNICAL_ARCHITECTURE.md §5 / §9.
 */

export const RECAP_STATUSES = [
  'recording',
  'recorded',
  'waitingForNetwork',
  'transcribing',
  'transcribed',
  'summarizing',
  'ready',
  'transcriptionFailed',
  'summaryFailed',
  'uploadFailed',
] as const;
export type RecapStatus = (typeof RECAP_STATUSES)[number];

export const UPLOAD_STATUSES = ['local', 'pending', 'uploading', 'uploaded', 'deleted'] as const;
export type UploadStatus = (typeof UPLOAD_STATUSES)[number];

export const ARTIFACT_TYPES = [
  'summary',
  'decisions',
  'actionItems',
  'managementSummary',
  'personalSummary',
  'transcript',
  'custom',
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ATTACHMENT_SCOPES = ['recap', 'context', 'global'] as const;
export type AttachmentScope = (typeof ATTACHMENT_SCOPES)[number];

export const PRESET_KEYS = [
  'workMeeting',
  'lecture',
  'interview',
  'personalVoiceNote',
  'salesCall',
  'custom',
] as const;
export type PresetKey = (typeof PRESET_KEYS)[number];

export const CHAT_ROLES = ['user', 'assistant'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

/** Supported first-class languages (auto-detect covers mixed LV/EN). */
export const SUPPORTED_LANGUAGES = ['lv', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Hosted-plan quality presets (map to concrete models server-side). */
export const MODEL_TIERS = ['fast', 'balanced', 'best'] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

/** When the user is asked to pick a preset/context relative to recording. */
export const CONTEXT_TIMINGS = ['afterRecording', 'beforeRecording'] as const;
export type ContextTiming = (typeof CONTEXT_TIMINGS)[number];

/** Audio retention policy (AI_RECAP_TECHNICAL_ARCHITECTURE.md §21). */
export const AUDIO_RETENTIONS = ['forever', '90d', '30d', 'deleteAfterTranscription'] as const;
export type AudioRetention = (typeof AUDIO_RETENTIONS)[number];
