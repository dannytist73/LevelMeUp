// Rep-log quests (spec §3.6, M6a decision 4): each set starts at the target and moves with − and +; sets can be added (up
// to 20) or removed (down to 1). It logs what was done, even below the target (the honor system). M10c: last time's sets
// as a line, and a Done check on each set that starts the rest (decisions 7–8).
import { PLAY_TEXT, fillText } from '@levelmeup/content';
import type { Condition } from '@levelmeup/rules';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { setsLine } from '../../quest/lastSets.ts';
import { MAX_REPS, MAX_SETS, repUnit, repsPayload, repsValid, startingSets } from '../../quest/payload.ts';
import { REPS_REST_MS } from '../../quest/rest.ts';
import { colors, fonts, radius } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Caption, Heading, Label, Small } from '../../ui/Text.tsx';
import { ClaimButton } from './ClaimBar.tsx';
import { keepLogDraft, logDraft } from './logDrafts.ts';
import { RestBar, SetDone, useRest } from './Rest.tsx';

const T = PLAY_TEXT.reps;

export function Step({ text, label, onPress }: { text: string; label: string; onPress: () => void }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} onPress={onPress} radius={radius.control} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 22, color: colors.chalk }}>{text}</Text>
    </Tap>
  );
}

export type RepLogProps = {
  condition: Condition;
  disabled: boolean;
  onClaim: (payload: Record<string, unknown>) => void;
  /** M10c: the sets of the last time this quest was logged on this phone, or null. */
  last?: readonly number[] | null;
  now?: () => number;
  /** M17: names this log's draft (the quest and its target), kept while the app runs. */
  draftKey?: string;
};

export function RepLog({ condition, disabled, onClaim, last = null, now = Date.now, draftKey }: RepLogProps) {
  const [sets, setSets] = useState(() => logDraft<{ sets: number[]; done: boolean[] }>(draftKey)?.sets ?? startingSets(condition));
  const [done, setDone] = useState<boolean[]>(() => logDraft<{ sets: number[]; done: boolean[] }>(draftKey)?.done ?? []);
  useEffect(() => keepLogDraft(draftKey, { sets, done }), [draftKey, sets, done]);
  const rest = useRest(now, REPS_REST_MS);
  const unit = repUnit(condition);
  const change = (index: number, by: number) =>
    setSets((all) => all.map((n, i) => (i === index ? Math.max(0, Math.min(MAX_REPS, n + by)) : n)));
  const toggle = (index: number) => {
    const marking = done[index] !== true;
    setDone((all) => Object.assign([...all], { [index]: marking }));
    if (marking && index < sets.length - 1) rest.start();
  };
  return (
    <View style={{ gap: 12 }}>
      <Caption>{fillText(T.unitLine, { unit })}</Caption>
      {last !== null && <Small>{fillText(T.lastTime, { sets: setsLine(last) })}</Small>}
      {sets.map((n, i) => (
        <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderRadius: radius.control, backgroundColor: colors.panel }}>
          <SetDone n={i + 1} done={done[i] === true} onPress={() => toggle(i)} />
          <Label style={{ flexGrow: 1, paddingRight: 12, paddingVertical: 8 }}>{fillText(T.set, { n: i + 1 })}</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Step text="−" label={fillText(T.fewer, { n: i + 1 })} onPress={() => change(i, -1)} />
            <Heading accessibilityLabel={`${n} ${unit}`} style={{ minWidth: 56, textAlign: 'center' }}>{String(n)}</Heading>
            <Step text="+" label={fillText(T.more, { n: i + 1 })} onPress={() => change(i, 1)} />
          </View>
        </View>
      ))}
      <RestBar rest={rest.rest} over={rest.over} now={now} onMore={rest.more} onSkip={rest.skip} />
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
      <ClaimButton label={sets.length === 1 ? PLAY_TEXT.claim.set : fillText(PLAY_TEXT.claim.sets, { n: sets.length })}
        disabled={disabled || !repsValid(sets)} onPress={() => onClaim(repsPayload(sets))} />
    </View>
  );
}
