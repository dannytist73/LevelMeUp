// M13: LevelMeUp Plus on the phone, pure so the screens and their tests agree. Whether the player is Plus is the server's
// answer (state.plus); these only say what the screens show for it.
import { PLUS_TEXT, fillText } from '@levelmeup/content';
import type { PlusView } from '../../../../supabase/functions/_shared/plus.ts';
import type { Shown } from '../game/project.ts';
import { dateLine } from '../lib/dates.ts';
import type { Offer } from '../state/store.ts';
import { FREE_THEME } from '../theme/palettes.ts';
import type { ThemeName } from '../theme/palettes.ts';

export type { PlusView };

export const NOT_PLUS: PlusView = { active: false, source: null, product: null, endsAt: null, trial: false, willRenew: null, manageUrl: null };

/** The server's Plus view; a state cached before the server knew Plus (M13) has none: not Plus. */
export const plusOf = (view: Pick<Shown, 'plus'> | null): PlusView => view?.plus ?? NOT_PLUS;

/** Portrait frames: none is free, three are Plus, Founder is the beta testers' own (never sold). */
export type FrameName = 'none' | 'moon' | 'rune' | 'crest' | 'founder';
export const FRAMES: readonly FrameName[] = ['none', 'moon', 'rune', 'crest', 'founder'];
export const asFrame = (value: unknown): FrameName => (FRAMES as readonly unknown[]).includes(value) ? (value as FrameName) : 'none';

export function frameAllowed(frame: FrameName, plus: PlusView): boolean {
  if (frame === 'none') return true;
  if (frame === 'founder') return plus.active && plus.source === 'beta_founder';
  return plus.active;
}

/** What the player picked, while it is theirs to use; Monster Night and no frame otherwise (a lapsed Plus keeps nothing locked). */
export const shownTheme = (theme: ThemeName, plus: PlusView): ThemeName => (plus.active ? theme : FREE_THEME);
export const shownFrame = (frame: FrameName, plus: PlusView): FrameName => (frameAllowed(frame, plus) ? frame : 'none');

const PLAN_NAME = { plus_monthly: 'monthly', plus_yearly: 'yearly', plus_lifetime: 'lifetime' } as const;

/** Settings' line for Plus: "Plus, yearly: renews Tue 17 Nov", "Plus, free trial: ends …", "Not on Plus". */
export function statusLine(plus: PlusView, timeZone: string): string {
  const S = PLUS_TEXT.settings.status;
  const date = plus.endsAt === null ? '' : dateLine(Date.parse(plus.endsAt), timeZone);
  if (!plus.active) return plus.source === 'play' && plus.endsAt !== null ? fillText(S.ended, { date }) : PLUS_TEXT.settings.free;
  if (plus.source === 'beta_founder') return S.founder;
  if (plus.product === 'plus_lifetime' || plus.endsAt === null) return S.lifetime;
  if (plus.trial) return fillText(S.trial, { date });
  const plan = plus.product === null ? 'monthly' : PLAN_NAME[plus.product];
  return fillText(plus.willRenew === false ? S.ends : S.renews, { plan, date });
}

/** A Play subscription the player can manage or cancel (Google requires the way to be in the app). */
export const canManage = (plus: PlusView): boolean => plus.source === 'play' && plus.product !== 'plus_lifetime' && plus.endsAt !== null;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Today's one-time Plus cards (plan: "once on Day 7, then only from a Plus item"): never while anything else is asked of
 * the player, so never on a protected, hard or slipped day, nor before the core quest is cleared.
 */
export function plusCard(view: Pick<Shown, 'today' | 'checkin' | 'plus'>, offers: readonly Offer[], nowMs: number, onSale: boolean): 'day7' | 'trial' | null {
  const today = view.today;
  if (today === null || view.checkin !== null) return null;
  const core = today.quests.find((q) => q.slot === 'core');
  if (core === undefined || core.completedAt === null || today.protection !== null || today.hardDay) return null;
  const plus = plusOf(view);
  // The free trial's own card, from two days before it ends (the offer's "Day 5").
  if (plus.active && plus.trial && plus.endsAt !== null && !offers.includes('plus:trial')) {
    const left = Date.parse(plus.endsAt) - nowMs;
    if (left > 0 && left <= 2 * DAY_MS) return 'trial';
  }
  if (onSale && !plus.active && today.dayNumber >= 7 && !offers.includes('plus:day7')) return 'day7';
  return null;
}
