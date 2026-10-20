// The missed-day check-in (spec §3.7, board F1; M7a decisions 3, 7): five answers, each with what it does here; "sick or
// injured" asks which, and "I just didn't" offers Second Wind when the server does. "Answer later" keeps it for the next
// open; the streak stays paused until then.
import { CHECKIN_TEXT, FEEDBACK_TEXT, LIBRARY, authoredTemplate, fillText } from '@levelmeup/content';
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
import { Appear } from '../ui/Appear.tsx';
import { BottomBarFrame } from '../ui/BottomBar.tsx';
import { Button } from '../ui/Button.tsx';
import { LinkButton } from '../ui/LinkButton.tsx';
import { NarrationBox, SystemCard } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { SaveFailed } from '../ui/SaveFailed.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Heading, Small } from '../ui/Text.tsx';
import { toast } from '../ui/toast.ts';
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
  /** Premium pass A7: the phone couldn't save the answer. */
  const [failed, setFailed] = useState(false);
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
  // Second Wind redoes yesterday's core quest on the server's day; a day built offline isn't that day yet (review).
  const redo = view.offline ? null : checkin.secondWind;
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
    if (answer === null || choice === null || busy) return;
    setBusy(true);
    setFailed(false);
    leave();
    try {
      await enqueue({ type: 'checkin', checkinId: checkin.id, answer, secondWind: answer === 'just_didnt' && secondWind && redo !== null });
    } catch {
      stay();
      setBusy(false);
      setFailed(true);
      return;
    }
    onDone();
    // Premium pass B3: what the answer does, said at once (the System's result card follows with the next sync).
    // Review: the line the card itself showed (answerLine), and Second Wind's own when it was chosen.
    toast(answer === 'just_didnt' && secondWind && redo !== null
      ? fillText(FEEDBACK_TEXT.answeredSecondWind, { quest: authoredTemplate(redo.templateId).voice[view.profile.voice].title })
      : fillText(FEEDBACK_TEXT.answered, { outcome: answerLine(choice, checkin, view.lighterPlan) }));
  };

  // M17 (UX audit N14): Answer stays in a bar at the bottom, with Answer later as a link under it; the follow-up questions
  // fade in where they open.
  const bar = (
    <>
      <Button label={T.answer} variant="commitment" disabled={answer === null || busy} onPress={() => void send()} />
      <SaveFailed shown={failed} />
      <LinkButton label={T.later} onPress={() => { answerLater(checkin.id); onDone(); }} style={{ alignSelf: 'center' }} />
    </>
  );
  return (
    <BottomBarFrame bar={bar}>
      {(barSpace) => (
        <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: barSpace + 24, paddingHorizontal: space.gutter, gap: 18 }}>
          {/* M17 (design critique): the question and its details in one card, as on Today. */}
          <SystemCard text={T.title} detail={checkinLead(checkin, view.today?.dayNumber ?? null)} />
          <View style={{ gap: 10 }}>
            {CHECKIN_CHOICES.map((c) => (
              <OptionCard key={c} label={T.answers[c].label} detail={answerLine(c, checkin, view.lighterPlan)} selected={choice === c} onPress={() => pick(c)} />
            ))}
          </View>
          {choice === 'sick_or_injured' && (
            <Appear style={{ gap: 10 }}>
              <Heading accessibilityRole="header">{T.which}</Heading>
              <OptionCard label={T.sick} selected={injured === false} onPress={() => setInjured(false)} />
              <OptionCard label={T.injured} detail={restsExercise ? T.injuredNote : undefined} selected={injured === true} onPress={() => setInjured(true)} />
            </Appear>
          )}
          {choice === 'just_didnt' && redo !== null && (
            <Appear style={{ gap: 10 }}>
              <Heading accessibilityRole="header">{T.how}</Heading>
              <OptionCard label={T.recovery} selected={!secondWind} onPress={() => setSecondWind(false)} />
              <OptionCard
                label={fillText(T.secondWind, { quest: authoredTemplate(redo.templateId).voice[view.profile.voice].title })}
                selected={secondWind}
                onPress={() => setSecondWind(true)}
              />
            </Appear>
          )}
          <Small tone="chalk">{T.laterNote}</Small>
        </ScreenScroll>
      )}
    </BottomBarFrame>
  );
}
