// Panels slam in (visual spec §3, about 180 ms); with the phone's reduce-motion setting, they fade instead.
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

export function SlamIn({ children, reduceMotion }: { children: ReactNode; /** Overrides the phone's setting (tests, the kit). */ reduceMotion?: boolean }) {
  const phoneSaysReduce = useReducedMotion();
  const reduce = reduceMotion ?? phoneSaysReduce;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [progress]);
  const moving = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -16 }, { scale: 1 + (1 - progress.value) * 0.04 }],
  }));
  const fading = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <Animated.View testID="slam-in" style={reduce ? fading : moving}>
      {children}
    </Animated.View>
  );
}
