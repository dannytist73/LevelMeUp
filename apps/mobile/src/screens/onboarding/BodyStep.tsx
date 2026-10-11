// O04 Body and safety (spec §1.1 beat 4, §3.4; owner decision 2): how much they train (or their own plan), what to work
// around, and the seven-question safety check. Everyone sees it: every class gets walks and stretches.
import { LIMITATION_NAMES, ONBOARDING_TEXT, SAFETY_CHECK, TRAINING_CHOICES } from '@levelmeup/content';
import { LIMITATIONS, TRAININGS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, gentleStart, nextPath, toggleLimit } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { NightCard } from '../../ui/NightCard.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Body, Label, Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.body;

export function BodyStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const answered = draft.safety.every((a) => a !== null);
  const answer = (index: number, yes: boolean) => editDraft({ safety: draft.safety.map((a, i) => (i === index ? yes : a)) });
  return (
    <QuestionFrame step="body" line={T.line} canContinue={complete(draft, 'body')} onContinue={() => onNavigate(nextPath(draft, 'body'))}>
      <View style={{ gap: 12 }}>
        <Label>{T.training}</Label>
        {TRAININGS.map((training) => (
          <OptionCard key={training} label={TRAINING_CHOICES[training]} selected={draft.training === training} onPress={() => editDraft({ training })} />
        ))}
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.limits}</Label>
        {LIMITATIONS.map((limit) => (
          <OptionCard key={limit} kind="checkbox" label={LIMITATION_NAMES[limit]} selected={draft.limitations.includes(limit)}
            onPress={() => editDraft(toggleLimit(draft, limit))} />
        ))}
        <OptionCard kind="checkbox" label={T.nothing} selected={draft.noLimits} onPress={() => editDraft(toggleLimit(draft, 'nothing'))} />
      </View>
      <View style={{ gap: 14 }}>
        <Label>{T.safety}</Label>
        <Small>{T.safetyNote}</Small>
        {SAFETY_CHECK.map((question, i) => (
          <View key={question} style={{ gap: 8 }}>
            <Body>{question}</Body>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[true, false].map((yes) => (
                <View key={String(yes)} style={{ flex: 1 }}>
                  <OptionCard label={yes ? T.yes : T.no} accessibilityLabel={`${question} ${yes ? T.yes : T.no}`}
                    selected={draft.safety[i] === yes} onPress={() => answer(i, yes)} />
                </View>
              ))}
            </View>
          </View>
        ))}
        {answered && (
          <NightCard>
            <Label tone="chalk">{gentleStart(draft) ? T.gentleTitle : T.clear}</Label>
            {gentleStart(draft) && <Small>{T.gentle}</Small>}
          </NightCard>
        )}
      </View>
    </QuestionFrame>
  );
}
