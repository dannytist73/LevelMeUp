// A fade for what follows a moment's slam and thud (plan decision 2): the level-up portrait, an achievement's words.
// `rise` also lifts it 12 px. With reduced motion, the fade alone.
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { FADE_MS, RISE_MS, RISE_PX, timing } from './motion.ts';
import { useReduce } from './useMotion.ts';

export function FadeIn({ children, delay = 0, rise = false, style, reduceMotion }: {
  children: ReactNode;
  delay?: number;
  rise?: boolean;
  style?: StyleProp<ViewStyle>;
  reduceMotion?: boolean;
}) {
  const reduce = useReduce(reduceMotion);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, timing(reduce ? FADE_MS : RISE_MS)));
  }, [progress, delay, reduce]);
  const rising = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * RISE_PX }] }));
  const fading = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <Animated.View testID="fade-in" style={[style, rise && !reduce ? rising : fading]}>
      {children}
    </Animated.View>
  );
}
