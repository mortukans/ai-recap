/**
 * Entitlement source. STUB: returns Free until RevenueCat + the backend webhook land (M5 on device).
 * The real implementation will read RevenueCat customer info and/or GET /entitlements (server truth).
 */
import { type Entitlements, NO_ENTITLEMENTS } from '@ai-recap/core';

export async function fetchEntitlements(): Promise<Entitlements> {
  return NO_ENTITLEMENTS;
}
