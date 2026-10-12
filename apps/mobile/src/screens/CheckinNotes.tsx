// Today's part of the check-in (M7a, board F3 without the Pact's parts): a settled "I just didn't" once, the question while
// a check-in waits (unless put off with "Later"), the held streak, and the lighter-plan offer.
import { CHECKIN_TEXT, LIGHTER_TEXT, fillText } from '@levelmeup/content';
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
  const { checkin, checkinResult: result, lighterPlan } = view;
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
      {lighterPlan !== null && lighterPlan.offered && (
        <View style={{ gap: 8 }}>
          <NarrationBox>{fillText(LIGHTER_TEXT.offer, { from: lighterPlan.from, to: lighterPlan.to })}</NarrationBox>
          <Button label={LIGHTER_TEXT.accept} onPress={() => void enqueue({ type: 'lighter_plan', accept: true })} />
          <Button label={LIGHTER_TEXT.decline} variant="secondary" onPress={() => void enqueue({ type: 'lighter_plan', accept: false })} />
        </View>
      )}
    </>
  );
}
