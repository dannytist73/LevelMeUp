// One-sentence quests (spec §3.6): a line of up to 280 characters.
import { PLAY_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { MAX_SENTENCE, sentenceValid, textPayload } from '../../quest/payload.ts';
import { Small } from '../../ui/Text.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { ClaimButton } from './ClaimBar.tsx';

export type SentenceLogProps = {
  disabled: boolean;
  onClaim: (payload: Record<string, unknown>) => void;
  /** M8b: the reader's "Your takeaway, one sentence", its note and "Claim +10 XP". */
  label?: string;
  note?: string;
  claimLabel?: string;
  /** M11: the line, kept by the caller so it outlives the card or the reader that shows it (review). */
  value?: string;
  onChangeText?: (text: string) => void;
};

export function SentenceLog({
  disabled, onClaim, label = PLAY_TEXT.sentence.label, note = PLAY_TEXT.sentence.note, claimLabel = PLAY_TEXT.claim.log, value, onChangeText,
}: SentenceLogProps) {
  const [own, setOwn] = useState('');
  const text = value ?? own;
  const setText = onChangeText ?? setOwn;
  return (
    <View style={{ gap: 12 }}>
      {/* M17: a pasted line break becomes a space (one sentence can't hold one, and Claim would stay off silently). */}
      <TextField label={label} value={text} onChangeText={(v) => setText(v.replace(/[\r\n]+/g, ' '))} maxLength={MAX_SENTENCE} multiline oneLine />
      <Small>{note}</Small>
      <ClaimButton label={claimLabel} disabled={disabled || !sentenceValid(text)} onPress={() => onClaim(textPayload(text))} />
    </View>
  );
}
