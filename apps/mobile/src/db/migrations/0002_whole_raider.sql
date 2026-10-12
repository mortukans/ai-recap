CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`recap_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`start_at` integer NOT NULL,
	`all_day` integer DEFAULT true NOT NULL,
	`type` text DEFAULT 'event' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`timestamp_ref` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`recap_id`) REFERENCES `recaps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_recap` ON `calendar_events` (`recap_id`);--> statement-breakpoint
CREATE INDEX `idx_calendar_start` ON `calendar_events` (`start_at`);--> statement-breakpoint
ALTER TABLE `recaps` ADD `calendar_scanned_at` integer;