/**
 * Framework-agnostic domain models. These mirror the on-device SQLite schema
 * (AI_RECAP_TECHNICAL_ARCHITECTURE.md §5.2 / Product Plan §11) but carry no persistence concerns —
 * the DB layer maps rows to/from these. Timestamps are epoch milliseconds.
 */
import type {
  ArtifactType,
  AttachmentScope,
  ChatRole,
  RecapStatus,
  UploadStatus,
} from './enums';

export type Id = string; // UUID v4

export interface Recap {
  id: Id;
  title: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  detectedLanguages: string[];
  status: RecapStatus;
  presetId: string | null;
  contextId: Id | null;
  createdAt: number;
  updatedAt: number;
}

export interface AudioChunk {
  id: Id;
  recapId: Id;
  index: number;
  /** Path relative to the recap directory, e.g. "chunks/chunk_0001.m4a". Never an absolute URL. */
  relativePath: string;
  startOffset: number; // seconds from recap start
  duration: number; // seconds
  byteSize: number;
  uploadStatus: UploadStatus;
}

export interface TranscriptSegment {
  id: Id;
  recapId: Id;
  startTime: number; // seconds — powers [mm:ss] citations
  endTime: number; // seconds
  speakerLabel: string | null; // diarized label pre-rename, e.g. "Speaker 1"
  language: string | null; // per-segment language for code-switch display
  text: string;
}

export interface Context {
  id: Id;
  name: string;
  summary: string;
  vocabulary: string[]; // e.g. ["Sales7 = internal ERP"]
  instructions: string;
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SpeakerProfile {
  id: Id;
  displayName: string;
  /** Reserved for future voice matching; DISABLED in MVP (§7.5). */
  voiceReferenceMetadata: Uint8Array | null;
  createdAt: number;
  updatedAt: number;
}

export interface RecapSpeaker {
  id: Id;
  recapId: Id;
  diarizedLabel: string; // "Speaker 1"
  customDisplayName: string | null;
  speakerProfileId: Id | null;
}

export interface GeneratedArtifact {
  id: Id;
  recapId: Id;
  type: ArtifactType;
  model: string;
  promptVersion: string; // reproducibility (§13)
  contextVersion: string;
  /** JSON-serialized RecapDocument (or a custom shape for `custom` artifacts). */
  content: string;
  createdAt: number;
}

export interface Attachment {
  id: Id;
  recapId: Id | null;
  filename: string;
  mimeType: string;
  relativePath: string;
  extractedText: string | null;
  scope: AttachmentScope;
}

export interface ChatMessage {
  id: Id;
  recapId: Id;
  role: ChatRole;
  content: string;
  /** Transcript offsets (seconds) the assistant cited, for tap-to-seek. */
  citations: number[] | null;
  createdAt: number;
}

export interface UsageRecord {
  id: Id;
  recapId: Id | null;
  recordingSeconds: number;
  transcriptionSeconds: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
  estimatedCostMicros: number; // integer micro-EUR to avoid float drift
  occurredAt: number;
  syncedToBackend: boolean;
}
