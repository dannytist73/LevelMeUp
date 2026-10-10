// The System's voice (visual spec §2): a paper box with an ink border and a paper outer ring, and a black "SYSTEM" tab
// on the top edge. Read by screen readers as one line, speaker first.
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';
import { Body } from './Text.tsx';

export function NarrationBox({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityLabel={`System: ${children}`}
      style={[{ marginTop: 14, borderWidth: 2, borderColor: colors.paper }, style]}
    >
      <View style={{ borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper, paddingTop: 20, paddingHorizontal: 16, paddingBottom: 14 }}>
        <Body tone="ink" weight="medium">
          {children}
        </Body>
      </View>
      <View
        style={{
          position: 'absolute', top: -14, left: 12, paddingVertical: 3, paddingHorizontal: 10,
          borderWidth: 2, borderColor: colors.paper, backgroundColor: colors.ink,
        }}
      >
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 17, letterSpacing: 0.14 * 13, color: colors.chalk }}>
          SYSTEM
        </Text>
      </View>
    </View>
  );
}
