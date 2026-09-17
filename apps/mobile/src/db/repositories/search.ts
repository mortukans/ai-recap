/**
 * Local search across recaps (Arch §14, MVP task M4-4): titles, transcript text and generated recap
 * content. LIKE-based (case-insensitive for ASCII; SQLite's LIKE is case-sensitive for non-ASCII, so
 * Latvian diacritics match literally) — good enough for a personal library; FTS5 can replace the
 * matching later without touching callers.
 */
import { type Recap, type RecapStatus, escapeLike, makeSnippet, normalizeQuery } from '@ai-recap/core';
import { desc, inArray, like, sql } from 'drizzle-orm';
import { getDatabase } from '../client';
import { generatedArtifacts, recaps, transcriptSegments } from '../schema';

export type SearchMatchSource = 'title' | 'transcript' | 'recap';

export interface RecapSearchHit {
  recap: Recap;
  matchedIn: SearchMatchSource;
  snippet: string;
}

function toDomain(row: typeof recaps.$inferSelect): Recap {
  return {
    id: row.id,
    title: row.title,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationSeconds: row.durationSeconds,
    detectedLanguages: row.detectedLanguages,
    status: row.status as RecapStatus,
    presetId: row.presetId,
    contextId: row.contextId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Strip JSON syntax from a stored RecapDocument so snippets read as prose. */
function artifactToProse(content: string): string {
  try {
    const walk = (v: unknown): string =>
      typeof v === 'string'
        ? v
        : Array.isArray(v)
          ? v.map(walk).join(' ')
          : v && typeof v === 'object'
            ? Object.values(v as Record<string, unknown>).map(walk).join(' ')
            : '';
    return walk(JSON.parse(content));
  } catch {
    return content;
  }
}

export async function searchRecaps(rawQuery: string, limit = 50): Promise<RecapSearchHit[]> {
  const query = normalizeQuery(rawQuery);
  if (query.length === 0) return [];
  const db = getDatabase();
  const pattern = `%${escapeLike(query)}%`;
  const likeEsc = (col: Parameters<typeof like>[0]) => sql`${col} LIKE ${pattern} ESCAPE '\\'`;

  const [titleRows, segmentRows, artifactRows] = await Promise.all([
    db.select({ id: recaps.id, title: recaps.title }).from(recaps).where(likeEsc(recaps.title)).limit(limit),
    db
      .select({ recapId: transcriptSegments.recapId, text: transcriptSegments.text })
      .from(transcriptSegments)
      .where(likeEsc(transcriptSegments.text))
      .limit(limit * 4),
    db
      .select({ recapId: generatedArtifacts.recapId, content: generatedArtifacts.content })
      .from(generatedArtifacts)
      .where(likeEsc(generatedArtifacts.content))
      .orderBy(desc(generatedArtifacts.createdAt))
      .limit(limit * 2),
  ]);

  // First (best) match per recap: title > transcript > recap content.
  const best = new Map<string, { matchedIn: SearchMatchSource; snippet: string }>();
  for (const r of titleRows) best.set(r.id, { matchedIn: 'title', snippet: r.title });
  for (const s of segmentRows) {
    if (!best.has(s.recapId)) best.set(s.recapId, { matchedIn: 'transcript', snippet: makeSnippet(s.text, query) });
  }
  for (const a of artifactRows) {
    if (!best.has(a.recapId)) {
      best.set(a.recapId, { matchedIn: 'recap', snippet: makeSnippet(artifactToProse(a.content), query) });
    }
  }
  if (best.size === 0) return [];

  const rows = await db
    .select()
    .from(recaps)
    .where(inArray(recaps.id, [...best.keys()]))
    .orderBy(desc(recaps.startedAt))
    .limit(limit);

  return rows.map((row) => {
    const m = best.get(row.id)!;
    return { recap: toDomain(row), matchedIn: m.matchedIn, snippet: m.snippet };
  });
}
