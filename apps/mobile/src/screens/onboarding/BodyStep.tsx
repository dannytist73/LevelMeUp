// O04 Body (spec §1.1 beat 4, §3.4; owner decision 2): how much they train (or their own plan) and what to work around.
// Everyone sees it: every class gets walks and stretches. M12 (audit 8): the safety check is its own step (SafetyStep).
import { LIMITATION_NAMES, ONBOARDING_TEXT, TRAINING_CHOICES } from '@levelmeup/content';
import { LIMITATIONS, TRAININGS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, nextPath, toggleLimit } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Label } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.body;

export function BodyStep({ onNavigate, onBack }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  return (
    <QuestionFrame step="body" line={T.line} canContinue={complete(draft, 'body')} onContinue={() => onNavigate(nextPath(draft, 'body'))} onBack={onBack}>
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
    </QuestionFrame>
  );
}
