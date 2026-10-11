// "I felt pain" (spec §3.3, §3.4; M6b decision 6): the exercise rests with no penalty, and the player chooses gentle
// movement instead (when one fits) or rest for today; a cleared quest can be paused. It always points to a doctor or
// physiotherapist, and leads with that when pain keeps coming back.
import { ADJUST_TEXT, LIBRARY, PLAY_TEXT, authoredTemplate, fillText, pausedName, questSummary } from '@levelmeup/content';
import { painKey, seeProfessional, templateById } from '@levelmeup/rules';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isExercise } from '../game/adjust.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Small, Title } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';

const T = ADJUST_TEXT.pain;

/** "Instead: Walk 5 minutes", with the target only when the title doesn't already say it (device check). */
export function gentleLine(title: string, summary: string): string {
  const says = title === summary || title.endsWith(` ${summary}`);
  return says ? fillText(T.gentleTitle, { title }) : fillText(T.gentleLine, { title, summary });
}

export type PainProps = { questId: number; onDone: () => void; onBack: () => void; now?: () => number };

export function Pain({ questId, onDone, onBack, now = Date.now }: PainProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [busy, setBusy] = useState(false);
  const today = view?.today ?? null;
  const quest = today?.quests.find((q) => q.id === questId) ?? null;
  const open = today !== null && today.endsAt !== null && Date.parse(today.endsAt) > now();

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 18 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      {children}
    </ScreenScroll>
  );
  if (view === null || today === null || quest === null || !open || !isExercise(quest)) {
    // The choices go with the day, but the advice never does (review).
    const exercise = quest !== null && isExercise(quest);
    return frame(
      <>
        <NarrationBox>{PLAY_TEXT.quest.gone}</NarrationBox>
        {exercise && <Small tone="chalk">{T.advice}</Small>}
      </>,
    );
  }
  const send = async (choice: 'gentle' | 'rest' | 'pause'): Promise<void> => {
    if (busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'pain', instanceId: quest.id, choice });
    } catch {
      stay();
      setBusy(false);
      return;
    }
    onDone();
  };
  const name = pausedName(painKey(templateById(LIBRARY, quest.templateId)));
  const reports = view.painReports + 1; // this one included
  const cleared = quest.completedAt !== null;
  const rested = today.protection !== null;
  const gentle = cleared ? null : quest.gentle;
  const gentleTemplate = gentle === null ? null : authoredTemplate(gentle.templateId);

  return frame(
    <>
      <Title>{T.title}</Title>
      {seeProfessional(reports) && <NarrationBox>{fillText(T.persists, { count: reports })}</NarrationBox>}
      <Body>{T.lead}</Body>
      <Body>{fillText(T.paused, { name })}</Body>
      {gentle !== null && gentleTemplate !== null && (
        <View style={{ gap: 8 }}>
          <Small>{gentleLine(gentleTemplate.voice[view.profile.voice].title, questSummary(gentleTemplate, gentle.hardDay))}</Small>
          <Button label={T.gentle} disabled={busy} onPress={() => void send('gentle')} />
        </View>
      )}
      <View style={{ gap: 8 }}>
        <Small>{rested ? T.restedLine : T.restLine}</Small>
        {!rested && (
          <Button label={T.rest} variant={gentle === null && !cleared ? 'primary' : 'secondary'} disabled={busy} onPress={() => void send('rest')} />
        )}
      </View>
      {/* Already a rest day: resting the exercise is what's left to choose (device check). */}
      {(cleared || rested) && <Button label={T.pause} disabled={busy} onPress={() => void send('pause')} />}
      {!seeProfessional(reports) && <Small tone="chalk">{T.advice}</Small>}
    </>,
  );
}
