// A card on the night (Lantern, M11): the panel colour with rounded corners and a quiet line, quieter still once done.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, radius, space } from '../theme/tokens.ts';

export function NightCard({ children, quiet = false, style }: { children: ReactNode; quiet?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      testID="night-card"
      style={[
        { padding: 16, gap: 10, borderRadius: radius.card, borderWidth: space.border, borderColor: quiet ? colors.lineSoft : colors.line, backgroundColor: colors.panel },
        style,
      ]}
    >
      {children}
    </View>
  );
}
