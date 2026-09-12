import { describe, expect, it } from 'vitest';
import { parseRecapDocument } from './recap-document';

describe('parseRecapDocument', () => {
  it('returns null for non-object input', () => {
    expect(parseRecapDocument('nope')).toBeNull();
    expect(parseRecapDocument(null)).toBeNull();
    expect(parseRecapDocument([1, 2])).toBeNull();
  });

  it('coerces a full, well-formed document', () => {
    const doc = parseRecapDocument({
      title: 'Weekly IT',
      summary: 'S',
      decisions: [{ text: 'DB read-only', timestampRefs: [10, 20] }],
      actionItems: [{ owner: 'Mārtiņš', task: 'API spec', deadline: '2026-09-14', timestampRefs: [30] }],
      importantDates: [{ text: 'Launch', date: '2026-10-01', timestampRefs: [] }],
      openQuestions: ['Who owns Magento?'],
      topics: ['sync', 'PIM'],
    });
    expect(doc?.title).toBe('Weekly IT');
    expect(doc?.decisions[0]?.timestampRefs).toEqual([10, 20]);
    expect(doc?.actionItems[0]?.owner).toBe('Mārtiņš');
    expect(doc?.topics).toEqual(['sync', 'PIM']);
  });

  it('degrades missing fields to safe empty defaults', () => {
    const doc = parseRecapDocument({ title: 'x' });
    expect(doc?.summary).toBe('');
    expect(doc?.decisions).toEqual([]);
    expect(doc?.actionItems).toEqual([]);
    expect(doc?.topics).toEqual([]);
  });

  it('filters non-numeric timestamp refs and non-string list items', () => {
    const doc = parseRecapDocument({
      decisions: [{ text: 'ok', timestampRefs: [1, 'bad', 2, NaN] }],
      topics: ['a', 5, 'b'],
      openQuestions: ['q', null],
    });
    expect(doc?.decisions[0]?.timestampRefs).toEqual([1, 2]);
    expect(doc?.topics).toEqual(['a', 'b']);
    expect(doc?.openQuestions).toEqual(['q']);
  });
});
