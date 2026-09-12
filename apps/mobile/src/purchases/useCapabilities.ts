import { type Capabilities, FREE_CAPABILITIES, resolveCapabilities } from '@ai-recap/core';
import { useEffect, useState } from 'react';
import { fetchEntitlements } from './entitlements';

/** Resolve the current capability set. Free until entitlements arrive (RevenueCat/backend). */
export function useCapabilities(): Capabilities {
  const [caps, setCaps] = useState<Capabilities>(FREE_CAPABILITIES);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = resolveCapabilities(await fetchEntitlements());
      if (!cancelled) setCaps(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return caps;
}
