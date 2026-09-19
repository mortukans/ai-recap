import { describe, expect, it } from 'vitest';
import { titleFromTranscript } from './title';

describe('titleFromTranscript', () => {
  it('takes the first words, skipping fillers, and marks truncation', () => {
    expect(titleFromTranscript(['Nu labi, tad sāksim ar budžeta pārskatu par nākamo ceturksni un tad pārējo.'])).toBe(
      'Sāksim ar budžeta pārskatu par nākamo ceturksni…',
    );
  });

  it('returns the whole short utterance without an ellipsis', () => {
    expect(titleFromTranscript(['Reminder to call Anna.'])).toBe('Reminder to call Anna');
  });

  it('caps very long words at maxChars on a word boundary', () => {
    const t = titleFromTranscript(['Supercalifragilistic expialidocious antidisestablishmentarianism words continue here']);
    expect(t.length).toBeLessThanOrEqual(49);
    expect(t.endsWith('…')).toBe(true);
  });

  it('is empty for silence', () => {
    expect(titleFromTranscript([])).toBe('');
    expect(titleFromTranscript(['  ', 'ok'])).toBe('');
  });
});
