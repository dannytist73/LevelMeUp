// O02 Voice (spec §1.1 beat 2): three voices, each with a sample line.
import { ONBOARDING_TEXT, VOICES, VOICE_NAMES, VOICE_SAMPLES, voiceLine } from '@levelmeup/content';
import { View } from 'react-native';
import { complete, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

export function VoiceStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  return (
    <QuestionFrame step="voice" line={voiceLine(draft.name.trim())} canContinue={complete(draft, 'voice')} onContinue={() => onNavigate(nextPath(draft, 'voice'))}>
      <View style={{ gap: 12 }}>
        {VOICES.map((voice) => (
          <OptionCard key={voice} label={VOICE_NAMES[voice]} detail={VOICE_SAMPLES[voice]} selected={draft.voice === voice} onPress={() => editDraft({ voice })} />
        ))}
      </View>
      <Small>{ONBOARDING_TEXT.voice.note}</Small>
    </QuestionFrame>
  );
}
