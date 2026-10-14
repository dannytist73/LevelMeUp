// Stamps thud down (visual spec §3: scale 1.3 to 1) on a stiff spring that overshoots once. It wraps the stamp, so the
// stamp keeps its own rotation. `still` shows the child as it is (Today's streak until it grows). With reduced motion,
// a fade. M10b: `haptic` buzzes as the stamp lands (THUD_LAND_MS after its delay), the same with reduced motion, and
// never for a still piece (spec decision 6).
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { buzz } from './haptics.ts';
import type { Feel } from './haptics.ts';
import { FADE_MS, THUD_FADE_MS, THUD_FROM, THUD_LAND_MS, THUD_SPRING, delayed, timing } from './motion.ts';
import { useReduce } from './useMotion.ts';

export function Thud({ children, delay = 0, still = false, style, testID = 'thud', reduceMotion, haptic }: {
  children: ReactNode;
  delay?: number;
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  reduceMotion?: boolean;
  /** M10b: the feel played as the stamp lands. */
  haptic?: Feel;
}) {
  const reduce = useReduce(reduceMotion);
  const scale = useSharedValue(THUD_FROM);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    opacity.value = delayed(delay, withTiming(1, timing(reduce ? FADE_MS : THUD_FADE_MS)));
    if (!reduce) scale.value = delayed(delay, withSpring(1, THUD_SPRING));
  }, [still, reduce, delay, opacity, scale]);
  // Its own effect (plan decision 4): only these three restart it, and leaving the screen first cancels it.
  useEffect(() => {
    if (still || haptic === undefined) return;
    const landing = setTimeout(() => buzz(haptic), delay + THUD_LAND_MS);
    return () => clearTimeout(landing);
  }, [still, haptic, delay]);
  const moving = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const fading = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (still) return <View testID={testID} style={style}>{children}</View>;
  return (
    <Animated.View testID={testID} style={[style, reduce ? fading : moving]}>
      {children}
    </Animated.View>
  );
}
