import { describe, expect, it } from 'vitest';
import { buildIcs, type IcsEvent } from './calendar-ics';

const NOW = Date.UTC(2026, 9, 30, 12, 0, 0);

function base(over: Partial<IcsEvent> = {}): IcsEvent {
  return { uid: 'evt-1', title: 'Dentist', startAt: new Date(2026, 10, 3, 15, 0).getTime(), allDay: false, ...over };
}

describe('buildIcs', () => {
  it('wraps events in a VCALENDAR with CRLF line endings', () => {
    const ics = buildIcs([base()], { now: NOW });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:evt-1');
    expect(ics).toContain('SUMMARY:Dentist');
  });

  it('uses local date components for all-day events (no time, no tz drift)', () => {
    const ics = buildIcs([base({ allDay: true, startAt: new Date(2026, 10, 3).getTime() })], { now: NOW });
    expect(ics).toContain('DTSTART;VALUE=DATE:20261103');
    expect(ics).toContain('DTEND;VALUE=DATE:20261104'); // next day
    expect(ics).not.toContain('DTSTART:'); // no timed form
  });

  it('emits a UTC instant and a +60m default end for timed events', () => {
    const start = Date.UTC(2026, 10, 3, 13, 0, 0);
    const ics = buildIcs([base({ allDay: false, startAt: start })], { now: NOW });
    expect(ics).toContain('DTSTART:20261103T130000Z');
    expect(ics).toContain('DTEND:20261103T140000Z');
  });

  it('adds a VALARM only when a reminder is set, with the right trigger', () => {
    expect(buildIcs([base({ reminderMinutes: null })], { now: NOW })).not.toContain('BEGIN:VALARM');
    expect(buildIcs([base({ reminderMinutes: 0 })], { now: NOW })).toContain('TRIGGER:PT0S');
    expect(buildIcs([base({ reminderMinutes: 10 })], { now: NOW })).toContain('TRIGGER:-PT10M');
    expect(buildIcs([base({ reminderMinutes: 60 })], { now: NOW })).toContain('TRIGGER:-PT1H');
    expect(buildIcs([base({ reminderMinutes: 1440 })], { now: NOW })).toContain('TRIGGER:-P1D');
    expect(buildIcs([base({ reminderMinutes: 90 })], { now: NOW })).toContain('TRIGGER:-PT1H30M');
  });

  it('escapes commas, semicolons and newlines in text values', () => {
    const ics = buildIcs([base({ title: 'Meet Anna, Pēteris; prep', description: 'line1\nline2' })], { now: NOW });
    expect(ics).toContain('SUMMARY:Meet Anna\\, Pēteris\\; prep');
    expect(ics).toContain('DESCRIPTION:line1\\nline2');
  });

  it('includes every event in a multi-event calendar', () => {
    const ics = buildIcs([base({ uid: 'a', title: 'A' }), base({ uid: 'b', title: 'B' })], { now: NOW });
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(ics).toContain('UID:a');
    expect(ics).toContain('UID:b');
  });
});
