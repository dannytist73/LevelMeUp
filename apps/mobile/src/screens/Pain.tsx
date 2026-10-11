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

const T = ADJUST_TEXT.pain;

export type PainProps = { questId: number; onDone: () => void; onBack: () => void; now?: () => number };

export function Pain({ questId, onDone, onBack, now = Date.now }: PainProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
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
    try {
      await enqueue({ type: 'pain', instanceId: quest.id, choice });
      onDone();
    } finally {
      setBusy(false);
    }
  };
  const name = pausedName(painKey(templateById(LIBRARY, quest.templateId)));
  const reports = view.painReports + 1; // this one included
  const cleared = quest.completedAt !== null;
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
          <Small>{fillText(T.gentleLine, { title: gentleTemplate.voice[view.profile.voice].title, summary: questSummary(gentleTemplate, gentle.hardDay) })}</Small>
          <Button label={T.gentle} disabled={busy} onPress={() => void send('gentle')} />
        </View>
      )}
      <View style={{ gap: 8 }}>
        <Small>{today.protection === null ? T.restLine : T.restedLine}</Small>
        <Button label={T.rest} variant={gentle === null && !cleared ? 'primary' : 'secondary'} disabled={busy} onPress={() => void send('rest')} />
      </View>
      {cleared && <Button label={T.pause} disabled={busy} onPress={() => void send('pause')} />}
      {!seeProfessional(reports) && <Small tone="chalk">{T.advice}</Small>}
    </>,
  );
}
