// A workout's log (M6c decision 9): every exercise with its target, its form cue and how it gets harder, its steps on
// request (the first one's open), and a counter for each set. It sends every set in order; the server checks the count
// against the plan. Less than the target still counts (the honor system). M10c: each set starts where it was last time
// when that lies in today's range (else at the bottom of the range), last time's sets show as a line, and a Done check on
// each set starts the rest (decisions 7–8).
import { PLAY_TEXT, authoredMove, fillText, moveTarget, progressLine } from '@levelmeup/content';
import type { SessionMove } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { moveKey, setsLine, startFromLast } from '../../quest/lastSets.ts';
import type { LastSets } from '../../quest/lastSets.ts';
import { MAX_REPS, moveUnit, sessionPayload, sessionValid } from '../../quest/payload.ts';
import { colors } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Body, Heading, Label, Small } from '../../ui/Text.tsx';
import { Step } from './RepLog.tsx';
import { RestBar, SetDone, useRest } from './Rest.tsx';

const T = PLAY_TEXT.workout;

export type WorkoutLogProps = {
  moves: readonly SessionMove[];
  disabled: boolean;
  onClaim: (payload: Record<string, unknown>) => void;
  /** M10c: each exercise's sets from the last workout logged on this phone. */
  last?: LastSets;
  now?: () => number;
};

export function WorkoutLog({ moves, disabled, onClaim, last = {}, now = Date.now }: WorkoutLogProps) {
  const [sets, setSets] = useState(() => startFromLast(moves, last));
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<number | null>(0);
  /** The exercise whose set started the rest: the bar shows under it, where the player is. */
  const [restMove, setRestMove] = useState(0);
  const rest = useRest(now);
  const change = (m: number, s: number, by: number) =>
    setSets((all) => all.map((row, i) => (i !== m ? row : row.map((n, j) => (j === s ? Math.max(0, Math.min(MAX_REPS, n + by)) : n)))));
  const toggle = (m: number, s: number) => {
    const key = `${m}:${s}`;
    const marking = done[key] !== true;
    setDone((all) => ({ ...all, [key]: marking }));
    const lastSet = m === moves.length - 1 && s === sets[m]!.length - 1;
    if (marking && !lastSet) {
      setRestMove(m);
      rest.start();
    }
  };
  return (
    <View style={{ gap: 16 }}>
      {moves.map((move, m) => {
        const words = authoredMove(move.move);
        const unit = moveUnit(move);
        const shown = open === m;
        const before = last[moveKey(move.move)];
        return (
          <View key={move.move} style={{ gap: 8, padding: 12, borderWidth: 2, borderColor: colors.chalk }}>
            <Label tone="ember">{fillText(T.exercise, { n: m + 1, total: moves.length })}</Label>
            <Heading>{words.name}</Heading>
            <Body weight="medium">{moveTarget(move)}</Body>
            {before !== undefined && <Small tone="chalk">{fillText(T.lastTime, { sets: setsLine(before) })}</Small>}
            <Small>{words.cue}</Small>
            <Small>{progressLine(words)}</Small>
            <Button label={shown ? T.hide : T.how} accessibilityLabel={`${shown ? T.hide : T.how}: ${words.name}`} variant="secondary"
              onPress={() => setOpen(shown ? null : m)} style={{ alignSelf: 'flex-start' }} />
            {shown && words.steps.map((step, i) => <Body key={i}>{`${i + 1}. ${step}`}</Body>)}
            {sets[m]!.map((n, s) => (
              <View key={s} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderWidth: 2, borderColor: colors.line }}>
                <SetDone n={s + 1} done={done[`${m}:${s}`] === true} onPress={() => toggle(m, s)} />
                <Label style={{ flexGrow: 1, paddingRight: 12, paddingVertical: 8 }}>{fillText(T.set, { n: s + 1 })}</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Step text="−" label={fillText(T.fewer, { name: words.name, n: s + 1 })} onPress={() => change(m, s, -1)} />
                  <Heading accessibilityLabel={`${n} ${unit}`} style={{ minWidth: 56, textAlign: 'center' }}>{String(n)}</Heading>
                  <Step text="+" label={fillText(T.more, { name: words.name, n: s + 1 })} onPress={() => change(m, s, 1)} />
                </View>
              </View>
            ))}
            {restMove === m && <RestBar rest={rest.rest} over={rest.over} now={now} onMore={rest.more} onSkip={rest.skip} />}
          </View>
        );
      })}
      <Small>{T.rest}</Small>
      <Small>{T.note}</Small>
      <Button label={T.log} variant="commitment" disabled={disabled || !sessionValid(sets)} onPress={() => onClaim(sessionPayload(sets))} />
    </View>
  );
}
