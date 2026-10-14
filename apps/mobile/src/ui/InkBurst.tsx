// The ink splash (M10a; the video's confetti in the ink-panel look): drops fly out from behind the centre of what it
// wraps and fade, once. Positions come from a fixed table (`inkDrops`). Decoration only: no touches, no screen reader.
// With reduced motion, or `still` (a reopened Quest cleared), it draws nothing.
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { colors } from '../theme/tokens.ts';
import { INK_MS, delayed, inkDrops, timing } from './motion.ts';
import type { InkDrop } from './motion.ts';
import { useReduce } from './useMotion.ts';

function Drop({ drop, progress }: { drop: InkDrop; progress: SharedValue<number> }) {
  const flying = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p === 0 ? 0 : p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
      transform: [{ translateX: drop.dx * p }, { translateY: drop.dy * p }, { scale: 1 - 0.4 * p }],
    };
  });
  return (
    <Animated.View
      testID="ink-drop"
      style={[{ position: 'absolute', width: drop.size, height: drop.size, borderRadius: drop.size / 2, backgroundColor: colors[drop.tone] }, flying]}
    />
  );
}

export function InkBurst({ children, count = 12, radius = 80, delay = 0, still = false, reduceMotion }: {
  children: ReactNode;
  count?: number;
  radius?: number;
  delay?: number;
  still?: boolean;
  reduceMotion?: boolean;
}) {
  const reduce = useReduce(reduceMotion) || still;
  const progress = useSharedValue(0);
  // Worked out once: new drops on each render would restart every drop's animated style (review).
  const drops = useMemo(() => inkDrops(count, radius), [count, radius]);
  useEffect(() => {
    if (!reduce) progress.value = delayed(delay, withTiming(1, timing(INK_MS, Easing.out(Easing.quad))));
  }, [reduce, delay, progress]);
  return (
    <View>
      {!reduce && (
        <View
          testID="ink-burst" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        >
          {drops.map((drop, i) => <Drop key={i} drop={drop} progress={progress} />)}
        </View>
      )}
      {children}
    </View>
  );
}
