// The Training step (M6c decisions 1–2): what the player can train with, and the program their workouts follow. Shown
// only when strength work is possible (not their own plan, a clear safety check); otherwise the defaults are sent.
import { EQUIPMENT_NAMES, ONBOARDING_TEXT, PROGRAM_STYLE_CHOICES } from '@levelmeup/content';
import { EQUIPMENT, PROGRAM_STYLES } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, nextPath, toggleEquipment } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Label, Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.gear;

export function GearStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  return (
    <QuestionFrame step="gear" line={T.line} canContinue={complete(draft, 'gear')} onContinue={() => onNavigate(nextPath(draft, 'gear'))}>
      <View style={{ gap: 12 }}>
        <Label>{T.equipment}</Label>
        {EQUIPMENT.map((item) => (
          <OptionCard key={item} kind="checkbox" label={EQUIPMENT_NAMES[item]} selected={draft.equipment.includes(item)}
            onPress={() => editDraft(toggleEquipment(draft, item))} />
        ))}
        <OptionCard kind="checkbox" label={T.nothing} selected={draft.noEquipment} onPress={() => editDraft(toggleEquipment(draft, 'nothing'))} />
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.style}</Label>
        {PROGRAM_STYLES.map((style) => (
          <OptionCard key={style} label={PROGRAM_STYLE_CHOICES[style].name} detail={PROGRAM_STYLE_CHOICES[style].line}
            selected={draft.programStyle === style} onPress={() => editDraft({ programStyle: style })} />
        ))}
      </View>
      <Small>{T.note}</Small>
    </QuestionFrame>
  );
}
