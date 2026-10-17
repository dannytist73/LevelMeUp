// Loading looks like loading (M12, audit 11, board R3-8): the shapes of what's coming, breathing softly, instead of a
// System line. Still under "Remove animations". Screen readers hear one "Loading".
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { DimensionValue } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, radius } from '../theme/tokens.ts';
import { useReduce } from './useMotion.ts';

/** One block of a skeleton. */
export function Bone({ height, width = '100%', round = radius.small }: { height: number; width?: DimensionValue; round?: number }) {
  return <View style={{ height, width, borderRadius: round, backgroundColor: colors.divider }} />;
}

/** A breathing group of bones. */
export function Skeleton({ children, label = 'Loading', reduceMotion }: { children: ReactNode; label?: string; reduceMotion?: boolean }) {
  const reduce = useReduce(reduceMotion);
  const glow = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    glow.value = withRepeat(withTiming(0.55, { duration: 900 }), -1, true);
    return () => cancelAnimation(glow);
  }, [reduce, glow]);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View testID="skeleton" accessible accessibilityLabel={label} accessibilityRole="progressbar" style={[{ gap: 14 }, style]}>
      {children}
    </Animated.View>
  );
}

/** Today's quests on their way: Up next's card, then three rows. */
export function TodaySkeleton({ reduceMotion }: { reduceMotion?: boolean }) {
  return (
    <Skeleton reduceMotion={reduceMotion}>
      <Bone height={14} width="30%" />
      <View style={{ gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: colors.panel }}>
        <Bone height={12} width="45%" />
        <Bone height={24} width="70%" />
        <Bone height={14} width="55%" />
        <Bone height={52} round={radius.pill} />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.control, backgroundColor: colors.panel }}>
          <Bone height={28} width={28} round={14} />
          <View style={{ flex: 1, gap: 8 }}>
            <Bone height={14} width="60%" />
            <Bone height={10} width="40%" />
          </View>
        </View>
      ))}
    </Skeleton>
  );
}
