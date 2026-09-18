import { type Capabilities, resolveCapabilities } from '@ai-recap/core';
import { useEffect, useState } from 'react';

import { getEntitlements, subscribeEntitlements } from './entitlements';

/** Live capability set derived from entitlements (server truth + RevenueCat + cache). */
export function useCapabilities(): Capabilities {
  const [caps, setCaps] = useState<Capabilities>(() => resolveCapabilities(getEntitlements()));
  useEffect(() => subscribeEntitlements((e) => setCaps(resolveCapabilities(e))), []);
  return caps;
}
