// The missed-day check-in (spec §3.7, board F1; M7a decisions 3, 7): five answers, each with what it does here; "sick or
// injured" asks which, and "I just didn't" offers Second Wind when the server does. "Answer later" keeps it for the next
// open; the streak stays paused until then.
import { CHECKIN_TEXT, LIBRARY, authoredTemplate, fillText } from '@levelmeup/content';
import { findTemplate } from '@levelmeup/rules';
import type { CheckinAnswer } from '@levelmeup/rules';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHECKIN_CHOICES, answerLine, checkinLead } from '../game/checkin.ts';
import type { CheckinChoice } from '../game/checkin.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Small, Title } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';

const T = CHECKIN_TEXT;

export type CheckinProps = { onDone: () => void };

export function Checkin({ onDone }: CheckinProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const answerLater = useGame((s) => s.answerLater);
  const [choice, setChoice] = useState<CheckinChoice | null>(null);
  const [injured, setInjured] = useState<boolean | null>(null);
  const [secondWind, setSecondWind] = useState(false);
  const [busy, setBusy] = useState(false);
  const checkin = view?.checkin ?? null;

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 18 }}>
      {children}
    </ScreenScroll>
  );
  if (view === null || checkin === null || checkin.answer !== null) {
    return frame(
      <>
        <NarrationBox>{T.gone}</NarrationBox>
        <Button label={T.done} variant="secondary" onPress={onDone} />
      </>,
    );
  }

  const missed = checkin.core === null ? undefined : findTemplate(LIBRARY, checkin.core);
  const restsExercise = missed !== undefined && missed.exercise !== null;
  const redo = checkin.secondWind;
  const answer: CheckinAnswer | null =
    choice === null ? null
      : choice === 'sick_or_injured' ? (injured === null ? null : injured ? 'injured' : 'sick')
        : choice;
  const pick = (next: CheckinChoice) => {
    setChoice(next);
    setInjured(null);
    setSecondWind(false);
  };
  const send = async (): Promise<void> => {
    if (answer === null || busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'checkin', checkinId: checkin.id, answer, secondWind: answer === 'just_didnt' && secondWind });
    } catch {
      stay();
      setBusy(false);
      return;
    }
    onDone();
  };

  return frame(
    <>
      <NarrationBox>{T.title}</NarrationBox>
      <Body tone="chalk">{checkinLead(checkin, view.today?.dayNumber ?? null)}</Body>
      <View style={{ gap: 10 }}>
        {CHECKIN_CHOICES.map((c) => (
          <OptionCard key={c} label={T.answers[c].label} detail={answerLine(c, checkin, view.lighterPlan)} selected={choice === c} onPress={() => pick(c)} />
        ))}
      </View>
      {choice === 'sick_or_injured' && (
        <View style={{ gap: 10 }}>
          <Title>{T.which}</Title>
          <OptionCard label={T.sick} selected={injured === false} onPress={() => setInjured(false)} />
          <OptionCard label={T.injured} detail={restsExercise ? T.injuredNote : undefined} selected={injured === true} onPress={() => setInjured(true)} />
        </View>
      )}
      {choice === 'just_didnt' && redo !== null && (
        <View style={{ gap: 10 }}>
          <Title>{T.how}</Title>
          <OptionCard label={T.recovery} selected={!secondWind} onPress={() => setSecondWind(false)} />
          <OptionCard
            label={fillText(T.secondWind, { quest: authoredTemplate(redo.templateId).voice[view.profile.voice].title })}
            selected={secondWind}
            onPress={() => setSecondWind(true)}
          />
        </View>
      )}
      <Button label={T.answer} variant="commitment" disabled={answer === null || busy} onPress={() => void send()} />
      <Button label={T.later} variant="secondary" onPress={() => { answerLater(checkin.id); onDone(); }} />
      <Small tone="chalk">{T.laterNote}</Small>
    </>,
  );
}
