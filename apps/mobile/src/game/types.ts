// The phone's view of the game, typed from the server's own modules so the two can't drift apart (M4 plan, decision 2).
import type { Rating } from '@levelmeup/rules';
import type { PhoneEvent, ProvisionalDayEvent, SlotRef } from '../../../../supabase/functions/_shared/events.ts';
import type { OnboardingBody, Reveal } from '../../../../supabase/functions/_shared/onboarding.ts';
import type { stateView } from '../../../../supabase/functions/_shared/state.ts';

/** The player's state exactly as `lmu-sync` and `lmu-onboarding` return it. */
export type ServerState = ReturnType<typeof stateView>;
export type TodayView = NonNullable<ServerState['today']>;
export type QuestView = TodayView['quests'][number];
export type CharacterView = ServerState['character'];
/** M7a: the check-in waiting for an answer (or held after "I just didn't"), the lighter plan, how a settled miss ended. */
export type CheckinView = NonNullable<ServerState['checkin']>;
export type LighterView = ServerState['lighterPlan'];
export type MissOutcome = NonNullable<ServerState['checkinResult']>['outcome'];
export type { OnboardingBody, PhoneEvent, ProvisionalDayEvent, Rating, Reveal, SlotRef };

export type EventResult = { id: string; ok: true; result: unknown } | { id: string | null; ok: false; code: string };
export type SyncResponse = {
  results: EventResult[];
  rejected: { id: string | null; code: string }[];
  newAchievements: string[];
  state: ServerState;
};
export type OnboardingResponse = { reveal: Reveal; state: ServerState };
export type DeleteResponse = { deleted: Record<string, number>; signIn: 'deleted' | 'kept' };
