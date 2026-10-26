// A simpler day (docs/2026-10-26-simpler-day.md, decision 2): the camp at the top of home. A clay painting of the camp at
// its stage (src/art/camp.ts), with the app's own stills standing on it so they stay alive: your buddy by the fire, up to
// six friends around it, and this week's Grumble at the edge, holding out today's quest. The fire's glow flickers. When
// power lands, the visitor flinches, a burst goes off, your buddy throws and the gain floats up. Once the day is done the
// camp goes dark and everyone sleeps. Tapping a friend says the line it joined with. With reduced motion nothing moves.
// A bubble too tall to sit above the visitor (large text) moves under the painting, so nothing is cut off.
import { BUDDIES, CAMP_TEXT, fillText, grumbleById } from '@levelmeup/content';
import type { ClassId, TrainableStat } from '@levelmeup/rules';
import { useEffect, useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { CAMP_ART, campStage } from '../../art/camp.ts';
import type { Spot } from '../../art/camp.ts';
import type { BuddyPose } from '../../art/buddies.ts';
import type { GrumblePose } from '../../art/grumbles.ts';
import { colors, radius } from '../../theme/tokens.ts';
import { BuddyArt } from '../../ui/BuddyArt.tsx';
import { PowerBurst } from '../../ui/fx/Fx.tsx';
import { GrumbleArt, HIT_MS } from '../../ui/GrumbleArt.tsx';
import { forever, timing } from '../../ui/motion.ts';
import { Tap } from '../../ui/Tap.tsx';
import { Small } from '../../ui/Text.tsx';
import { toast } from '../../ui/toast.ts';
import { useAppActive, useReduce } from '../../ui/useMotion.ts';
import { Gain } from './BattleStrip.tsx';

/** Friends drawn on the painting; the rest are in the Grumble book under it. */
export const FRIENDS_AT_FIRE = 6;
const FLICKER_MS = 1100;

export type CampSceneProps = {
  classId: ClassId;
  level: number;
  /** Befriended Grumbles, the first ones nearest the fire. */
  friends: readonly string[];
  visitor: { id: string; weakness: TrainableStat; pose: GrumblePose } | null;
  /** What the visitor says, or nothing. */
  bubble: string | null;
  /** The day is done: the camp goes dark around the fire. */
  night: boolean;
  /** Power that landed while Camp is in front: each new key plays the hit. */
  gain: { key: number; n: number };
};

/** Where a spot puts someone `size` tall, in the scene's own pixels. */
const box = (s: Spot, w: number, h: number) => {
  const size = Math.round(s.h * w);
  return { left: Math.round(s.x * w - size / 2), top: Math.round(s.y * h - size), size };
};

/** A soft oval under someone's feet, so they stand on the grass. */
function Ground({ size }: { size: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: size * 0.16, bottom: -size * 0.04, width: size * 0.68, height: size * 0.12,
      borderRadius: radius.pill, backgroundColor: colors.lip, opacity: 0.45 }} />
  );
}

/** The fire's glow: brighter and dimmer, slowly; steady with reduced motion. */
function FireGlow({ x, y, r, night }: { x: number; y: number; r: number; night: boolean }) {
  const reduce = useReduce();
  const active = useAppActive();
  const flicker = useSharedValue(0.5);
  useEffect(() => {
    if (reduce || !active) return;
    flicker.value = forever(withTiming(1, timing(FLICKER_MS, Easing.inOut(Easing.sin))), true);
    return () => {
      cancelAnimation(flicker);
      flicker.value = 0.5;
    };
  }, [reduce, active, flicker]);
  const glow = useAnimatedStyle(() => ({ opacity: (night ? 0.75 : 0.45) + 0.25 * flicker.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2 }, glow]}>
      <Svg width={r * 2} height={r * 2} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Defs>
          <RadialGradient id="camp-fire" cx={r} cy={r} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.candy} stopOpacity={0.55} />
            <Stop offset="0.45" stopColor={colors.glow} stopOpacity={0.18} />
            <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill="url(#camp-fire)" />
      </Svg>
    </Animated.View>
  );
}

export function CampScene({ classId, level, friends, visitor, bubble, night, gain }: CampSceneProps) {
  const { width } = useWindowDimensions();
  const reduce = useReduce();
  const art = CAMP_ART[campStage(friends.length)];
  const height = Math.round(width / art.ratio);
  /** Your buddy throws for a moment when power lands. */
  const [throwing, setThrowing] = useState(false);
  useEffect(() => {
    if (gain.key === 0) return;
    setThrowing(true);
    const t = setTimeout(() => setThrowing(false), HIT_MS + 300);
    return () => clearTimeout(t);
  }, [gain.key]);
  const buddyPose: BuddyPose = night ? 'sleep' : throwing ? 'throw' : 'idle';
  /** The bubble didn't fit above the visitor: it sits under the painting instead (measured again for new words). */
  const [below, setBelow] = useState(false);
  useEffect(() => setBelow(false), [bubble]);
  const buddy = BUDDIES[classId];
  const shown = friends.slice(0, FRIENDS_AT_FIRE).flatMap((id, i) => {
    const g = grumbleById(id);
    const spot = art.friends[i];
    return g === undefined || spot === undefined ? [] : [{ g, spot }];
  });
  const guest = visitor === null ? undefined : grumbleById(visitor.id);
  const label = fillText(CAMP_TEXT.scene.label, { buddy: buddy.name })
    + (shown.length === 0 ? '' : fillText(CAMP_TEXT.scene.friends, { names: shown.map((f) => f.g.name).join(', ') }))
    + (guest === undefined ? '' : fillText(CAMP_TEXT.scene.visitor, { name: guest.name }));
  const fire = { x: art.fire.x * width, y: art.fire.y * height, r: art.fire.r * width };
  const b = box(art.buddy, width, height);
  const v = box(art.visitor, width, height);

  const said = bubble !== null && visitor !== null;
  return (
    <View>
    <View testID="camp-scene" style={{ width, height }}>
      <Image source={art.picture} resizeMode="cover" accessible accessibilityRole="image" accessibilityLabel={label}
        style={{ position: 'absolute', width, height }} />
      {!night && <FireGlow {...fire} night={false} />}
      {shown.map(({ g, spot }) => {
        const f = box(spot, width, height);
        return (
          <Tap key={g.id} accessibilityRole="button" accessibilityLabel={fillText(CAMP_TEXT.scene.friend, { name: g.name })}
            onPress={() => toast(fillText(CAMP_TEXT.friendSays, { name: g.name, line: g.joined }))} radius={radius.control}
            style={{ position: 'absolute', left: f.left, top: f.top, width: Math.max(44, f.size), height: Math.max(44, f.size) }}>
            <Ground size={f.size} />
            <GrumbleArt id={g.id} weakness={g.weakness} size={f.size} pose={night ? 'sleep' : 'happy'} />
          </Tap>
        );
      })}
      <View pointerEvents="none" style={{ position: 'absolute', left: b.left, top: b.top, width: b.size, height: b.size }}>
        <Ground size={b.size} />
        <BuddyArt classId={classId} level={level} size={b.size} pose={buddyPose} />
      </View>
      {visitor !== null && guest !== undefined && (
        <View pointerEvents="none" style={{ position: 'absolute', left: v.left, top: v.top, width: v.size, height: v.size }}>
          <Ground size={v.size} />
          <GrumbleArt id={visitor.id} weakness={visitor.weakness} size={v.size} pose={visitor.pose} hitKey={gain.key}
            accessibilityLabel={`${guest.name}, ${guest.standsFor}`} />
          {!reduce && <PowerBurst burstKey={gain.key} size={v.size} color={colors.candy} />}
          {!reduce && gain.key > 0 && <Gain n={gain.n} run={gain.key} />}
        </View>
      )}
      {night && (
        <>
          <View pointerEvents="none" style={{ position: 'absolute', width, height, backgroundColor: colors.void, opacity: 0.45 }} />
          <FireGlow {...fire} night />
        </>
      )}
      {said && !below && (
        <View testID="camp-bubble" accessibilityLiveRegion="polite" onLayout={(e) => { if (e.nativeEvent.layout.height > v.top - 4) setBelow(true); }}
          style={{ position: 'absolute', right: Math.max(8, width - (v.left + v.size)), bottom: height - v.top + 2, maxWidth: width * 0.56,
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, borderBottomRightRadius: 4, backgroundColor: colors.paper }}>
          <Small tone="ink">{bubble}</Small>
        </View>
      )}
    </View>
      {said && below && (
        <View testID="camp-bubble" accessibilityLiveRegion="polite"
          style={{ alignSelf: 'flex-end', marginHorizontal: 16, marginTop: -6, maxWidth: width - 32,
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, borderTopRightRadius: 4, backgroundColor: colors.paper }}>
          <Small tone="ink">{bubble}</Small>
        </View>
      )}
    </View>
  );
}
