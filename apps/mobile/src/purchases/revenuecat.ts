/**
 * RevenueCat wrapper (AI_RECAP_TECHNICAL_ARCHITECTURE.md §18, MVP task M5-1).
 * The RevenueCat app user id is the Supabase auth user id, so the webhook can map purchases to our
 * `entitlements` table. Everything here is tolerant of a missing key (dev/preview builds).
 */
import { type Entitlements, NO_ENTITLEMENTS } from '@ai-recap/core';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

import { config } from '../config';

/** Entitlement identifiers configured in the RevenueCat dashboard. */
export const RC_ENTITLEMENT_UNLIMITED = 'unlimited';
export const RC_ENTITLEMENT_BYOK = 'byok';

/** Store product identifiers (App Store Connect / Play Console). */
export const PRODUCT_UNLIMITED_MONTHLY = 'lv.airecap.unlimited.monthly';
export const PRODUCT_BYOK_LIFETIME = 'lv.airecap.byok.lifetime';

let configured = false;

function apiKey(): string {
  return Platform.OS === 'ios' ? config.revenueCatIosKey : config.revenueCatAndroidKey;
}

export function isPurchasesConfigured(): boolean {
  return configured;
}

/** Configure once per launch; `appUserId` is the Supabase user id when a session exists. */
export async function configurePurchases(appUserId: string | null): Promise<void> {
  const key = apiKey();
  if (!key) return;
  try {
    if (!configured) {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
      Purchases.configure({ apiKey: key, appUserID: appUserId ?? undefined });
      configured = true;
    } else if (appUserId) {
      await Purchases.logIn(appUserId);
    }
  } catch (e) {
    console.warn('[purchases] configure failed:', String(e));
  }
}

export function entitlementsFromCustomerInfo(info: CustomerInfo): Entitlements {
  const active = info.entitlements.active;
  return {
    unlimitedActive: RC_ENTITLEMENT_UNLIMITED in active,
    byokLifetime: RC_ENTITLEMENT_BYOK in active,
  };
}

export async function getStoreEntitlements(): Promise<Entitlements> {
  if (!configured) return NO_ENTITLEMENTS;
  try {
    return entitlementsFromCustomerInfo(await Purchases.getCustomerInfo());
  } catch {
    return NO_ENTITLEMENTS;
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  try {
    return (await Purchases.getOfferings()).current;
  } catch {
    return null;
  }
}

/** Returns the resulting entitlements, or null if the user cancelled. Throws on store errors. */
export async function purchase(pkg: PurchasesPackage): Promise<Entitlements | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return entitlementsFromCustomerInfo(customerInfo);
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return null;
    throw e;
  }
}

export async function restore(): Promise<Entitlements> {
  return entitlementsFromCustomerInfo(await Purchases.restorePurchases());
}

export function onCustomerInfoChange(listener: (e: Entitlements) => void): void {
  if (!configured) return;
  Purchases.addCustomerInfoUpdateListener((info) => listener(entitlementsFromCustomerInfo(info)));
}
