// Monster Week (docs/2026-10-25-monster-week.md, board p3-friend): a decided battle, shown once. First the battle plays by
// itself: the power you charged flies at the Grumble in glowing shots, each landing with a flinch, the count rising to its
// need. Then the outcome: it joins your camp, or it stays for a rematch, a little friendlier; nothing is ever taken. With
// reduced motion, or after Skip, the outcome shows at once. Monster Buddy: your buddy throws the shots from the corner,
// then cheers a win; a lost battle leaves it as it was.
import { BUDDIES, BUDDY_TEXT, GRUMBLES, MONSTER_TEXT, STAT_NAMES, fillText, grumbleById } from '@levelmeup/content';
import type { Stat } from '@levelmeup/rules';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { resultKey } from '../game/battle.ts';
import { buddySize } from '../game/buddy.ts';
import type { BattleResultView } from '../game/battle.ts';
import { useGame } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { BottomBarFrame } from '../ui/BottomBar.tsx';
import { BUDDY_SCALE, BuddyArt } from '../ui/BuddyArt.tsx';
import { Button } from '../ui/Button.tsx';
import { PowerBurst, PowerShots, SHOT_GAP_MS, SHOT_MS } from '../ui/fx/Fx.tsx';
import { GrumbleArt } from '../ui/GrumbleArt.tsx';
import { buzz } from '../ui/haptics.ts';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { play } from '../ui/sound.ts';
import { Body, Heading, Label, Small, Title } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { useReduce } from '../ui/useMotion.ts';

const R = MONSTER_TEXT.result;
/** The most shots a replay fires: a big win is still about four seconds. */
export const MAX_SHOTS = 12;
export const RESULT_GRUMBLE = 180;
const ARENA_H = 300;
/** The buddy's box in the arena's lower left corner; with it there, the Grumble and its count stand on the right, clear of
 * it at the largest text (review). */
const RESULT_BUDDY = 130;
const BUDDY_LEFT = 4;
const FOE_W = 200;
const FOE_RIGHT = 8;

/** The shots of a replay: each stat's power, in candy when it hit the weakness, spread over at most MAX_SHOTS. */
export function shotsOf(result: Pick<BattleResultView, 'byStat'>, weakness: Stat): { color: string; points: number }[] {
  const points = (Object.entries(result.byStat) as [Stat, number][]).flatMap(([stat, n]) =>
    Array.from({ length: n }, () => (stat === weakness ? colors.candy : colors.glow)));
  if (points.length <= MAX_SHOTS) return points.map((color) => ({ color, points: 1 }));
  const each = points.length / MAX_SHOTS;
  return Array.from({ length: MAX_SHOTS }, (_, i) => ({ color: points[Math.floor(i * each)]!, points: Math.round((i + 1) * each) - Math.round(i * each) }));
}

export function BattleResult({ onDone, onCamp }: { onDone: () => void; onCamp: () => void }) {
  const reduce = useReduce();
  const live = useGame((s) => s.view?.camp?.last ?? null);
  // The battle this screen opened with; a later sync's copy of it would restart the replay (review).
  const [result, setResult] = useState(live);
  useEffect(() => {
    if (result === null && live !== null) setResult(live);
  }, [live, result]);
  const nextUp = useGame((s) => s.view?.battle ?? null);
  const classId = useGame((s) => s.view?.profile.classId ?? null);
  const level = useGame((s) => s.view?.character.level ?? 1);
  const markOffer = useGame((s) => s.markOffer);
  const g = result === null ? undefined : grumbleById(result.grumble);
  const shots = useMemo(() => (result === null || g === undefined ? [] : shotsOf(result, g.weakness)), [result, g]);
  const [landed, setLanded] = useState(0);
  const [over, setOver] = useState(reduce);
  const [width, setWidth] = useState(0);

  // Shown once: marked the moment it opens (game/battle.ts resultToShow).
  useEffect(() => {
    if (result !== null) void markOffer(resultKey(result));
  }, [result, markOffer]);

  useEffect(() => {
    if (over || shots.length === 0 || width === 0) {
      if (shots.length === 0) setOver(true);
      return;
    }
    const timers = shots.map((_, i) => setTimeout(() => {
      setLanded(i + 1);
      buzz('tick');
    }, i * SHOT_GAP_MS + SHOT_MS));
    timers.push(setTimeout(() => setOver(true), (shots.length - 1) * SHOT_GAP_MS + SHOT_MS + 600));
    return () => timers.forEach(clearTimeout);
  }, [over, shots, width]);

  useEffect(() => {
    if (over && result?.won) play('dayDone');
  }, [over, result?.won]);

  if (result === null || g === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.night, paddingHorizontal: space.gutter }}>
        <TopBar title={R.replay} onBack={onDone} kind="close" />
      </View>
    );
  }

  const power = over ? result.power : shots.slice(0, landed).reduce((sum, s) => sum + s.points, 0);
  const pose = over && result.won ? 'happy' : 'idle';
  // The shots leave the ball in its paw: at its right, a little above its middle, wherever its size puts it.
  const drawn = RESULT_BUDDY * BUDDY_SCALE[buddySize(level)];
  const paw = { x: BUDDY_LEFT + (RESULT_BUDDY - drawn) / 2 + drawn * 0.9, y: ARENA_H - drawn * 0.55 };
  const foe = { x: width - FOE_RIGHT - FOE_W / 2, y: ARENA_H * 0.32 };
  const next = result.won && nextUp !== null ? GRUMBLES.find((x) => x.id === nextUp.grumble) : undefined;
  const lines = (Object.entries(result.byStat) as [Stat, number][]).sort((a, b) => b[1] - a[1]);

  const bar = over ? (
    // A simpler day: the camp is home, so "See your camp" is the way back (it had "Back to today" beside it).
    result.won ? <Button label={R.camp} onPress={onCamp} /> : <Button label={R.rematch} onPress={onDone} />
  ) : <Button label={R.skip} variant="secondary" onPress={() => setOver(true)} />;

  return (
    <BottomBarFrame bar={bar}>
      {(space_) => (
        <ScreenScroll contentContainerStyle={{ paddingBottom: space_ + 16 }}>
          <View style={{ paddingHorizontal: space.gutter }}>
            <TopBar title={R.replay} onBack={onDone} kind="close" />
          </View>
          <View testID="battle-arena" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            style={{ height: ARENA_H, alignItems: classId === null ? 'center' : 'flex-end', paddingRight: classId === null ? 0 : FOE_RIGHT,
              justifyContent: 'flex-start', paddingTop: 24, backgroundColor: colors.halftone, overflow: 'hidden' }}>
            <View style={{ width: FOE_W, alignItems: 'center' }}>
              <View style={{ width: RESULT_GRUMBLE, height: RESULT_GRUMBLE }}>
                <GrumbleArt id={g.id} weakness={g.weakness} size={RESULT_GRUMBLE} pose={pose} hitKey={landed}
                  accessibilityLabel={`${g.name}, ${g.standsFor}`} />
                <PowerBurst burstKey={over && result.won ? landed + 1 : landed} size={RESULT_GRUMBLE} color={over ? colors.accent : colors.candy} />
              </View>
              <Label tone="chalk" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>{fillText(MONSTER_TEXT.arena.power, { power, need: result.need })}</Label>
            </View>
            {classId !== null && (
              <View style={{ position: 'absolute', left: BUDDY_LEFT, bottom: 0 }}>
                <BuddyArt classId={classId} level={level} size={RESULT_BUDDY} pose={over ? pose : 'throw'}
                  accessibilityLabel={over ? BUDDIES[classId].name : fillText(BUDDY_TEXT.throwing, BUDDIES[classId])} />
              </View>
            )}
            {!over && <PowerShots colors={shots.map((s) => s.color)} width={width} height={ARENA_H} run={width === 0 ? 0 : 1}
              {...(classId === null ? {} : { origin: paw, target: foe })} />}
          </View>
          {over && (
            <View style={{ paddingHorizontal: space.gutter, paddingTop: 20, gap: 18 }}>
              <View style={{ gap: 6 }}>
                <Title accessibilityRole="header">{fillText(result.won ? R.won : R.lost, { name: g.name })}</Title>
                <Body>{fillText(result.won ? R.wonLine : R.lostLine, { power: result.power, need: result.need })}</Body>
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, backgroundColor: colors.paper }}>
                  <Small tone="ink">{result.won ? g.joined : g.line}</Small>
                </View>
              </View>
              {result.won && lines.length > 0 && (
                <View style={{ gap: 8, padding: 16, borderRadius: radius.card, backgroundColor: colors.panel }}>
                  <Heading>{R.how}</Heading>
                  {lines.map(([stat, n]) => (
                    <Body key={stat} tone={stat === g.weakness ? 'candy' : 'chalk'} weight="bold">
                      {fillText(stat === g.weakness ? R.byStatWeak : R.byStat, { n, stat: STAT_NAMES[stat] })}
                    </Body>
                  ))}
                </View>
              )}
              {next !== undefined && next.id !== g.id && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <GrumbleArt id={next.id} weakness={next.weakness} size={64} silhouette living={false} accessibilityLabel={next.hint} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Label tone="chalk">{R.next}</Label>
                    <Small>{next.hint}</Small>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScreenScroll>
      )}
    </BottomBarFrame>
  );
}
