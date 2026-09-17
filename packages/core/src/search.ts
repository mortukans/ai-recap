/**
 * Local search helpers (Arch §14, MVP task M4-4). Pure functions: the DB does the matching, this
 * module turns a matched text into a compact snippet around the first hit.
 */

/** Escape `%`/`_` so a user query is matched literally inside a SQL LIKE pattern (ESCAPE '\'). */
export function escapeLike(query: string): string {
  return query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Normalize a raw search box value: trim + collapse whitespace; empty string when nothing to search. */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * A short excerpt of `text` centred on the first case-insensitive occurrence of `query`, with
 * ellipses where it was cut. Falls back to the head of the text when the query isn't found.
 */
export function makeSnippet(text: string, query: string, radius = 60): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return '';
  const q = normalizeQuery(query).toLowerCase();
  const idx = q.length > 0 ? clean.toLowerCase().indexOf(q) : -1;
  if (idx < 0) return clean.length > radius * 2 ? `${clean.slice(0, radius * 2).trimEnd()}…` : clean;

  const start = Math.max(0, idx - radius);
  const end = Math.min(clean.length, idx + q.length + radius);
  let out = clean.slice(start, end).trim();
  if (start > 0) out = `…${out}`;
  if (end < clean.length) out = `${out}…`;
  return out;
}
