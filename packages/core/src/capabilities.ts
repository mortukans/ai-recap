/**
 * Entitlement → capability resolution (AI_RECAP_TECHNICAL_ARCHITECTURE.md §18).
 *
 * We model capabilities as a set rather than a single "plan" enum, because BYOK-lifetime and
 * Unlimited are different feature sets that can co-exist. The effective capability is the most
 * permissive union of everything the user owns, on top of the Free baseline.
 */

export interface Capabilities {
  /** Hard per-recording cap in minutes. Free 15 · paid 60 (launch cap, Product Plan §22). */
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

export const FREE_CAPABILITIES: Capabilities = {
  maxRecordingMinutes: 15,
  // TESTING: daily cap lifted for TestFlight testing (2026-09-19). Restore to 5 before public launch.
  maxRecapsPerDay: null,
  hostedTranscription: true,
  hostedLLM: true, // standard model, basic summary
  byokEnabled: false,
  watch: false,
  export: false,
  advancedTemplates: false,
};

export const PAID_RECORDING_MINUTES = 60;

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
