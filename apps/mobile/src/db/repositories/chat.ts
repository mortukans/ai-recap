/** Chat message repository (Ask-AI over a recap). */
import type { ChatMessage, ChatRole } from '@ai-recap/core';
import { asc, eq } from 'drizzle-orm';
import { getDatabase } from '../client';
import { chatMessages } from '../schema';

type ChatRow = typeof chatMessages.$inferSelect;

function toDomain(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    recapId: row.recapId,
    role: row.role as ChatRole,
    content: row.content,
    citations: row.citations ?? null,
    createdAt: row.createdAt,
  };
}

export async function addMessage(message: ChatMessage): Promise<void> {
  await getDatabase().insert(chatMessages).values(message);
}

export async function listMessages(recapId: string): Promise<ChatMessage[]> {
  const rows = await getDatabase()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.recapId, recapId))
    .orderBy(asc(chatMessages.createdAt));
  return rows.map(toDomain);
}
