/**
 * Rich-text export of a recap (Product Plan §36A): an HTML document that Apple Notes, Mail and
 * Messages paste as formatted text — headings, bullet lists, checkbox-style action items.
 * Audio and the full transcript are never part of this share.
 */
import type { RecapDocument } from './recap-document';

export interface RecapHtmlLabels {
  summary: string;
  decisions: string;
  actionItems: string;
  dates: string;
  openQuestions: string;
  topics: string;
}

export const DEFAULT_RECAP_HTML_LABELS: RecapHtmlLabels = {
  summary: 'Summary',
  decisions: 'Decisions',
  actionItems: 'Action items',
  dates: 'Important dates',
  openQuestions: 'Open questions',
  topics: 'Topics',
};

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatRecapHtml(
  doc: RecapDocument,
  meta: { title?: string; labels?: Partial<RecapHtmlLabels>; doneTasks?: readonly number[] } = {},
): string {
  const L = { ...DEFAULT_RECAP_HTML_LABELS, ...meta.labels };
  const done = new Set(meta.doneTasks ?? []);
  const title = doc.title || meta.title || 'Recap';
  const parts: string[] = [`<h1>${escapeHtml(title)}</h1>`];

  if (doc.summary) parts.push(`<p>${escapeHtml(doc.summary)}</p>`);

  if (doc.decisions.length > 0) {
    parts.push(`<h2>${escapeHtml(L.decisions)}</h2>`, '<ul>', ...doc.decisions.map((d) => `<li>${escapeHtml(d.text)}</li>`), '</ul>');
  }

  if (doc.actionItems.length > 0) {
    parts.push(`<h2>${escapeHtml(L.actionItems)}</h2>`, '<ul>');
    doc.actionItems.forEach((a, i) => {
      const box = done.has(i) ? '☑' : '☐';
      const sub = [a.owner, a.deadline].filter(Boolean).join(' · ');
      const text = done.has(i) ? `<s>${escapeHtml(a.task)}</s>` : `<b>${escapeHtml(a.task)}</b>`;
      parts.push(`<li>${box} ${text}${sub ? ` <i>— ${escapeHtml(sub)}</i>` : ''}</li>`);
    });
    parts.push('</ul>');
  }

  if (doc.importantDates.length > 0) {
    parts.push(
      `<h2>${escapeHtml(L.dates)}</h2>`,
      '<ul>',
      ...doc.importantDates.map((d) => `<li>${d.date ? `<b>${escapeHtml(d.date)}</b> — ` : ''}${escapeHtml(d.text)}</li>`),
      '</ul>',
    );
  }

  if (doc.openQuestions.length > 0) {
    parts.push(`<h2>${escapeHtml(L.openQuestions)}</h2>`, '<ul>', ...doc.openQuestions.map((q) => `<li>${escapeHtml(q)}</li>`), '</ul>');
  }

  if (doc.topics.length > 0) {
    parts.push(`<h2>${escapeHtml(L.topics)}</h2>`, `<p>${doc.topics.map(escapeHtml).join(' · ')}</p>`);
  }

  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,Helvetica,Arial,sans-serif">${parts.join('\n')}</body></html>`;
}
