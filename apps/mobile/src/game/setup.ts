// The set-up items (M12, plan decision 8): what the onboarding stopped asking. They were offered once each on days 1 to 3 in
// Today's notice strip; a simpler day (docs/2026-10-26-simpler-day.md, decision 9) lists them on Me instead, with the
// other one-time offers (training, the weekly program, the morning briefing, Plus), so Camp asks nothing extra. Pure, so
// Me, the tab bar's dot and their tests agree.
import type { Offer } from '../state/store.ts';
import { trainingUnset } from './character.ts';
import type { Shown } from './project.ts';

export type SetupCard = 'save' | 'voice' | 'gear' | 'slip' | 'vow';
export type SetUpItem = SetupCard | 'training' | 'program' | 'reminder' | 'plus';

/** M16: workouts done before the weekly program is offered. */
const PROGRAM_OFFER_WORKOUTS = 3;

/** The cards in the order they were first offered. */
const CARDS: readonly SetupCard[] = ['save', 'voice', 'gear', 'slip', 'vow'];

export type SetupInput = { view: Pick<Shown, 'today' | 'profile' | 'workoutsDone'>; offers: readonly Offer[]; saved: boolean; vow: string | null };

/** Whether a card still has something to set up. */
function wanted(card: SetupCard, { view, saved, vow }: SetupInput): boolean {
  switch (card) {
    case 'save': return !saved;
    case 'voice': return view.profile.voice === 'system';
    // Strength work is possible and nothing is set up yet (the Training step's own rule).
    case 'gear': return trainingUnset(view.profile);
    case 'slip': return true;
    case 'vow': return vow === null;
  }
}

/**
 * M16 decision 9: the weekly program, offered once, after 3 workouts on the step-by-step plan, while strength work is
 * possible (no gentle start, no own plan).
 */
export function programOffered(view: Pick<Shown, 'profile' | 'workoutsDone'>, offers: readonly Offer[]): boolean {
  const p = view.profile;
  if (offers.includes('program') || (p.trainingPlan ?? 'build') !== 'build' || p.gentleStart || p.ownProgram) return false;
  return (view.workoutsDone ?? 0) >= PROGRAM_OFFER_WORKOUTS;
}

export type SetUpInput = SetupInput & {
  /** A player from before M6c was asked once to set up training (M6d decision 13). */
  trainingNoticeSeen: boolean;
  /** The morning briefing isn't on, wasn't answered, and the phone can still ask (Today's old offer). */
  reminder: boolean;
  /** Plus's one-time card, as `plusCard` decides it. */
  plus: boolean;
};

/** What Me's Set up list holds, in order. The set-up cards are for a character that onboarded after M12. */
export function setUpItems(input: SetUpInput): SetUpItem[] {
  const { view, offers } = input;
  const items: SetUpItem[] = offers.includes('setup')
    ? CARDS.filter((card) => !offers.includes(`setup:${card}`) && wanted(card, input))
    : [];
  if (!items.includes('gear') && !input.trainingNoticeSeen && trainingUnset(view.profile)) items.push('training');
  if (programOffered(view, offers)) items.push('program');
  if (input.reminder) items.push('reminder');
  if (input.plus) items.push('plus');
  return items;
}
