/**
 * On-device SQLite schema (Drizzle) — the source of truth for all user content.
 * Mirrors AI_RECAP_TECHNICAL_ARCHITECTURE.md §5.2 and the domain models in `@ai-recap/core`.
 * Timestamps are epoch milliseconds. JSON columns hold small arrays/objects.
 */
import { sql } from 'drizzle-orm';
import { blob, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const recaps = sqliteTable('recaps', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default(''),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  durationSeconds: real('duration_seconds').notNull().default(0),
  detectedLanguages: text('detected_languages', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  status: text('status').notNull().default('recording'),
  presetId: text('preset_id'),
  contextId: text('context_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const audioChunks = sqliteTable('audio_chunks', {
  id: text('id').primaryKey(),
  recapId: text('recap_id')
    .notNull()
    .references(() => recaps.id, { onDelete: 'cascade' }),
  index: integer('index').notNull(),
  relativePath: text('relative_path').notNull(),
  startOffset: real('start_offset').notNull().default(0),
  duration: real('duration').notNull().default(0),
  byteSize: integer('byte_size').notNull().default(0),
  uploadStatus: text('upload_status').notNull().default('local'),
});

export const transcriptSegments = sqliteTable('transcript_segments', {
  id: text('id').primaryKey(),
  recapId: text('recap_id')
    .notNull()
    .references(() => recaps.id, { onDelete: 'cascade' }),
  startTime: real('start_time').notNull(),
  endTime: real('end_time').notNull(),
  speakerLabel: text('speaker_label'),
  language: text('language'),
  text: text('text').notNull().default(''),
});

export const contexts = sqliteTable('contexts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  summary: text('summary').notNull().default(''),
  vocabulary: text('vocabulary', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  instructions: text('instructions').notNull().default(''),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const speakerProfiles = sqliteTable('speaker_profiles', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull().default(''),
  voiceReferenceMetadata: blob('voice_reference_metadata'), // reserved; DISABLED in MVP
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const recapSpeakers = sqliteTable('recap_speakers', {
  id: text('id').primaryKey(),
  recapId: text('recap_id')
    .notNull()
    .references(() => recaps.id, { onDelete: 'cascade' }),
  diarizedLabel: text('diarized_label').notNull(),
  customDisplayName: text('custom_display_name'),
  speakerProfileId: text('speaker_profile_id'),
});

export const generatedArtifacts = sqliteTable('generated_artifacts', {
  id: text('id').primaryKey(),
  recapId: text('recap_id')
    .notNull()
    .references(() => recaps.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('summary'),
  model: text('model').notNull().default(''),
  promptVersion: text('prompt_version').notNull().default(''),
  contextVersion: text('context_version').notNull().default(''),
  /** JSON-serialized RecapDocument (stored as an opaque string; app owns (de)serialization). */
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  recapId: text('recap_id').references(() => recaps.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  relativePath: text('relative_path').notNull(),
  extractedText: text('extracted_text'),
  scope: text('scope').notNull().default('recap'),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  recapId: text('recap_id')
    .notNull()
    .references(() => recaps.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('user'),
  content: text('content').notNull().default(''),
  citations: text('citations', { mode: 'json' }).$type<number[]>(),
  createdAt: integer('created_at').notNull(),
});

export const usageRecords = sqliteTable('usage_records', {
  id: text('id').primaryKey(),
  recapId: text('recap_id'),
  recordingSeconds: real('recording_seconds').notNull().default(0),
  transcriptionSeconds: real('transcription_seconds').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  model: text('model').notNull().default(''),
  provider: text('provider').notNull().default(''),
  estimatedCostMicros: integer('estimated_cost_micros').notNull().default(0),
  occurredAt: integer('occurred_at').notNull(),
  syncedToBackend: integer('synced_to_backend', { mode: 'boolean' }).notNull().default(false),
});

export const schema = {
  recaps,
  audioChunks,
  transcriptSegments,
  contexts,
  speakerProfiles,
  recapSpeakers,
  generatedArtifacts,
  attachments,
  chatMessages,
  usageRecords,
};
