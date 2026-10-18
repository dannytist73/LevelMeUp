// M13 (plan docs/superpowers/plans/2026-10-18-m13-plus.md): the phone's only door to RevenueCat
// (react-native-purchases), as sound.ts is to expo-audio; tests mock this module (test/support/setup.ts). RevenueCat's
// customer is the player's LevelMeUp id, so the server asks RevenueCat about the same person (lmu-plus). What the phone
// hears here only starts a check: whether the player is Plus is the server's answer (state.plus).
import { Platform } from 'react-native';
import Purchases, { PACKAGE_TYPE, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import type { PurchasesPackage, PurchasesStoreProduct } from 'react-native-purchases';
import { REVENUECAT_ANDROID_KEY } from '../config.ts';

export type PlanKind = 'yearly' | 'monthly' | 'lifetime';
/** One plan as Google Play prices it for this player (their currency, their taxes). */
export type Plan = { kind: PlanKind; price: string; trialDays: number | null; pkg: unknown };
export type Shop = { ok: true; plans: Plan[] } | { ok: false; reason: 'not_set_up' | 'unavailable' };
export type Bought = 'bought' | 'cancelled' | 'pending' | 'owned' | 'failed' | 'not_set_up';
export type Restored = 'found' | 'none' | 'failed' | 'not_set_up';

const ENTITLEMENT = 'plus';
const KIND: Partial<Record<PACKAGE_TYPE, PlanKind>> = {
  [PACKAGE_TYPE.ANNUAL]: 'yearly', [PACKAGE_TYPE.MONTHLY]: 'monthly', [PACKAGE_TYPE.LIFETIME]: 'lifetime',
};
const ORDER: readonly PlanKind[] = ['yearly', 'monthly', 'lifetime'];

/** RevenueCat runs only on Android, and only once the owner has put the public key in config.ts. */
export const purchasesSetUp = (): boolean => Platform.OS === 'android' && REVENUECAT_ANDROID_KEY !== '';

let configuredFor: string | null = null;

let configured = false;

async function ready(playerId: string): Promise<boolean> {
  if (!purchasesSetUp()) return false;
  try {
    if (!configured) {
      Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY, appUserID: playerId });
      configured = true;
    } else if (configuredFor !== playerId) {
      await Purchases.logIn(playerId);
    }
    configuredFor = playerId;
    return true;
  } catch {
    return false;
  }
}

/** Days of a free first phase (Google's free trial), from its ISO 8601 period: P7D, P1W. */
export function freeDays(iso: string | null | undefined): number | null {
  const m = /^P(\d+)([DW])$/.exec(iso ?? '');
  if (m === null) return null;
  return Number(m[1]) * (m[2] === 'W' ? 7 : 1);
}

function trialDaysOf(product: PurchasesStoreProduct): number | null {
  const free = product.defaultOption?.freePhase?.billingPeriod?.iso8601 ?? (product.introPrice?.price === 0 ? product.introPrice.period : null);
  return freeDays(free);
}

/** Plus's plans in their order (yearly, monthly, lifetime), each with Google Play's own price string. */
export async function shop(playerId: string): Promise<Shop> {
  if (!(await ready(playerId))) return { ok: false, reason: purchasesSetUp() ? 'unavailable' : 'not_set_up' };
  try {
    const packages = (await Purchases.getOfferings()).current?.availablePackages ?? [];
    const plans = packages.flatMap((pkg): Plan[] => {
      const kind = KIND[pkg.packageType];
      return kind === undefined ? [] : [{ kind, price: pkg.product.priceString, trialDays: kind === 'yearly' ? trialDaysOf(pkg.product) : null, pkg }];
    });
    plans.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    return plans.length === 0 ? { ok: false, reason: 'unavailable' } : { ok: true, plans };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Google Play's own purchase sheet for one plan. */
export async function buy(playerId: string, plan: Plan): Promise<Bought> {
  if (!(await ready(playerId))) return purchasesSetUp() ? 'failed' : 'not_set_up';
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg as PurchasesPackage);
    return customerInfo.entitlements.active[ENTITLEMENT] !== undefined ? 'bought' : 'pending';
  } catch (error) {
    if ((error as { userCancelled?: boolean | null }).userCancelled === true) return 'cancelled';
    const code = (error as { code?: unknown }).code;
    if (typeof code !== 'string') return 'failed';
    // Google's "pending" payments (cash, some cards) finish later; RevenueCat reports them as this code.
    if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    // This Google account already has it (review): Restore brings it to this character.
    if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) return 'owned';
    return 'failed';
  }
}

/** After a character is deleted (review): RevenueCat stops speaking for that player; the next one logs in afresh. */
export async function forgetPurchases(): Promise<void> {
  if (configuredFor === null) return;
  configuredFor = null;
  try {
    await Purchases.logOut();
  } catch {
    // Already anonymous, or RevenueCat unreachable: nothing of the deleted player is left to speak for.
  }
}

/** Finds Plus bought with the Google account on this phone, including on another character. */
export async function restore(playerId: string): Promise<Restored> {
  if (!(await ready(playerId))) return purchasesSetUp() ? 'failed' : 'not_set_up';
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[ENTITLEMENT] !== undefined ? 'found' : 'none';
  } catch {
    return 'failed';
  }
}

/** Whether RevenueCat, from what it last heard (cached on the phone), says Plus is active: a cue to ask the server. */
export async function storeSaysPlus(playerId: string): Promise<boolean> {
  if (!(await ready(playerId))) return false;
  try {
    return (await Purchases.getCustomerInfo()).entitlements.active[ENTITLEMENT] !== undefined;
  } catch {
    return false;
  }
}

/** Google Play's subscription page for Plus (Google's required way to cancel), or the general one. */
export function manageUrl(product: string | null): string {
  const base = 'https://play.google.com/store/account/subscriptions';
  return product === null || product === 'plus_lifetime' ? base : `${base}?sku=${product}&package=com.dannytist.levelmeup`;
}
