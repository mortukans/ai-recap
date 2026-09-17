import { describe, expect, it } from 'vitest';
import { escapeLike, makeSnippet, normalizeQuery } from './search';

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape char', () => {
    expect(escapeLike('100% sure_thing\\')).toBe('100\\% sure\\_thing\\\\');
  });
});

describe('normalizeQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeQuery('  budžets   Q3 ')).toBe('budžets Q3');
    expect(normalizeQuery('   ')).toBe('');
  });
});

describe('makeSnippet', () => {
  const text = 'Rīt mēs runāsim par budžetu. '.repeat(10) + 'Lēmums: pārcelt termiņu uz oktobri. ' + 'Beigas. '.repeat(10);

  it('centres on the first case-insensitive hit with ellipses on both sides', () => {
    const s = makeSnippet(text, 'TERMIŅU', 20);
    expect(s.startsWith('…')).toBe(true);
    expect(s.endsWith('…')).toBe(true);
    expect(s.toLowerCase()).toContain('termiņu');
  });

  it('omits the leading ellipsis when the hit is at the start', () => {
    expect(makeSnippet('Budžets ir gatavs un apstiprināts.', 'budžets', 10)).toBe('Budžets ir gatavs…');
  });

  it('falls back to the head of the text when nothing matches', () => {
    expect(makeSnippet('short text', 'zzz')).toBe('short text');
    expect(makeSnippet('a'.repeat(200), 'zzz', 10)).toBe(`${'a'.repeat(20)}…`);
  });

  it('collapses whitespace and returns empty for empty text', () => {
    expect(makeSnippet('  a \n\n b  ', 'b')).toBe('a b');
    expect(makeSnippet('   ', 'b')).toBe('');
  });
});
