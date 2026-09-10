/** Context repository — built-in presets and user-created custom templates share this table. */
import type { Context } from '@ai-recap/core';
import { asc, eq } from 'drizzle-orm';
import { getDatabase } from '../client';
import { contexts } from '../schema';

type ContextRow = typeof contexts.$inferSelect;

function toDomain(row: ContextRow): Context {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    vocabulary: row.vocabulary,
    instructions: row.instructions,
    isBuiltIn: row.isBuiltIn,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listContexts(): Promise<Context[]> {
  const rows = await getDatabase().select().from(contexts).orderBy(asc(contexts.name));
  return rows.map(toDomain);
}

export async function getContext(id: string): Promise<Context | null> {
  const rows = await getDatabase().select().from(contexts).where(eq(contexts.id, id)).limit(1);
  const row = rows.at(0);
  return row ? toDomain(row) : null;
}

export async function upsertContext(context: Context): Promise<void> {
  await getDatabase()
    .insert(contexts)
    .values(context)
    .onConflictDoUpdate({
      target: contexts.id,
      set: {
        name: context.name,
        summary: context.summary,
        vocabulary: context.vocabulary,
        instructions: context.instructions,
        updatedAt: Date.now(),
      },
    });
}

export async function deleteContext(id: string): Promise<void> {
  await getDatabase().delete(contexts).where(eq(contexts.id, id));
}

/** Insert any built-in contexts that aren't present yet (idempotent seed on bootstrap). */
export async function ensureBuiltInContexts(builtIns: Context[]): Promise<void> {
  const db = getDatabase();
  for (const ctx of builtIns) {
    await db.insert(contexts).values(ctx).onConflictDoNothing({ target: contexts.id });
  }
}
