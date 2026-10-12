// Today's part of the check-in (M7a, board F3 without the Pact's parts): a settled "I just didn't" once, the question while
// a check-in waits (unless put off with "Later"), the held streak, and the lighter-plan offer.
import { CHECKIN_TEXT, LIGHTER_TEXT, fillText } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { checkinLead, resultText } from '../game/checkin.ts';
import type { Shown } from '../game/project.ts';
import { useGame } from '../state/store.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { Small } from '../ui/Text.tsx';

const T = CHECKIN_TEXT;

export type CheckinNotesProps = { view: Shown; onCheckin: () => void };

export function CheckinNotes({ view, onCheckin }: CheckinNotesProps) {
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
            <Button label={T.open} onPress={onCheckin} />
            <Button label={T.openLater} variant="secondary" onPress={() => answerLater(checkin.id)} />
          </View>
        </View>
      )}
      {checkin !== null && checkin.answer === 'just_didnt' && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{T.held}</NarrationBox>
          {view.answering && <Small tone="chalk">{T.waiting}</Small>}
        </View>
      )}
      {lighterPlan !== null && offered && !answeredOffer && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{fillText(LIGHTER_TEXT.offer, { from: lighterPlan.from, to: lighterPlan.to })}</NarrationBox>
          <Button label={LIGHTER_TEXT.accept} onPress={() => answerOffer(true)} />
          <Button label={LIGHTER_TEXT.decline} variant="secondary" onPress={() => answerOffer(false)} />
        </View>
      )}
    </>
  );
}
