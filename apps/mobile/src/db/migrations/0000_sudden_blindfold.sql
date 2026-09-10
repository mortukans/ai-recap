CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`recap_id` text,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`relative_path` text NOT NULL,
	`extracted_text` text,
	`scope` text DEFAULT 'recap' NOT NULL,
	FOREIGN KEY (`recap_id`) REFERENCES `recaps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audio_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`recap_id` text NOT NULL,
	`index` integer NOT NULL,
	`relative_path` text NOT NULL,
	`start_offset` real DEFAULT 0 NOT NULL,
	`duration` real DEFAULT 0 NOT NULL,
	`byte_size` integer DEFAULT 0 NOT NULL,
	`upload_status` text DEFAULT 'local' NOT NULL,
	FOREIGN KEY (`recap_id`) REFERENCES `recaps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`recap_id` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`citations` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`recap_id`) REFERENCES `recaps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contexts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`vocabulary` text DEFAULT '[]' NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`is_built_in` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generated_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`recap_id` text NOT NULL,
	`type` text DEFAULT 'summary' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`prompt_version` text DEFAULT '' NOT NULL,
	`context_version` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`recap_id`) REFERENCES `recaps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recap_speakers` (
	`id` text PRIMARY KEY NOT NULL,
	`recap_id` text NOT NULL,
	`diarized_label` text NOT NULL,
	`custom_display_name` text,
	`speaker_profile_id` text,
	FOREIGN KEY (`recap_id`) REFERENCES `recaps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recaps` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_seconds` real DEFAULT 0 NOT NULL,
	`detected_languages` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'recording' NOT NULL,
	`preset_id` text,
	`context_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `speaker_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`voice_reference_metadata` blob,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transcript_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`recap_id` text NOT NULL,
	`start_time` real NOT NULL,
	`end_time` real NOT NULL,
	`speaker_label` text,
	`language` text,
	`text` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`recap_id`) REFERENCES `recaps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usage_records` (
	`id` text PRIMARY KEY NOT NULL,
	`recap_id` text,
	`recording_seconds` real DEFAULT 0 NOT NULL,
	`transcription_seconds` real DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`estimated_cost_micros` integer DEFAULT 0 NOT NULL,
	`occurred_at` integer NOT NULL,
	`synced_to_backend` integer DEFAULT false NOT NULL
);
