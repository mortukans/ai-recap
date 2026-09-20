/**
 * Format a recap for the normal share sheet (Product Plan §36A): Markdown with headings, bullet lists,
 * and checkbox action items so compatible apps (e.g. Apple Notes) preserve structure.
 * Audio and full transcripts are intentionally NOT produced here — those are a separate explicit export.
 */
import { formatTimestamp } from './format';
import type { RecapDocument } from './recap-document';

export interface RecapShareMeta {
  title?: string;
  /** Append [mm:ss] transcript references (useful in .md exports, noise when pasting into notes). Default true. */
  timestamps?: boolean;
}

export function formatRecapMarkdown(doc: RecapDocument, meta: RecapShareMeta = {}): string {
  const withRefs = meta.timestamps !== false;
  const refs = (timestampRefs: number[]): string =>
    withRefs && timestampRefs.length > 0 ? ` ${timestampRefs.map((r) => `[${formatTimestamp(r)}]`).join(' ')}` : '';
  const lines: string[] = [];
  const title = doc.title || meta.title || 'Recap';
  lines.push(`# ${title}`, '');

  if (doc.summary) lines.push(doc.summary, '');

  if (doc.decisions.length > 0) {
    lines.push('## Decisions', '');
    for (const d of doc.decisions) lines.push(`- ${d.text}${refs(d.timestampRefs)}`);
    lines.push('');
  }

  if (doc.actionItems.length > 0) {
    lines.push('## Action Items', '');
    for (const a of doc.actionItems) {
      const owner = a.owner ? ` (${a.owner})` : '';
      const due = a.deadline ? ` — due ${a.deadline}` : '';
      lines.push(`- [ ] ${a.task}${owner}${due}${refs(a.timestampRefs)}`);
    }
    lines.push('');
  }

  if (doc.importantDates.length > 0) {
    lines.push('## Important Dates', '');
    for (const d of doc.importantDates) lines.push(`- ${d.text}${d.date ? ` (${d.date})` : ''}${refs(d.timestampRefs)}`);
    lines.push('');
  }

  if (doc.openQuestions.length > 0) {
    lines.push('## Open Questions', '');
    for (const q of doc.openQuestions) lines.push(`- ${q}`);
    lines.push('');
  }

  if (doc.topics.length > 0) {
    lines.push('## Topics', '', doc.topics.join(', '), '');
  }

  return `${lines.join('\n').trim()}\n`;
}
