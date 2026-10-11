// The branch questions for the Learn and Focus goals (spec §1.1 beat 4, M5 plan decision 7): they set where the
// reading and focus ladders start.
import { FOCUS_CHOICES, ONBOARDING_TEXT, READING_CHOICES } from '@levelmeup/content';
import { HABITS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Label } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.mind;

export function MindStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  return (
    <QuestionFrame step="mind" line={T.line} canContinue={complete(draft, 'mind')} onContinue={() => onNavigate(nextPath(draft, 'mind'))}>
      {draft.goals.includes('learn') && (
        <View style={{ gap: 12 }}>
          <Label>{T.reading}</Label>
          {HABITS.map((h) => (
            <OptionCard key={h} label={READING_CHOICES[h]} selected={draft.reading === h} onPress={() => editDraft({ reading: h })} />
          ))}
        </View>
      )}
      {draft.goals.includes('focus') && (
        <View style={{ gap: 12 }}>
          <Label>{T.focus}</Label>
          {HABITS.map((h) => (
            <OptionCard key={h} label={FOCUS_CHOICES[h]} selected={draft.focus === h} onPress={() => editDraft({ focus: h })} />
          ))}
        </View>
      )}
    </QuestionFrame>
  );
}
