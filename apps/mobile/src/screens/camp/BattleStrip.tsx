// A simpler day (docs/2026-10-26-simpler-day.md, decision 3): the battle under the camp scene, in one strip: who is
// visiting and its weakness, the power bar to its need, and the battle clock. It was the Arena card on Today (Monster
// Week, board p3-arena); the Grumble itself now stands in the scene, where it flinches when power lands.
import { CAMP_TEXT, MONSTER_TEXT, STAT_NAMES, fillText, grumbleById } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timeLeft } from '../../game/battle.ts';
import type { BattleShown } from '../../game/battle.ts';
import { clockTime, dateLine } from '../../lib/dates.ts';
import { colors, radius } from '../../theme/tokens.ts';
import { Chip } from '../../ui/Chip.tsx';
import { timing } from '../../ui/motion.ts';
import { Body, Heading, Label, Small } from '../../ui/Text.tsx';

const A = MONSTER_TEXT.arena;
/** How long the gain floats up. */
export const GAIN_MS = 900;

/** "Battle Thu 28 Oct, 4:00 AM · in 1 d 6 h". */
export function clockLine(endsAt: string, timeZone: string, now: number): string {
  const at = Date.parse(endsAt);
  const left = timeLeft(at, now);
  const when = fillText(A.battleAt, { day: dateLine(at, timeZone), time: clockTime(endsAt, timeZone) });
  const count = left.d > 0 ? fillText(A.inDays, { d: left.d, h: left.h }) : fillText(A.inHours, { h: left.h, m: left.m });
  return `${when} · ${count}`;
}

/** The power bar: one segment per point the Grumble needs, filled up to the power. */
export function PowerBar({ power, need }: { power: number; need: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={fillText(A.powerLabel, { power, need })}
      accessibilityValue={{ min: 0, max: need, now: Math.min(power, need) }} style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: need }, (_, i) => (
        <View key={i} testID={i < power ? 'power-on' : 'power-off'}
          style={{ flex: 1, height: 12, borderRadius: radius.pill, backgroundColor: i < power ? colors.accent : colors.segmentNext }} />
      ))}
    </View>
  );
}

/** "+2", floating up from the Grumble and fading. */
export function Gain({ n, run }: { n: number; run: number }) {
  const t = useSharedValue(1);
  useEffect(() => {
    if (run === 0) return;
    t.value = 0;
    t.value = withTiming(1, timing(GAIN_MS, Easing.out(Easing.cubic)));
  }, [run, t]);
  const rising = useAnimatedStyle(() => ({ opacity: t.value >= 1 ? 0 : 1 - t.value * t.value, transform: [{ translateY: -36 * t.value }] }));
  return (
    <Animated.View testID="power-gain" pointerEvents="none" style={[{ position: 'absolute', top: -8, left: 0, right: 0, alignItems: 'center' }, rising]}
      importantForAccessibility="no-hide-descendants">
      <Heading tone="candy">{`+${n}`}</Heading>
    </Animated.View>
  );
}

/** The clock's line moves on each minute while Camp is in front. */
export const CLOCK_TICK_MS = 30_000;

export function BattleStrip({ battle, timeZone, now = Date.now, shown = true }: { battle: BattleShown; timeZone: string; now?: () => number; shown?: boolean }) {
  const [at, setAt] = useState(now);
  useEffect(() => {
    if (!shown) return;
    setAt(now());
    const t = setInterval(() => setAt(now()), CLOCK_TICK_MS);
    return () => clearInterval(t);
  }, [shown, now]);
  const g = grumbleById(battle.grumble);
  if (g === undefined) return null;
  const ready = battle.power >= battle.need;
  return (
    <View testID="battle-strip" style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Label tone="chalk">{fillText(CAMP_TEXT.power, { name: g.name, power: battle.power, need: battle.need })}</Label>
        <Chip label={fillText(A.weakTo, { stat: STAT_NAMES[battle.weakness] })} kind="candy" />
        {battle.rematch > 0 && <Chip label={A.rematch} kind="solid" />}
      </View>
      {battle.waiting ? (
        <Body>{fillText(A.waiting, { name: g.name })}</Body>
      ) : battle.decided ? (
        <Body>{A.decidedOffline}</Body>
      ) : (
        <>
          <PowerBar power={battle.power} need={battle.need} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 12 }}>
            {battle.endsAt !== null && <Small>{clockLine(battle.endsAt, timeZone, at)}</Small>}
            {ready ? <Small tone="accentText">{A.ready}</Small> : battle.more > 0 && <Small>{fillText(A.more, { n: battle.more })}</Small>}
          </View>
        </>
      )}
    </View>
  );
}
