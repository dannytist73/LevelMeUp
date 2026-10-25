// Monster Week (docs/2026-10-25-monster-week.md, board p3-arena): the top of Today. The Grumble here now with its line,
// what it stands for and its weakness, the battle clock, and the power bar to its need. When power rises while Today is
// in front, the Grumble flinches, a burst goes off and the gain floats up; the bar shows the new power either way.
import { MONSTER_TEXT, STAT_NAMES, WEAKNESS_TEXT, fillText, grumbleById } from '@levelmeup/content';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timeLeft } from '../../game/battle.ts';
import type { BattleShown } from '../../game/battle.ts';
import { clockTime, dateLine } from '../../lib/dates.ts';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Chip } from '../../ui/Chip.tsx';
import { PowerBurst } from '../../ui/fx/Fx.tsx';
import { GrumbleArt } from '../../ui/GrumbleArt.tsx';
import { buzz } from '../../ui/haptics.ts';
import { timing } from '../../ui/motion.ts';
import { useReduce } from '../../ui/useMotion.ts';
import { Body, Heading, Label, Small } from '../../ui/Text.tsx';

const A = MONSTER_TEXT.arena;
export const ARENA_GRUMBLE = 132;
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
function PowerBar({ power, need }: { power: number; need: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={fillText(A.powerLabel, { power, need })}
      accessibilityValue={{ min: 0, max: need, now: Math.min(power, need) }} style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: need }, (_, i) => (
        <View key={i} testID={i < power ? 'power-on' : 'power-off'}
          style={{ flex: 1, height: 14, borderRadius: radius.pill, backgroundColor: i < power ? colors.accent : colors.segmentNext }} />
      ))}
    </View>
  );
}

/** "+2", floating up from the Grumble and fading. */
function Gain({ n, run }: { n: number; run: number }) {
  const t = useSharedValue(1);
  useEffect(() => {
    if (run === 0) return;
    t.value = 0;
    t.value = withTiming(1, timing(GAIN_MS, Easing.out(Easing.cubic)));
  }, [run, t]);
  const rising = useAnimatedStyle(() => ({ opacity: t.value >= 1 ? 0 : 1 - t.value * t.value, transform: [{ translateY: -36 * t.value }] }));
  return (
    <Animated.View testID="power-gain" pointerEvents="none" style={[{ position: 'absolute', top: 6, right: 0 }, rising]} importantForAccessibility="no-hide-descendants">
      <Heading tone="candy">{`+${n}`}</Heading>
    </Animated.View>
  );
}

/** The clock's line moves on each minute while Today is in front. */
export const CLOCK_TICK_MS = 30_000;

export function Arena({ battle, timeZone, now = Date.now, shown = true }: { battle: BattleShown; timeZone: string; now?: () => number; shown?: boolean }) {
  const reduce = useReduce();
  const [at, setAt] = useState(now);
  useEffect(() => {
    if (!shown) return;
    setAt(now());
    const t = setInterval(() => setAt(now()), CLOCK_TICK_MS);
    return () => clearInterval(t);
  }, [shown, now]);
  const g = grumbleById(battle.grumble);
  const last = useRef(battle.power);
  const [hit, setHit] = useState({ key: 0, n: 0 });
  useEffect(() => {
    const gained = battle.power - last.current;
    last.current = battle.power;
    if (gained > 0 && shown) {
      setHit((h) => ({ key: h.key + 1, n: gained }));
      buzz('stamp');
    }
  }, [battle.power, shown]);
  if (g === undefined) return null;
  const ready = battle.power >= battle.need;
  return (
    <View testID="arena" style={{ gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: colors.panel, borderWidth: space.border, borderColor: colors.line }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {battle.endsAt !== null && !battle.decided && <Chip label={clockLine(battle.endsAt, timeZone, at)} kind="outline" />}
        {battle.rematch > 0 && <Chip label={A.rematch} kind="solid" />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: ARENA_GRUMBLE, height: ARENA_GRUMBLE }}>
          <GrumbleArt id={g.id} weakness={g.weakness} size={ARENA_GRUMBLE} hitKey={hit.key} accessibilityLabel={`${g.name}, ${g.standsFor}`} />
          {!reduce && <PowerBurst burstKey={hit.key} size={ARENA_GRUMBLE} color={colors.candy} />}
          {!reduce && hit.key > 0 && <Gain n={hit.n} run={hit.key} />}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, borderBottomLeftRadius: 4, backgroundColor: colors.paper }}>
            <Small tone="ink">{g.line}</Small>
          </View>
          <Heading accessibilityRole="header">{g.name}</Heading>
          <Small>{g.standsFor}</Small>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Chip label={fillText(A.weakTo, { stat: STAT_NAMES[battle.weakness] })} kind="candy" />
        <Small>{WEAKNESS_TEXT[battle.weakness]}</Small>
      </View>
      {battle.decided ? (
        <Body>{A.decidedOffline}</Body>
      ) : (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: 12 }}>
            <Label tone="chalk">{fillText(A.power, { power: battle.power, need: battle.need })}</Label>
            {!ready && battle.more > 0 && <Small>{fillText(A.more, { n: battle.more })}</Small>}
          </View>
          <PowerBar power={battle.power} need={battle.need} />
          {ready && <Small tone="accentText">{A.ready}</Small>}
        </View>
      )}
    </View>
  );
}
