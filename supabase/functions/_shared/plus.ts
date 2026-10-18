// M13 (plan docs/superpowers/plans/2026-10-18-m13-plus.md): LevelMeUp Plus. Our server is the one answer to "is this
// player Plus?" (decision 1): a Play purchase is stored only from what RevenueCat says, asked with our secret key, never
// from what the phone says. Pure: no database or network access here, so Vitest runs it in Node.
import { STATS, statPoints } from '../../../packages/rules/src/index.ts';
import type { StatMap } from '../../../packages/rules/src/index.ts';

/** RevenueCat's entitlement id for Plus, and Play's product ids (Play Console, owner step 6). */
export const PLUS_ENTITLEMENT = 'plus';
export const PLUS_PRODUCTS = ['plus_monthly', 'plus_yearly', 'plus_lifetime'] as const;
export type PlusProduct = (typeof PLUS_PRODUCTS)[number];

export const REVENUECAT_API = 'https://api.revenuecat.com/v1';

/** A stored grant (levelmeup.entitlements). */
export type EntitlementRow = {
  source: 'beta_founder' | 'play';
  product: PlusProduct | null;
  starts_at: Date;
  /** Null: no end (Lifetime, or the Founder grant). */
  ends_at: Date | null;
  trial: boolean;
  will_renew: boolean | null;
  manage_url: string | null;
};

/** What RevenueCat says the player holds from Play, ready for levelmeup.set_play_plus. */
export type PlayPlus = {
  product: PlusProduct;
  /** Null for Lifetime. */
  endsAt: string | null;
  trial: boolean;
  /** Null for Lifetime; false once the player has cancelled (the period still runs to its end). */
  willRenew: boolean | null;
  manageUrl: string | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const dateOrNull = (v: unknown): string | null | undefined => {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) return undefined;
  return new Date(v).toISOString();
};

/**
 * Plus as RevenueCat's GET /v1/subscribers/{app_user_id} reports it: null when the player has never held it (or the
 * answer isn't one we understand, which stores nothing new). A subscription's end is the later of its expiry and a
 * billing grace period; Lifetime has none. Play's subscription ids arrive alone or as `id:basePlan`.
 */
export function playFromSubscriber(body: unknown): PlayPlus | null {
  if (!isRecord(body) || !isRecord(body.subscriber)) return null;
  const sub = body.subscriber;
  const entitlement = isRecord(sub.entitlements) ? sub.entitlements[PLUS_ENTITLEMENT] : undefined;
  if (!isRecord(entitlement) || typeof entitlement.product_identifier !== 'string') return null;
  const product = entitlement.product_identifier.split(':')[0] as PlusProduct;
  if (!PLUS_PRODUCTS.includes(product)) return null;
  const expires = dateOrNull(entitlement.expires_date);
  const grace = dateOrNull(entitlement.grace_period_expires_date);
  if (expires === undefined || grace === undefined) return null;
  const manageUrl = typeof sub.management_url === 'string' && sub.management_url.startsWith('https://') && sub.management_url.length <= 500
    ? sub.management_url
    : null;
  if (product === 'plus_lifetime' || expires === null) {
    return { product, endsAt: null, trial: false, willRenew: null, manageUrl: null };
  }
  const subscriptions = isRecord(sub.subscriptions) ? sub.subscriptions : {};
  const detail = subscriptions[entitlement.product_identifier] ?? subscriptions[product];
  const s = isRecord(detail) ? detail : {};
  const endsAt = grace !== null && grace > expires ? grace : expires;
  return {
    product,
    endsAt,
    trial: s.period_type === 'trial',
    willRenew: s.unsubscribe_detected_at === null || s.unsubscribe_detected_at === undefined,
    manageUrl,
  };
}

/** Plus as the phone shows it (state.plus). */
export type PlusView = {
  active: boolean;
  /** What grants it now, or the Play row that ended (so Settings can say so); null: never Plus. */
  source: 'beta_founder' | 'play' | null;
  product: PlusProduct | null;
  endsAt: string | null;
  trial: boolean;
  willRenew: boolean | null;
  manageUrl: string | null;
};

export const NOT_PLUS: PlusView = { active: false, source: null, product: null, endsAt: null, trial: false, willRenew: null, manageUrl: null };

const live = (row: EntitlementRow, now: Date) => row.ends_at === null || row.ends_at > now;

/** Whether the player is Plus at `now`: a Play row first (it has a subscription to manage), then the Founder grant. */
export function plusView(rows: readonly EntitlementRow[], now: Date): PlusView {
  const play = rows.find((r) => r.source === 'play');
  const founder = rows.find((r) => r.source === 'beta_founder');
  const view = (row: EntitlementRow, active: boolean): PlusView => ({
    active, source: row.source, product: row.product, endsAt: row.ends_at === null ? null : row.ends_at.toISOString(),
    trial: active && row.trial, willRenew: row.will_renew, manageUrl: row.manage_url,
  });
  if (play !== undefined && live(play, now)) return view(play, true);
  if (founder !== undefined && live(founder, now)) return view(founder, true);
  if (play !== undefined) return view(play, false);
  return NOT_PLUS;
}

/** One week of the all-time stat chart (Plus): each stat's points at the week's end. */
export type StatWeek = { week: string; points: StatMap };

/** Weekly XP sums by stat (oldest first, `week` = the Monday, YYYY-MM-DD) into running points per stat. */
export function statWeeks(start: StatMap, sums: readonly { week: string; stat: string; xp: number }[]): StatWeek[] {
  const weeks = [...new Set(sums.map((r) => r.week))].sort();
  const xp = Object.fromEntries(STATS.map((s) => [s, 0])) as StatMap;
  return weeks.map((week) => {
    for (const r of sums) if (r.week === week && (STATS as readonly string[]).includes(r.stat)) xp[r.stat as keyof StatMap] += r.xp;
    return { week, points: Object.fromEntries(STATS.map((s) => [s, statPoints(start[s], Math.max(0, xp[s]))])) as StatMap };
  });
}
