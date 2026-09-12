/** Usage accounting (Product Plan §26). Local mirror; syncs to backend usage_events later. */
import type { UsageRecord } from '@ai-recap/core';
import { desc } from 'drizzle-orm';
import { getDatabase } from '../client';
import { usageRecords } from '../schema';

type UsageRow = typeof usageRecords.$inferSelect;

function toDomain(row: UsageRow): UsageRecord {
  return {
    id: row.id,
    recapId: row.recapId,
    recordingSeconds: row.recordingSeconds,
    transcriptionSeconds: row.transcriptionSeconds,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    model: row.model,
    provider: row.provider,
    estimatedCostMicros: row.estimatedCostMicros,
    occurredAt: row.occurredAt,
    syncedToBackend: row.syncedToBackend,
  };
}

export async function addUsage(record: UsageRecord): Promise<void> {
  await getDatabase().insert(usageRecords).values(record);
}

export async function listRecentUsage(limit = 100): Promise<UsageRecord[]> {
  const rows = await getDatabase()
    .select()
    .from(usageRecords)
    .orderBy(desc(usageRecords.occurredAt))
    .limit(limit);
  return rows.map(toDomain);
}
