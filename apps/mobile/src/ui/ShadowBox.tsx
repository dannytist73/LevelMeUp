// The Shadow's voice (Lantern, M11): a void box outlined in the Shadow's red, "The Shadow" written small at its top. The
// Shadow speaks only here, never in the System's boxes, and red is its colour alone. Read by screen readers as one line,
// speaker first.
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, radius, space } from '../theme/tokens.ts';
import { Body } from './Text.tsx';

export function ShadowBox({ lines, style }: { lines: readonly string[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityLabel={`The Shadow: ${lines.join(' ')}`}
      style={[
        { gap: 10, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 14, borderRadius: radius.control, borderWidth: space.border, borderColor: colors.shadow, backgroundColor: colors.void },
        style,
      ]}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 * 12, color: colors.shadow }}>
        THE SHADOW
      </Text>
      {lines.map((line) => <Body key={line} weight="medium">{line}</Body>)}
    </View>
  );
}
