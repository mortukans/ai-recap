import { describe, expect, it } from 'vitest';
import type { RecapDocument } from './recap-document';
import { formatRecapHtml } from './share-html';

const doc: RecapDocument = {
  title: 'Q3 <budget>',
  summary: 'Short & sweet.',
  decisions: [{ text: 'Ship Friday', timestampRefs: [12] }],
  actionItems: [
    { owner: 'Anna', task: 'Fix SKU import', deadline: '2026-09-25', timestampRefs: [] },
    { owner: null, task: 'Ask sales about prices', deadline: null, timestampRefs: [] },
  ],
  importantDates: [{ text: 'Release', date: '2026-10-01', timestampRefs: [] }],
  openQuestions: ['Prices in PIM or ERP?'],
  topics: ['sync', 'pricing'],
};

describe('formatRecapHtml', () => {
  it('escapes text and renders headings, lists and checkbox items', () => {
    const html = formatRecapHtml(doc, { labels: { actionItems: 'Uzdevumi' }, doneTasks: [0] });
    expect(html).toContain('<h1>Q3 &lt;budget&gt;</h1>');
    expect(html).toContain('<p>Short &amp; sweet.</p>');
    expect(html).toContain('<h2>Uzdevumi</h2>');
    expect(html).toContain('☑ <s>Fix SKU import</s> <i>— Anna · 2026-09-25</i>');
    expect(html).toContain('☐ <b>Ask sales about prices</b></li>');
    expect(html).toContain('<b>2026-10-01</b> — Release');
    expect(html).toContain('sync · pricing');
  });

  it('falls back to the meta title', () => {
    expect(formatRecapHtml({ ...doc, title: '' }, { title: 'Fallback' })).toContain('<h1>Fallback</h1>');
  });
});
