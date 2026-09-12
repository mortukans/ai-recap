import { describe, expect, it } from 'vitest';
import { FREE_CAPABILITIES, NO_ENTITLEMENTS, PAID_RECORDING_MINUTES, resolveCapabilities } from './capabilities';

describe('resolveCapabilities', () => {
  it('returns the Free baseline with no entitlements', () => {
    expect(resolveCapabilities(NO_ENTITLEMENTS)).toEqual(FREE_CAPABILITIES);
    expect(FREE_CAPABILITIES.maxRecordingMinutes).toBe(15);
    expect(FREE_CAPABILITIES.maxRecapsPerDay).toBe(5);
  });

  it('Unlimited lifts the caps and enables hosted AI', () => {
    const c = resolveCapabilities({ unlimitedActive: true, byokLifetime: false });
    expect(c.maxRecordingMinutes).toBe(PAID_RECORDING_MINUTES);
    expect(c.maxRecapsPerDay).toBeNull();
    expect(c.hostedLLM).toBe(true);
    expect(c.export).toBe(true);
    expect(c.watch).toBe(true);
  });

  it('BYOK enables the key + advanced features but keeps the daily cap', () => {
    const c = resolveCapabilities({ unlimitedActive: false, byokLifetime: true });
    expect(c.byokEnabled).toBe(true);
    expect(c.maxRecordingMinutes).toBe(PAID_RECORDING_MINUTES);
    expect(c.advancedTemplates).toBe(true);
    expect(c.maxRecapsPerDay).toBe(5);
  });

  it('BYOK + Unlimited co-exist as the most-permissive union', () => {
    const c = resolveCapabilities({ unlimitedActive: true, byokLifetime: true });
    expect(c.byokEnabled).toBe(true);
    expect(c.hostedLLM).toBe(true);
    expect(c.maxRecapsPerDay).toBeNull();
  });
});
