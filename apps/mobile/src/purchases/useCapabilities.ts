import { type Capabilities, type Entitlements, resolveCapabilities } from '@ai-recap/core';
import { useEffect, useState } from 'react';

import { getEntitlements, subscribeEntitlements } from './entitlements';

/** Live capability set derived from entitlements (server truth + RevenueCat + cache). */
export function useCapabilities(): Capabilities {
  const [caps, setCaps] = useState<Capabilities>(() => resolveCapabilities(getEntitlements()));
  useEffect(() => subscribeEntitlements((e) => setCaps(resolveCapabilities(e))), []);
  return caps;
}

/**
 * Live raw entitlements (which products the user actually owns). Prefer `useCapabilities` for gating;
 * use this only when you must tell Unlimited and BYOK apart — both lift the daily cap, so the derived
 * capability set no longer distinguishes them.
 */
export function useEntitlements(): Entitlements {
  const [ent, setEnt] = useState<Entitlements>(() => getEntitlements());
  useEffect(() => subscribeEntitlements(setEnt), []);
  return ent;
}
