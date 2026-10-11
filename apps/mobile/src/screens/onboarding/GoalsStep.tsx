// O03 Goals (spec §1.1 beat 3): up to two of five; the third is greyed out until one is dropped.
import { GOAL_CHOICES, ONBOARDING_TEXT, goalsCount } from '@levelmeup/content';
import { GOALS, MAX_GOALS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, nextPath, toggleGoal } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Label, Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.goals;

export function GoalsStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const full = draft.goals.length >= MAX_GOALS;
  return (
    <QuestionFrame step="goals" line={T.line} canContinue={complete(draft, 'goals')} onContinue={() => onNavigate(nextPath(draft, 'goals'))}>
      <Small>{T.note}</Small>
      <View style={{ gap: 12 }}>
        {GOALS.map((goal) => {
          const selected = draft.goals.includes(goal);
          return (
            <OptionCard key={goal} kind="checkbox" label={GOAL_CHOICES[goal]} selected={selected} disabled={full && !selected}
              onPress={() => editDraft({ goals: toggleGoal(draft.goals, goal) })} />
          );
        })}
      </View>
      <Label tone="chalk">{goalsCount(draft.goals.length)}</Label>
    </QuestionFrame>
  );
}
