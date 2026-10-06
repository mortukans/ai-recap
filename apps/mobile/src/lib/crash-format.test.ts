import { describe, expect, it } from 'vitest';

import { type DeviceEnv, buildErrorPayload, clip, sanitizeRoute, signatureOf } from './crash-format';

const env: DeviceEnv = { appVersion: '1.0.1', buildNumber: '34', platform: 'ios', osVersion: '17.5', deviceModel: "Martin's iPhone" };

describe('sanitizeRoute', () => {
  it('strips id-like and numeric segments to :id', () => {
    expect(sanitizeRoute('/recap/abc12345-def6-7890')).toBe('/recap/:id');
    expect(sanitizeRoute('/transcript/9f8e7d6c5b4a')).toBe('/transcript/:id');
    expect(sanitizeRoute('/recap/42')).toBe('/recap/:id');
  });
  it('keeps plain route words', () => {
    expect(sanitizeRoute('/(tabs)/settings')).toBe('/(tabs)/settings');
    expect(sanitizeRoute('/paywall')).toBe('/paywall');
  });
  it('falls back to "app" for empty/invalid input', () => {
    expect(sanitizeRoute('')).toBe('app');
    expect(sanitizeRoute('/')).toBe('app');
    // @ts-expect-error runtime guard for non-strings
    expect(sanitizeRoute(undefined)).toBe('app');
  });
});

describe('clip', () => {
  it('trims, truncates, and nulls empties', () => {
    expect(clip('  hi  ', 10)).toBe('hi');
    expect(clip('abcdef', 3)).toBe('abc');
    expect(clip('   ', 10)).toBeNull();
    expect(clip(42, 10)).toBeNull();
  });
});

describe('buildErrorPayload', () => {
  const now = new Date('2026-09-25T01:00:00.000Z');

  it('extracts name/message/stack from a real Error and carries env + breadcrumb', () => {
    const err = new TypeError('boom');
    err.stack = 'TypeError: boom\n  at foo';
    const p = buildErrorPayload(err, { fatal: true, context: '/recap/:id' }, env, 'app', now);
    expect(p).toMatchObject({
      app_version: '1.0.1',
      build_number: '34',
      platform: 'ios',
      os_version: '17.5',
      device_model: "Martin's iPhone",
      fatal: true,
      name: 'TypeError',
      message: 'boom',
      context: '/recap/:id',
      occurred_at: '2026-09-25T01:00:00.000Z',
    });
    expect(p.stack).toContain('at foo');
  });

  it('uses the breadcrumb when no explicit context is given, and defaults fatal to false', () => {
    const p = buildErrorPayload(new Error('x'), {}, env, '/(tabs)/index', now);
    expect(p.context).toBe('/(tabs)/index');
    expect(p.fatal).toBe(false);
  });

  it('handles a thrown string', () => {
    const p = buildErrorPayload('plain failure', {}, env, 'app', now);
    expect(p.name).toBe('Error');
    expect(p.message).toBe('plain failure');
    expect(p.stack).toBeNull();
  });

  it('truncates an overlong message and stack', () => {
    const err = new Error('m'.repeat(5000));
    err.stack = 's'.repeat(20000);
    const p = buildErrorPayload(err, {}, env, 'app', now);
    expect(p.message?.length).toBe(2000);
    expect(p.stack?.length).toBe(8000);
  });
});

describe('signatureOf', () => {
  it('ignores context (same fault dedupes across routes) but differs across faults', () => {
    const err = new Error('boom');
    err.stack = 'Error: boom\n  at same';
    const a = buildErrorPayload(err, { context: '/a' }, env, 'app');
    const b = buildErrorPayload(err, { context: '/b' }, env, 'app'); // same underlying error, different route
    const c = buildErrorPayload(Object.assign(new Error('different'), { stack: 'Error: different\n  at x' }), {}, env, 'app');
    expect(signatureOf(a)).toBe(signatureOf(b));
    expect(signatureOf(a)).not.toBe(signatureOf(c));
  });
});
