// One-sentence quests (spec §3.6): a line of up to 280 characters.
import { PLAY_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { MAX_SENTENCE, sentenceValid, textPayload } from '../../quest/payload.ts';
import { Button } from '../../ui/Button.tsx';
import { Small } from '../../ui/Text.tsx';
import { TextField } from '../../ui/TextField.tsx';

export function SentenceLog({ disabled, onClaim }: { disabled: boolean; onClaim: (payload: Record<string, unknown>) => void }) {
  const [text, setText] = useState('');
  return (
    <View style={{ gap: 12 }}>
      <TextField label={PLAY_TEXT.sentence.label} value={text} onChangeText={setText} maxLength={MAX_SENTENCE} />
      <Small>{PLAY_TEXT.sentence.note}</Small>
      <Button label={PLAY_TEXT.claim.log} variant="commitment" disabled={disabled || !sentenceValid(text)} onPress={() => onClaim(textPayload(text))} />
    </View>
  );
}
