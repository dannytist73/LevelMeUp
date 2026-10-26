// Monster Week: a Grumble, alive. Its painted stills (src/art/grumbles.ts) breathe, blink now and then, and flinch with a
// squash and a shake when a power shot lands (each new `hitKey`); a pose shows how it feels (idle, hit, happy, sleep) or
// what it does (gift: holding out today's quest).
// Before a Grumble is painted, a soft stand-in in its weakness's colour takes its place. A silhouette is the Grumble yet to
// come. Nothing moves in the background or with reduced motion: then a hit only shows its pose for a moment.
import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';
import type { TrainableStat } from '@levelmeup/rules';
import { GRUMBLE_ART } from '../art/grumbles.ts';
import type { GrumblePose } from '../art/grumbles.ts';
import { colors } from '../theme/tokens.ts';
import { forever, timing } from './motion.ts';
import { useAppActive, useReduce } from './useMotion.ts';

/** How long a hit's pose shows. */
export const HIT_MS = 500;
export const BREATHE_MS = 1300;
export const BLINK_MS = 140;
/** Pauses between blinks, in turn, so two Grumbles side by side never blink together. */
const BLINK_GAPS = [3100, 4300, 2600, 3700, 5000];

const STAND_IN: Readonly<Record<TrainableStat, 'candy' | 'glow' | 'accent' | 'ashLight'>> = {
  strength: 'candy', vitality: 'glow', wisdom: 'ashLight', focus: 'accent',
};

/** The stand-in: a round body, a lighter belly, eyes and a mouth for the pose. */
function StandIn({ weakness, pose, blink, silhouette, size }: { weakness: TrainableStat; pose: GrumblePose; blink: boolean; silhouette: boolean; size: number }) {
  const body = silhouette ? colors.line : colors[STAND_IN[weakness]];
  const shut = blink || pose === 'sleep' || pose === 'happy';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx="50" cy="94" rx="30" ry="4" fill={colors.lip} opacity={0.6} />
      <Path d="M18 88 C12 60 22 22 50 20 C78 22 88 60 82 88 Q66 96 50 94 Q34 96 18 88 Z" fill={body} />
      {!silhouette && (
        <>
          <Ellipse cx="50" cy="70" rx="20" ry="15" fill={colors.white} opacity={0.35} />
          {shut ? (
            <>
              <Path d={pose === 'happy' ? 'M33 50 Q38 44 43 50' : 'M33 48 Q38 52 43 48'} stroke={colors.ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <Path d={pose === 'happy' ? 'M57 50 Q62 44 67 50' : 'M57 48 Q62 52 67 48'} stroke={colors.ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <Ellipse cx="38" cy="48" rx="6" ry={pose === 'hit' ? 4 : 7} fill={colors.ink} />
              <Ellipse cx="62" cy="48" rx="6" ry={pose === 'hit' ? 4 : 7} fill={colors.ink} />
              <Ellipse cx="40" cy="45" rx="2" ry="2" fill={colors.white} />
              <Ellipse cx="64" cy="45" rx="2" ry="2" fill={colors.white} />
            </>
          )}
          {pose === 'hit' && <Ellipse cx="50" cy="63" rx="5" ry="6" fill={colors.ink} />}
          {pose === 'happy' && <Path d="M40 60 Q50 72 60 60" stroke={colors.ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />}
          {(pose === 'idle' || pose === 'sleep') && <Path d="M43 62 Q47 59 50 62 Q53 65 57 62" stroke={colors.ink} strokeWidth="3" strokeLinecap="round" fill="none" />}
        </>
      )}
    </Svg>
  );
}

export type GrumbleArtProps = {
  id: string;
  weakness: TrainableStat;
  size: number;
  pose?: GrumblePose;
  /** The one still to come: dark, no face, no life. */
  silhouette?: boolean;
  /** Breathes and blinks (the arena, a result, the camp); off for small book cells. */
  living?: boolean;
  /** A new value plays a hit: a flinch and the hit pose. */
  hitKey?: number;
  /** What a screen reader says; none when the cell around it says it (then the art is hidden from it). */
  accessibilityLabel?: string;
};

/** Breathing (0 to 1 and back, for a scale) and, now and then, a blink, while `alive`; asleep, no blink. `first` staggers
 * the blinks of creatures side by side. Monster Buddy: the buddies live the same way (BuddyArt). */
export function useBreathBlink(alive: boolean, pose: string, first: number) {
  const breath = useSharedValue(0);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!alive) return;
    breath.value = forever(withTiming(1, timing(BREATHE_MS, Easing.inOut(Easing.sin))), true);
    return () => {
      cancelAnimation(breath);
      breath.value = 0;
    };
  }, [alive, breath]);

  useEffect(() => {
    if (!alive || pose === 'sleep') return;
    let turn = first;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          turn++;
          next();
        }, BLINK_MS);
      }, BLINK_GAPS[turn % BLINK_GAPS.length]!);
    };
    next();
    return () => {
      clearTimeout(timer);
      setBlink(false);
    };
  }, [alive, pose, first]);

  return { breath, blink };
}

export function GrumbleArt({ id, weakness, size, pose = 'idle', silhouette = false, living = true, hitKey = 0, accessibilityLabel }: GrumbleArtProps) {
  const reduce = useReduce();
  const active = useAppActive();
  const alive = living && !silhouette && !reduce && active;
  const { breath, blink } = useBreathBlink(alive, pose, id.length);
  const squash = useSharedValue(0);
  const [hit, setHit] = useState(false);
  const firstHit = useRef(hitKey);

  useEffect(() => {
    if (hitKey === firstHit.current) return;
    firstHit.current = hitKey;
    setHit(true);
    const t = setTimeout(() => setHit(false), HIT_MS);
    if (!reduce) {
      squash.value = withSequence(ReduceMotion.Never, withTiming(1, timing(70)), withSpring(0, { damping: 6, stiffness: 260, mass: 0.5, reduceMotion: ReduceMotion.Never }));
    }
    return () => clearTimeout(t);
  }, [hitKey, reduce, squash]);

  const moving = useAnimatedStyle(() => ({
    transform: [
      { translateX: squash.value * -6 },
      { scaleX: 1 - 0.015 * breath.value + 0.14 * squash.value },
      { scaleY: 1 + 0.035 * breath.value - 0.12 * squash.value },
    ],
  }));

  const shown: GrumblePose = hit ? 'hit' : pose;
  const stills = GRUMBLE_ART[id];
  return (
    <View {...(accessibilityLabel === undefined
      ? { importantForAccessibility: 'no-hide-descendants' as const, accessibilityElementsHidden: true }
      : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel })} testID={`grumble-${id}`} style={{ width: size, height: size }}>
      <Animated.View testID="grumble-body" style={[{ width: size, height: size, transformOrigin: 'bottom' }, moving]}>
        {stills === undefined ? (
          <StandIn weakness={weakness} pose={shown} blink={blink} silhouette={silhouette} size={size} />
        ) : (
          <Image testID="grumble-still" source={blink && shown === 'idle' ? stills.blink : stills[shown]} resizeMode="contain"
            style={{ width: size, height: size, ...(silhouette ? { tintColor: colors.line } : {}) }} />
        )}
      </Animated.View>
    </View>
  );
}
