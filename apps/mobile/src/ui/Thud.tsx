// Stamps thud down (visual spec §3: scale 1.3 to 1) on a stiff spring that overshoots once. It wraps the stamp, so the
// stamp keeps its own rotation. `still` shows the child as it is (Today's streak until it grows). With reduced motion,
// a fade. M10b: `haptic` buzzes as the stamp lands (THUD_LAND_MS after its delay, on the animation clock), the same
// with reduced motion, and never for a still piece (spec decision 6). M12: `sound` plays with it.
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { buzz } from './haptics.ts';
import type { Feel } from './haptics.ts';
import { play } from './sound.ts';
import type { Cue } from './sound.ts';
import { FADE_MS, THUD_FADE_MS, THUD_FROM, THUD_LAND_MS, THUD_SETTLE_MS, THUD_SPRING, after, delayed, timing } from './motion.ts';
import { useReduce, useSettle } from './useMotion.ts';

export function Thud({ children, delay = 0, still = false, style, testID = 'thud', reduceMotion, haptic, sound }: {
  children: ReactNode;
  delay?: number;
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  reduceMotion?: boolean;
  /** M10b: the feel played as the stamp lands. */
  haptic?: Feel;
  /** M12: the sound played as it lands. */
  sound?: Cue;
}) {
  const reduce = useReduce(reduceMotion);
  const scale = useSharedValue(THUD_FROM);
  const opacity = useSharedValue(0);
  const landing = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    opacity.value = delayed(delay, withTiming(1, timing(reduce ? FADE_MS : THUD_FADE_MS)));
    if (!reduce) scale.value = delayed(delay, withSpring(1, THUD_SPRING));
  }, [still, reduce, delay, opacity, scale]);
  useSettle(delay + (reduce ? FADE_MS : THUD_SETTLE_MS), !still, () => {
    opacity.value = 1;
    scale.value = 1;
  });
  // Its own effect (plan decision 4): only these three restart it, and leaving the screen first cancels it. The wait runs
  // on the animation clock, so the buzz lands with the stamp however long the screen takes to draw (emulator check).
  // `landing` stays out of the deps: it never changes on the phone, and Reanimated's Jest mock makes a new one each render.
  useEffect(() => {
    if (still || (haptic === undefined && sound === undefined)) return;
    landing.value = after(delay + THUD_LAND_MS, () => {
      if (haptic !== undefined) buzz(haptic);
      if (sound !== undefined) play(sound);
    });
    return () => cancelAnimation(landing);
  }, [still, haptic, sound, delay]);
  const moving = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const fading = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (still) return <View testID={testID} style={style}>{children}</View>;
  return (
    <Animated.View testID={testID} style={[style, reduce ? fading : moving]}>
      {children}
    </Animated.View>
  );
}
