// A card on the night (visual spec §2): panel colour with a 2 px chalk border, or a quiet border once it's done.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens.ts';

export function NightCard({ children, quiet = false, style }: { children: ReactNode; quiet?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      testID="night-card"
      style={[{ padding: 14, gap: 10, borderWidth: 2, borderColor: quiet ? colors.lineSoft : colors.chalk, backgroundColor: colors.panel }, style]}
    >
      {children}
    </View>
  );
}
