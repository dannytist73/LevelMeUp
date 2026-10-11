// O06 When you slip (spec §1.1 beat 7): shapes the reveal's suggestion only; nothing turns on.
import { ONBOARDING_TEXT, SLIP_CHOICES } from '@levelmeup/content';
import { SLIPS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

export function SlipStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  return (
    <QuestionFrame step="slip" line={ONBOARDING_TEXT.slip.line} canContinue={complete(draft, 'slip')} onContinue={() => onNavigate(nextPath(draft, 'slip'))}>
      <View style={{ gap: 12 }}>
        {SLIPS.map((slip) => (
          <OptionCard key={slip} label={SLIP_CHOICES[slip].name} detail={SLIP_CHOICES[slip].line} selected={draft.slip === slip} onPress={() => editDraft({ slip })} />
        ))}
      </View>
      <Small>{ONBOARDING_TEXT.slip.note}</Small>
    </QuestionFrame>
  );
}
