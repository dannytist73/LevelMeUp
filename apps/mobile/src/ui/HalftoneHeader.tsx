// A screen header on the halftone (visual spec §2): 7 px chalk dots at 13 % over #1A1A1E, with a slanted bottom edge.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Pattern, Polygon } from 'react-native-svg';
import { colors } from '../theme/tokens.ts';
import { slantPoints } from './SlantPanel.tsx';
import { useSize } from './useSize.ts';

export function HalftoneHeader({ children, slant = 0.16, style }: { children: ReactNode; slant?: number; style?: StyleProp<ViewStyle> }) {
  const [size, onLayout] = useSize();
  return (
    <View onLayout={onLayout} style={[{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 56, gap: 14 }, style]}>
      {size !== null && (
        <Svg width={size.width} height={size.height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Defs>
            <Pattern id="halftone" width="7" height="7" patternUnits="userSpaceOnUse">
              <Circle cx="3.5" cy="3.5" r="1.1" fill={colors.chalk} fillOpacity={0.13} />
            </Pattern>
          </Defs>
          <Polygon points={slantPoints('bottom', size.height * slant, size.width, size.height)} fill={colors.halftone} />
          <Polygon points={slantPoints('bottom', size.height * slant, size.width, size.height)} fill="url(#halftone)" />
        </Svg>
      )}
      {children}
    </View>
  );
}
