// Today's part of the check-in (M7a, board F3 without the Pact's parts): a settled "I just didn't" once, the question while
// a check-in waits (unless put off with "Later"), the held streak, and the lighter-plan offer. M12 (audit 1): its buttons are
// quiet, so Up next keeps the screen's one bright button.
import { CHECKIN_TEXT, LIGHTER_TEXT, PLAY_TEXT, SHADOW_TEXT, fillText } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { checkinLead, resultText } from '../game/checkin.ts';
import { shadowHold } from '../game/pact.ts';
import type { Shown } from '../game/project.ts';
import { useGame } from '../state/store.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { Small } from '../ui/Text.tsx';

const T = CHECKIN_TEXT;

export type CheckinNotesProps = { view: Shown; onCheckin: () => void; now?: () => number };

export function CheckinNotes({ view, onCheckin, now = Date.now }: CheckinNotesProps) {
  const enqueue = useGame((s) => s.enqueue);
  const later = useGame((s) => s.checkinLater);
  const answerLater = useGame((s) => s.answerLater);
  const seen = useGame((s) => s.checkinResultSeen);
  const dismissResult = useGame((s) => s.dismissCheckinResult);
  // The offer goes at the first tap: a second accept would drop the minutes another step (review).
  const [answeredOffer, setAnsweredOffer] = useState(false);
  const answerOffer = (accept: boolean) => {
    setAnsweredOffer(true);
    void enqueue({ type: 'lighter_plan', accept });
  };
  const { checkin, checkinResult: result, lighterPlan } = view;
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
  return (
    <>
      {result !== null && result.id !== seen && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{resultText(result.outcome, view.character.streak.best)}</NarrationBox>
          <Button label={T.done} variant="secondary" onPress={() => void dismissResult(result.id)} />
        </View>
      )}
      {checkin !== null && checkin.answer === null && checkin.id !== later && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{T.title}</NarrationBox>
          <Small tone="chalk">{checkinLead(checkin, view.today?.dayNumber ?? null)}</Small>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Button label={T.open} variant="secondary" onPress={onCheckin} />
            <Button label={T.openLater} variant="secondary" onPress={() => answerLater(checkin.id)} />
          </View>
        </View>
      )}
      {checkin !== null && checkin.answer === 'just_didnt' && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{held}</NarrationBox>
          {view.answering && <Small tone="chalk">{T.waiting}</Small>}
        </View>
      )}
      {lighterPlan !== null && offered && !answeredOffer && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{fillText(LIGHTER_TEXT.offer, { from: lighterPlan.from, to: lighterPlan.to })}</NarrationBox>
          <Button label={LIGHTER_TEXT.accept} variant="secondary" onPress={() => answerOffer(true)} />
          <Button label={LIGHTER_TEXT.decline} variant="secondary" onPress={() => answerOffer(false)} />
        </View>
      )}
    </>
  );
}
