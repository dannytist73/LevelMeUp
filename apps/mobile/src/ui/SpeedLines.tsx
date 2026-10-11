// Speed lines (visual spec §2): thin radial strokes behind a big moment (awakening, analysis, reveal). Drawn once for
// the laid-out size and never moving, so reduced motion needs no other path.
import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { colors } from '../theme/tokens.ts';
import { useSize } from './useSize.ts';

const RAYS = 36;

export function SpeedLines({ opacity = 0.12 }: { opacity?: number }) {
  const [size, onLayout] = useSize();
  return (
    <View testID="speed-lines" pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden onLayout={onLayout} style={StyleSheet.absoluteFill}>
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
    </View>
  );
}
