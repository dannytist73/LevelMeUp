// The set-up cards (M12, plan decision 8): what the onboarding stopped asking, offered once each on days 1 to 3 in
// Today's notice strip, once the day's core quest is cleared (they never push the quest down). Only for a character that
// onboarded after M12. Pure, so Today and its tests agree.
import type { Offer } from '../state/store.ts';
import { trainingUnset } from './character.ts';
import type { Shown } from './project.ts';

export type SetupCard = 'save' | 'voice' | 'gear' | 'slip' | 'vow';

/** The day each card is first offered, in order. */
const CARDS: readonly { card: SetupCard; day: number }[] = [
  { card: 'save', day: 1 }, { card: 'voice', day: 1 }, { card: 'gear', day: 2 }, { card: 'slip', day: 2 }, { card: 'vow', day: 3 },
];

export type SetupInput = { view: Pick<Shown, 'today' | 'profile'>; offers: readonly Offer[]; saved: boolean; vow: string | null };

/** The card to offer now, or none. */
export function setupCard({ view, offers, saved, vow }: SetupInput): SetupCard | null {
  const today = view.today;
  if (!offers.includes('setup') || today === null) return null;
  const core = today.quests.find((q) => q.slot === 'core');
  if (core !== undefined && core.completedAt === null) return null;
  const wanted = (card: SetupCard): boolean => {
    switch (card) {
      case 'save': return !saved;
      case 'voice': return view.profile.voice === 'system';
      // Strength work is possible and nothing is set up yet (the Training step's own rule).
      case 'gear': return trainingUnset(view.profile);
      case 'slip': return true;
      case 'vow': return vow === null;
    }
  };
  return CARDS.find((c) => today.dayNumber >= c.day && !offers.includes(`setup:${c.card}`) && wanted(c.card))?.card ?? null;
}
