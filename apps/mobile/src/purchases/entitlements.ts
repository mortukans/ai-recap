/**
 * Entitlement store (MVP task M5-2). Resolution order:
 *   1. server truth — GET /entitlements (Supabase Edge Function, RevenueCat webhook-fed)
 *   2. RevenueCat customer info on the device (works before the webhook lands / offline)
 *   3. last known value cached on device
 *   4. Free
 * Consumers subscribe via `subscribeEntitlements`; `useCapabilities` derives the capability set.
 */
import { type Entitlements, NO_ENTITLEMENTS } from '@ai-recap/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isBackendConfigured } from '../config';
import { ensureSession, supabase } from '../api/supabase';
import { getStoreEntitlements, isPurchasesConfigured, onCustomerInfoChange } from './revenuecat';

const CACHE_KEY = 'airecap.entitlements';

let current: Entitlements = NO_ENTITLEMENTS;
let loaded = false;
const listeners = new Set<(e: Entitlements) => void>();

function merge(a: Entitlements, b: Entitlements): Entitlements {
  // A purchase seen by either source counts; the server can only add authority, not hide a receipt
  // the device already holds (webhook lag).
  return { unlimitedActive: a.unlimitedActive || b.unlimitedActive, byokLifetime: a.byokLifetime || b.byokLifetime };
}

function set(e: Entitlements): void {
  current = e;
  loaded = true;
  void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(e)).catch(() => undefined);
  for (const l of listeners) l(e);
}

async function fetchServerEntitlements(): Promise<Entitlements | null> {
  if (!isBackendConfigured()) return null;
  try {
    await ensureSession();
    const { data, error } = await supabase.functions.invoke<{ unlimitedActive: boolean; byokLifetime: boolean }>(
      'entitlements',
      { method: 'GET' },
    );
    if (error || !data) return null;
    return { unlimitedActive: !!data.unlimitedActive, byokLifetime: !!data.byokLifetime };
  } catch {
    return null;
  }
}

/** Current value (synchronous); Free until the first refresh completes. */
export function getEntitlements(): Entitlements {
  return current;
}

export function subscribeEntitlements(listener: (e: Entitlements) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-resolve from server + store. Safe to call often. */
export async function refreshEntitlements(): Promise<Entitlements> {
  const [server, store] = await Promise.all([fetchServerEntitlements(), getStoreEntitlements()]);
  const resolved = merge(server ?? NO_ENTITLEMENTS, store);
  // Nothing authoritative reachable → keep whatever we last knew.
  if (server === null && !isPurchasesConfigured()) return current;
  set(resolved);
  return resolved;
}

/** Apply a result that came straight from a purchase/restore call. */
export function applyEntitlements(e: Entitlements): void {
  set(merge(current, e));
}

/** Bootstrap: load the cache, then refresh; keep following RevenueCat updates. */
export async function initEntitlements(): Promise<void> {
  if (!loaded) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        current = JSON.parse(raw) as Entitlements;
        loaded = true;
      }
    } catch {
      /* no cache */
    }
  }
  onCustomerInfoChange((e) => set(merge(e, current)));
  await refreshEntitlements();
}

/** Backwards-compatible accessor used by older call sites. */
export async function fetchEntitlements(): Promise<Entitlements> {
  return loaded ? current : refreshEntitlements();
}
