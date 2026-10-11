// A workout's log (M6c decision 9): every exercise with its target, its form cue and how it gets harder, its steps on
// request (the first one's open), and a counter for each set starting at the bottom of the range. It sends every set
// in order; the server checks the count against the plan. Less than the target still counts (the honor system).
import { PLAY_TEXT, authoredMove, fillText, moveTarget, progressLine } from '@levelmeup/content';
import type { SessionMove } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { MAX_REPS, moveUnit, sessionPayload, sessionValid, startingSession } from '../../quest/payload.ts';
import { colors } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Body, Heading, Label, Small } from '../../ui/Text.tsx';
import { Step } from './RepLog.tsx';

const T = PLAY_TEXT.workout;

export function WorkoutLog({ moves, disabled, onClaim }: { moves: readonly SessionMove[]; disabled: boolean; onClaim: (payload: Record<string, unknown>) => void }) {
  const [sets, setSets] = useState(() => startingSession(moves));
  const [open, setOpen] = useState<number | null>(0);
  const change = (m: number, s: number, by: number) =>
    setSets((all) => all.map((row, i) => (i !== m ? row : row.map((n, j) => (j === s ? Math.max(0, Math.min(MAX_REPS, n + by)) : n)))));
  return (
    <View style={{ gap: 16 }}>
      {moves.map((move, m) => {
        const words = authoredMove(move.move);
        const unit = moveUnit(move);
        const shown = open === m;
        return (
          <View key={move.move} style={{ gap: 8, padding: 12, borderWidth: 2, borderColor: colors.chalk }}>
            <Label tone="ember">{fillText(T.exercise, { n: m + 1, total: moves.length })}</Label>
            <Heading>{words.name}</Heading>
            <Body weight="medium">{moveTarget(move)}</Body>
            <Small>{words.cue}</Small>
            <Small>{progressLine(words)}</Small>
            <Button label={shown ? T.hide : T.how} variant="secondary" onPress={() => setOpen(shown ? null : m)} style={{ alignSelf: 'flex-start' }} />
            {shown && words.steps.map((step, i) => <Body key={i}>{`${i + 1}. ${step}`}</Body>)}
            {sets[m]!.map((n, s) => (
              <View key={s} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderWidth: 2, borderColor: colors.line }}>
                <Label style={{ flexGrow: 1, paddingHorizontal: 12, paddingVertical: 8 }}>{fillText(T.set, { n: s + 1 })}</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Step text="−" label={fillText(T.fewer, { name: words.name, n: s + 1 })} onPress={() => change(m, s, -1)} />
                  <Heading accessibilityLabel={`${n} ${unit}`} style={{ minWidth: 56, textAlign: 'center' }}>{String(n)}</Heading>
                  <Step text="+" label={fillText(T.more, { name: words.name, n: s + 1 })} onPress={() => change(m, s, 1)} />
                </View>
              </View>
            ))}
          </View>
        );
      })}
      <Small>{T.rest}</Small>
      <Small>{T.note}</Small>
      <Button label={T.log} variant="commitment" disabled={disabled || !sessionValid(sets)} onPress={() => onClaim(sessionPayload(sets))} />
    </View>
  );
}
