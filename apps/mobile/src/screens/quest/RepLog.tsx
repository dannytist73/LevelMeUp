// Rep-log quests (spec §3.6, M6a decision 4): each set starts at the target and moves with − and +; sets can be added (up
// to 20) or removed (down to 1). It logs what was done, even below the target (the honor system).
import { PLAY_TEXT, fillText } from '@levelmeup/content';
import type { Condition } from '@levelmeup/rules';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MAX_REPS, MAX_SETS, repUnit, repsPayload, repsValid, startingSets } from '../../quest/payload.ts';
import { colors, fonts } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Caption, Heading, Label, Small } from '../../ui/Text.tsx';

const T = PLAY_TEXT.reps;

function Step({ text, label, onPress }: { text: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 22, color: colors.chalk }}>{text}</Text>
    </Pressable>
  );
}

export function RepLog({ condition, disabled, onClaim }: { condition: Condition; disabled: boolean; onClaim: (payload: Record<string, unknown>) => void }) {
  const [sets, setSets] = useState(() => startingSets(condition));
  const unit = repUnit(condition);
  const change = (index: number, by: number) =>
    setSets((all) => all.map((n, i) => (i === index ? Math.max(0, Math.min(MAX_REPS, n + by)) : n)));
  return (
    <View style={{ gap: 12 }}>
      <Caption>{fillText(T.unitLine, { unit })}</Caption>
      {sets.map((n, i) => (
        <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderWidth: 2, borderColor: colors.chalk }}>
          <Label style={{ flexGrow: 1, paddingHorizontal: 12, paddingVertical: 8 }}>{fillText(T.set, { n: i + 1 })}</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Step text="−" label={fillText(T.fewer, { n: i + 1 })} onPress={() => change(i, -1)} />
            <Heading accessibilityLabel={`${n} ${unit}`} style={{ minWidth: 56, textAlign: 'center' }}>{String(n)}</Heading>
            <Step text="+" label={fillText(T.more, { n: i + 1 })} onPress={() => change(i, 1)} />
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={T.addSet}
          variant="secondary"
          disabled={sets.length >= MAX_SETS}
          onPress={() => setSets((all) => [...all, all[all.length - 1] ?? 1])}
          style={{ flexGrow: 1 }}
        />
        <Button label={T.removeSet} variant="secondary" disabled={sets.length <= 1} onPress={() => setSets((all) => all.slice(0, -1))} style={{ flexGrow: 1 }} />
      </View>
      <Small>{T.note}</Small>
      <Button label={PLAY_TEXT.claim.log} variant="commitment" disabled={disabled || !repsValid(sets)} onPress={() => onClaim(repsPayload(sets))} />
    </View>
  );
}
