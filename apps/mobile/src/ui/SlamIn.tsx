// Panels slam in (visual spec §3, about 180 ms); with the phone's reduce-motion setting, they fade instead. M10a: a
// delay, so a moment can stagger its panels; a wrapper style, for layouts that stretch the panel; a fade that runs even
// when the phone asks for reduced motion (plan decision 1).
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { FADE_MS, SLAM_MS, SLAM_PX, timing } from './motion.ts';
import { useReduce } from './useMotion.ts';

export function SlamIn({ children, delay = 0, style, reduceMotion }: {
  children: ReactNode;
  /** Milliseconds before it starts (M10a). */
  delay?: number;
  style?: StyleProp<ViewStyle>;
  /** Overrides the phone's setting (tests, the motion bench). */
  reduceMotion?: boolean;
}) {
  const reduce = useReduce(reduceMotion);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, timing(reduce ? FADE_MS : SLAM_MS)));
  }, [progress, delay, reduce]);
  const moving = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -SLAM_PX }, { scale: 1 + (1 - progress.value) * 0.04 }],
  }));
  const fading = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <Animated.View testID="slam-in" style={[style, reduce ? fading : moving]}>
      {children}
    </Animated.View>
  );
}
