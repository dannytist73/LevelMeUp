// Camp's part of the check-in (M7a, board F3 without the Pact's parts): the held streak after "I just didn't", and the
// lighter-plan offer. M12 (audit 1): its buttons are quiet, so the card keeps the screen's one bright button. M17: each
// note is one card, its answers inside it. A simpler day: the question is asked at the fire (camp/CheckinAsk.tsx), and how
// a settled miss ended is the app's note (Today).
import { CHECKIN_TEXT, FEEDBACK_TEXT, LIGHTER_TEXT, PLAY_TEXT, SHADOW_TEXT, fillText } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import { shadowHold } from '../game/pact.ts';
import type { Shown } from '../game/project.ts';
import { useGame } from '../state/store.ts';
import { SystemCard } from '../ui/NarrationBox.tsx';
import { toast } from '../ui/toast.ts';

const T = CHECKIN_TEXT;

export type CheckinNotesProps = { view: Shown; now?: () => number };

export function CheckinNotes({ view, now = Date.now }: CheckinNotesProps) {
  const enqueue = useGame((s) => s.enqueue);
  // The offer goes at the first tap: a second accept would drop the minutes another step (review).
  const [answeredOffer, setAnsweredOffer] = useState(false);
  const answerOffer = (accept: boolean, to: number) => {
    setAnsweredOffer(true);
    // Premium pass B4: the offer says what the answer did instead of vanishing; one that can't be saved comes back.
    enqueue({ type: 'lighter_plan', accept }).then(
      () => toast(accept ? fillText(FEEDBACK_TEXT.lighter, { minutes: to }) : FEEDBACK_TEXT.lighterNo),
      () => {
        setAnsweredOffer(false);
        toast(FEEDBACK_TEXT.saveFailed);
      },
    );
  };
  const { checkin, lighterPlan } = view;
  // Once the answer is in the view the offer is quiet anyway; a later offer (after its 14 days) shows again.
  const offered = lighterPlan?.offered === true;
  // Once the recovery quest is cleared the streak is safe, and the note says so (emulator finding, M7b).
  const recovered = view.today?.quests.some((q) => q.slot === 'recovery' && q.completedAt !== null) ?? false;
  // M7c: under a pact the Shadow holds the missed day (board F3), on the day it holds (review).
  const hold = shadowHold(view, now());
  const claimed = hold !== null && hold.kind !== 'paused';
  const yesterday = checkin !== null && !checkin.gap && checkin.from === (view.today?.dayNumber ?? 0) - 1;
  const held = recovered ? PLAY_TEXT.cleared.recovered : claimed ? (yesterday ? SHADOW_TEXT.heldYesterday : SHADOW_TEXT.held) : T.held;
  useEffect(() => {
    if (!offered) setAnsweredOffer(false);
  }, [offered]);
  // M17: each note is one System card with its answers inside it.
  return (
    <>
      {checkin !== null && checkin.answer === 'just_didnt' && (
        <SystemCard text={held} {...(view.answering ? { detail: T.waiting } : {})} />
      )}
      {lighterPlan !== null && offered && !answeredOffer && (
        <SystemCard text={fillText(LIGHTER_TEXT.offer, { from: lighterPlan.from, to: lighterPlan.to })} actions={[
          { label: LIGHTER_TEXT.accept, onPress: () => answerOffer(true, lighterPlan.to) },
          { label: LIGHTER_TEXT.decline, onPress: () => answerOffer(false, lighterPlan.to) },
        ]} />
      )}
    </>
  );
}
