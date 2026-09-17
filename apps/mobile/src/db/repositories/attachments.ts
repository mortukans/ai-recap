/** Attachments repository (Arch §12 / MVP task M4-2). MVP stores inline text notes (agenda, participants). */
import type { Attachment, AttachmentScope } from '@ai-recap/core';
import { and, eq } from 'drizzle-orm';
import { getDatabase } from '../client';
import { attachments } from '../schema';

/** Marker path for attachments whose content lives entirely in `extractedText`. */
export const INLINE_NOTES_PATH = 'inline';
export const NOTES_FILENAME = 'notes.txt';

type Row = typeof attachments.$inferSelect;

function toDomain(row: Row): Attachment {
  return {
    id: row.id,
    recapId: row.recapId,
    filename: row.filename,
    mimeType: row.mimeType,
    relativePath: row.relativePath,
    extractedText: row.extractedText,
    scope: row.scope as AttachmentScope,
  };
}

export async function addAttachment(a: Attachment): Promise<void> {
  await getDatabase().insert(attachments).values(a);
}

export async function listAttachments(recapId: string): Promise<Attachment[]> {
  const rows = await getDatabase().select().from(attachments).where(eq(attachments.recapId, recapId));
  return rows.map(toDomain);
}

export async function deleteAttachment(id: string): Promise<void> {
  await getDatabase().delete(attachments).where(eq(attachments.id, id));
}

/** The recap's inline notes (one per recap), or null. */
export async function getNotes(recapId: string): Promise<Attachment | null> {
  const rows = await getDatabase()
    .select()
    .from(attachments)
    .where(and(eq(attachments.recapId, recapId), eq(attachments.relativePath, INLINE_NOTES_PATH)))
    .limit(1);
  const row = rows.at(0);
  return row ? toDomain(row) : null;
}

/** Upsert the recap's inline notes; empty text removes them. */
export async function setNotes(recapId: string, text: string, newId: () => string): Promise<void> {
  const existing = await getNotes(recapId);
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    if (existing) await deleteAttachment(existing.id);
    return;
  }
  if (existing) {
    await getDatabase().update(attachments).set({ extractedText: trimmed }).where(eq(attachments.id, existing.id));
    return;
  }
  await addAttachment({
    id: newId(),
    recapId,
    filename: NOTES_FILENAME,
    mimeType: 'text/plain',
    relativePath: INLINE_NOTES_PATH,
    extractedText: trimmed,
    scope: 'recap',
  });
}

/** All attachment text for a recap, ready to drop into the prompt as extra context. */
export async function collectExtraContext(recapId: string): Promise<string | undefined> {
  const texts = (await listAttachments(recapId))
    .map((a) => a.extractedText?.trim() ?? '')
    .filter((t) => t.length > 0);
  return texts.length > 0 ? texts.join('\n\n') : undefined;
}
