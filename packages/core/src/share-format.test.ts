import { describe, expect, it } from 'vitest';
import type { RecapDocument } from './recap-document';
import { formatRecapMarkdown } from './share-format';
import { formatTranscriptText } from './transcript';
import type { TranscriptSegment } from './models';

const doc: RecapDocument = {
  title: 'Weekly IT',
  summary: 'Discussed Sales7 integration.',
  decisions: [{ text: 'DB read-only initially', timestampRefs: [1934] }],
  actionItems: [{ owner: 'Mārtiņš', task: 'Write API spec', deadline: '2026-09-14', timestampRefs: [] }],
  importantDates: [{ text: 'Launch', date: '2026-10-01', timestampRefs: [] }],
  openQuestions: ['Who owns Magento?'],
  topics: ['sync', 'PIM'],
};

describe('formatRecapMarkdown', () => {
  const md = formatRecapMarkdown(doc);

  it('has a title heading and summary', () => {
    expect(md).toContain('# Weekly IT');
    expect(md).toContain('Discussed Sales7 integration.');
  });

  it('renders action items as checkboxes with owner and due date', () => {
    expect(md).toContain('## Action Items');
    expect(md).toContain('- [ ] Write API spec (Mārtiņš) — due 2026-09-14');
  });

  it('renders decisions with [mm:ss] citations', () => {
    expect(md).toContain('- DB read-only initially [32:14]');
  });

  it('includes dates, questions and topics', () => {
    expect(md).toContain('- Launch (2026-10-01)');
    expect(md).toContain('- Who owns Magento?');
    expect(md).toContain('sync, PIM');
  });

  it('falls back to a title and omits empty sections', () => {
    const empty = formatRecapMarkdown({
      title: '',
      summary: '',
      decisions: [],
      actionItems: [],
      importantDates: [],
      openQuestions: [],
      topics: [],
    });
    expect(empty).toContain('# Recap');
    expect(empty).not.toContain('## Decisions');
  });
});

describe('formatTranscriptText', () => {
  const segments: TranscriptSegment[] = [
    { id: '1', recapId: 'r', startTime: 3, endTime: 9, speakerLabel: 'Speaker 1', language: 'lv', text: 'Labrīt.' },
    { id: '2', recapId: 'r', startTime: 10, endTime: 18, speakerLabel: 'Speaker 1', language: 'lv', text: 'Sāksim.' },
    { id: '3', recapId: 'r', startTime: 19, endTime: 27, speakerLabel: 'Speaker 2', language: 'en', text: 'Right.' },
  ];

  it('heads each turn with the resolved name and timestamp', () => {
    const text = formatTranscriptText(segments, (l) => (l === 'Speaker 1' ? 'Jānis' : (l ?? '')));
    expect(text).toContain('Jānis [0:03]');
    expect(text).toContain('Labrīt.');
    expect(text).toContain('Speaker 2 [0:19]');
  });
});
