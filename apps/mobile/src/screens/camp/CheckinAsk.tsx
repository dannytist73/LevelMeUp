// A simpler day (docs/2026-10-26-simpler-day.md, decision 7): the missed-day check-in, asked at the fire (the visitor's
// bubble asks). Its five answers are buttons, each with what it does; one tap answers. "Sick or injured" asks which, and
// "I just didn't" asks recovery or Second Wind when the server offers it, in place. "Ask me later" puts it off, as the
// Checkin screen does (which stays, for a notification that opens it).
import { CAMP_TEXT, CHECKIN_TEXT, FEEDBACK_TEXT, LIBRARY, authoredTemplate, fillText } from '@levelmeup/content';
import { findTemplate } from '@levelmeup/rules';
import type { CheckinAnswer } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { CHECKIN_CHOICES, answerExtra, answerLine, checkinLead } from '../../game/checkin.ts';
import type { CheckinChoice } from '../../game/checkin.ts';
import type { Shown } from '../../game/project.ts';
import { useGame } from '../../state/store.ts';
import { Appear } from '../../ui/Appear.tsx';
import { LinkButton } from '../../ui/LinkButton.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { SaveFailed } from '../../ui/SaveFailed.tsx';
import { Heading, Small } from '../../ui/Text.tsx';
import { toast } from '../../ui/toast.ts';

const T = CHECKIN_TEXT;

export function CheckinAsk({ view }: { view: Shown }) {
  const enqueue = useGame((s) => s.enqueue);
  const answerLater = useGame((s) => s.answerLater);
  const [choice, setChoice] = useState<CheckinChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const checkin = view.checkin;
  if (checkin === null || checkin.answer !== null) return null;
  // Second Wind redoes yesterday's core quest on the server's day; a day built offline isn't that day yet (review).
  const redo = view.offline ? null : checkin.secondWind;
  const missed = checkin.core === null ? undefined : findTemplate(LIBRARY, checkin.core);
  const restsExercise = missed !== undefined && missed.exercise !== null;

  const send = async (picked: CheckinChoice, answer: CheckinAnswer, secondWind: boolean): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await enqueue({ type: 'checkin', checkinId: checkin.id, answer, secondWind });
    } catch {
      setBusy(false);
      setFailed(true);
      return;
    }
    toast(secondWind && redo !== null
      ? fillText(FEEDBACK_TEXT.answeredSecondWind, { quest: authoredTemplate(redo.templateId).voice[view.profile.voice].title })
      : fillText(FEEDBACK_TEXT.answered, { outcome: answerLine(picked, checkin, view.lighterPlan) }));
  };
  const pick = (c: CheckinChoice) => {
    if (c === 'sick_or_injured' || (c === 'just_didnt' && redo !== null)) setChoice(c);
    else void send(c, c, false);
  };

  return (
    <View testID="checkin-ask" style={{ gap: 8 }}>
      <Heading accessibilityRole="header">{T.title}</Heading>
      {checkin.gap && <Small>{checkinLead(checkin, view.today?.dayNumber ?? null)}</Small>}
      <Small>{CAMP_TEXT.ask.paused}</Small>
      {CHECKIN_CHOICES.map((c) => {
        const extra = answerExtra(c, checkin, view.lighterPlan);
        return (
          <OptionCard key={c} compact label={T.answers[c].label} {...(extra === null ? {} : { detail: extra })} selected={choice === c} onPress={() => pick(c)}
            accessibilityLabel={`${T.answers[c].label}. ${answerLine(c, checkin, view.lighterPlan)}`} />
        );
      })}
      {choice === 'sick_or_injured' && (
        <Appear style={{ gap: 10 }}>
          <Heading accessibilityRole="header">{T.which}</Heading>
          <OptionCard label={T.sick} onPress={() => void send('sick_or_injured', 'sick', false)} selected={false} />
          <OptionCard label={T.injured} detail={restsExercise ? T.injuredNote : undefined} onPress={() => void send('sick_or_injured', 'injured', false)}
            selected={false} />
        </Appear>
      )}
      {choice === 'just_didnt' && redo !== null && (
        <Appear style={{ gap: 10 }}>
          <Heading accessibilityRole="header">{T.how}</Heading>
          <OptionCard label={T.recovery} onPress={() => void send('just_didnt', 'just_didnt', false)} selected={false} />
          <OptionCard label={fillText(T.secondWind, { quest: authoredTemplate(redo.templateId).voice[view.profile.voice].title })}
            onPress={() => void send('just_didnt', 'just_didnt', true)} selected={false} />
        </Appear>
      )}
      <SaveFailed shown={failed} />
      <LinkButton label={CAMP_TEXT.ask.later} onPress={() => answerLater(checkin.id)} style={{ alignSelf: 'center' }} />
    </View>
  );
}
