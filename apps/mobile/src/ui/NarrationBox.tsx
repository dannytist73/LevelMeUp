// The System's voice (Lantern, M11): a panel outlined in the accent, "System" written small at its top. Read by screen
// readers as one line, speaker first.
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, radius, space } from '../theme/tokens.ts';
import { Body } from './Text.tsx';

export function NarrationBox({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityLabel={`System: ${children}`}
      style={[
        { gap: 6, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 14, borderRadius: radius.control, borderWidth: space.border, borderColor: colors.accent, backgroundColor: colors.panel },
        style,
      ]}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 * 12, color: colors.accentText }}>
        SYSTEM
      </Text>
      <Body weight="medium">{children}</Body>
    </View>
  );
}
