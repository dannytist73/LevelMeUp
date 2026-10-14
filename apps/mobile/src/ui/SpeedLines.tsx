// Speed lines (visual spec §2): thin radial strokes behind a big moment, drawn once for the laid-out size. M10a: `burst`
// (the reveal, a level-up, quest cleared; visual spec §3) scales the drawing out from 0.6 as it fades in, once, as one
// view; with reduced motion it only fades in. Without `burst` it never moves (awakening, analysis, an achievement).
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { colors } from '../theme/tokens.ts';
import { BURST_FROM, BURST_MS, FADE_MS, timing } from './motion.ts';
import { useReduce } from './useMotion.ts';
import { useSize } from './useSize.ts';

const RAYS = 36;

export function SpeedLines({ opacity = 0.12, burst = false, reduceMotion }: { opacity?: number; burst?: boolean; reduceMotion?: boolean }) {
  const [size, onLayout] = useSize();
  const reduce = useReduce(reduceMotion);
  const progress = useSharedValue(burst ? 0 : 1);
  useEffect(() => {
    if (burst) progress.value = withTiming(1, timing(reduce ? FADE_MS : BURST_MS));
  }, [burst, reduce, progress]);
  const bursting = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: BURST_FROM + (1 - BURST_FROM) * progress.value }] }));
  const fading = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <Animated.View
      testID="speed-lines" pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden onLayout={onLayout}
      style={[StyleSheet.absoluteFill, burst ? (reduce ? fading : bursting) : null]}
    >
      {size !== null && (
        <Svg width={size.width} height={size.height}>
          {Array.from({ length: RAYS }, (_, i) => {
            const angle = (i / RAYS) * 2 * Math.PI;
            const cx = size.width / 2;
            const cy = size.height / 2;
            const outer = Math.hypot(cx, cy);
            const inner = outer * (i % 2 === 0 ? 0.35 : 0.5);
            return (
              <Line
                key={i}
                x1={cx + Math.cos(angle) * inner} y1={cy + Math.sin(angle) * inner}
                x2={cx + Math.cos(angle) * outer} y2={cy + Math.sin(angle) * outer}
                stroke={colors.chalk} strokeOpacity={opacity} strokeWidth={i % 3 === 0 ? 2 : 1}
              />
            );
          })}
        </Svg>
      )}
    </Animated.View>
  );
}
