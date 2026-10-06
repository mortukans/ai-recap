CREATE INDEX `idx_attachments_recap` ON `attachments` (`recap_id`);--> statement-breakpoint
CREATE INDEX `idx_chunks_recap` ON `audio_chunks` (`recap_id`,`index`);--> statement-breakpoint
CREATE INDEX `idx_chat_recap` ON `chat_messages` (`recap_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_artifacts_recap` ON `generated_artifacts` (`recap_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_recap_speakers_recap` ON `recap_speakers` (`recap_id`);--> statement-breakpoint
CREATE INDEX `idx_recaps_started_at` ON `recaps` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_recaps_status` ON `recaps` (`status`);--> statement-breakpoint
CREATE INDEX `idx_segments_recap` ON `transcript_segments` (`recap_id`,`start_time`);--> statement-breakpoint
CREATE INDEX `idx_usage_occurred` ON `usage_records` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_usage_synced` ON `usage_records` (`synced_to_backend`);