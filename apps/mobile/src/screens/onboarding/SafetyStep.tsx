// O04 the safety check (spec §3.4; owner decision 2), its own step since M12 (audit 8, board R3-7): seven yes-or-no
// questions, never stored, only whether to start gently. Continue says how many are left.
import { ONBOARDING_TEXT, SAFETY_CHECK, fillText } from '@levelmeup/content';
import { SAFETY_QUESTIONS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, gentleStart, nextPath, safetyLeft } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { NightCard } from '../../ui/NightCard.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Body, Label, Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.body;

export function SafetyStep({ onNavigate, onBack }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const left = safetyLeft(draft);
  const answer = (index: number, yes: boolean) => editDraft({ safety: draft.safety.map((a, i) => (i === index ? yes : a)) });
  return (
    <QuestionFrame step="safety" line={T.safetyLine} canContinue={complete(draft, 'safety')} onContinue={() => onNavigate(nextPath(draft, 'safety'))}
      onBack={onBack} left={fillText(ONBOARDING_TEXT.chapters.left, { n: left, total: SAFETY_QUESTIONS })}>
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
        {left === 0 && (
          <NightCard>
            <Label tone="chalk">{gentleStart(draft) ? T.gentleTitle : T.clear}</Label>
            {gentleStart(draft) && <Small>{T.gentle}</Small>}
          </NightCard>
        )}
      </View>
    </QuestionFrame>
  );
}
