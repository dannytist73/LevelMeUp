// A screen's header (Lantern, M11; it replaces Ink Panel's halftone header): a shade above the night with rounded
// bottom corners. Calm on purpose: no dots, no slant.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens.ts';

export const HEADER_RADIUS = 28;

export function ScreenHeader({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      testID="screen-header"
      style={[
        {
          paddingTop: 22, paddingHorizontal: 20, paddingBottom: 24, gap: 14, marginBottom: 20,
          backgroundColor: colors.halftone, borderBottomLeftRadius: HEADER_RADIUS, borderBottomRightRadius: HEADER_RADIUS,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
