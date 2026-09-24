/**
 * Entitlement → capability resolution (AI_RECAP_TECHNICAL_ARCHITECTURE.md §18).
 *
 * We model capabilities as a set rather than a single "plan" enum, because BYOK-lifetime and
 * Unlimited are different feature sets that can co-exist. The effective capability is the most
 * permissive union of everything the user owns, on top of the Free baseline.
 */

export interface Capabilities {
  /** Hard per-recording cap in minutes. Free 15 · paid 90 (launch decision 2026-09-25). */
  maxRecordingMinutes: number;
  /** Max recaps started per day; null = no daily cap. */
  maxRecapsPerDay: number | null;
  hostedTranscription: boolean;
  hostedLLM: boolean;
  byokEnabled: boolean;
  watch: boolean;
  export: boolean;
  advancedTemplates: boolean;
}

export interface Entitlements {
  unlimitedActive: boolean;
  byokLifetime: boolean;
}

/**
 * LAUNCH SWITCH. `true` lifts every cap for TestFlight quality tuning (no daily cap, 90-minute
 * recordings on the Free plan too). `false` = store limits: Free 15 min / 5 per day, paid 90 min.
 * One place, one line — see docs/LAUNCH_CHECKLIST.md.
 */
export const TESTING_MODE = false;

const LIMITS = TESTING_MODE
  ? { freeMinutes: 90, freePerDay: null as number | null, paidMinutes: 90 }
  : { freeMinutes: 15, freePerDay: 5 as number | null, paidMinutes: 90 };

export const FREE_CAPABILITIES: Capabilities = {
  maxRecordingMinutes: LIMITS.freeMinutes,
  maxRecapsPerDay: LIMITS.freePerDay,
  hostedTranscription: true,
  hostedLLM: true, // standard model, basic summary
  byokEnabled: false,
  watch: false,
  export: false,
  advancedTemplates: false,
};

export const PAID_RECORDING_MINUTES = LIMITS.paidMinutes;

export function resolveCapabilities(entitlements: Entitlements): Capabilities {
  let caps: Capabilities = { ...FREE_CAPABILITIES };

  if (entitlements.byokLifetime) {
    caps = {
      ...caps,
      maxRecordingMinutes: Math.max(caps.maxRecordingMinutes, PAID_RECORDING_MINUTES),
      byokEnabled: true,
      export: true,
      advancedTemplates: true,
      watch: true,
    };
  }

  if (entitlements.unlimitedActive) {
    caps = {
      ...caps,
      maxRecordingMinutes: Math.max(caps.maxRecordingMinutes, PAID_RECORDING_MINUTES),
      maxRecapsPerDay: null,
      hostedTranscription: true,
      hostedLLM: true,
      export: true,
      advancedTemplates: true,
      watch: true,
    };
  }

  return caps;
}

export const NO_ENTITLEMENTS: Entitlements = { unlimitedActive: false, byokLifetime: false };
