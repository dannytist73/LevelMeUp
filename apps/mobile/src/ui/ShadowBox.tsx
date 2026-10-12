// The Shadow's voice (visual spec §2, "Shadow box"): a void box with an ember border and an ember "THE SHADOW" tab. The
// Shadow speaks only here, never in the System's boxes (visual spec §3). Read by screen readers as one line, speaker first.
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';
import { Body } from './Text.tsx';

export function ShadowBox({ lines, style }: { lines: readonly string[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityLabel={`The Shadow: ${lines.join(' ')}`}
      style={[
        { marginTop: 14, gap: 10, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 14, borderWidth: 2, borderColor: colors.ember, backgroundColor: colors.void },
        style,
      ]}
    >
      {lines.map((line) => <Body key={line} weight="medium">{line}</Body>)}
      <View style={{ position: 'absolute', top: -14, left: 10, paddingVertical: 2, paddingHorizontal: 9, backgroundColor: colors.ember }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 16, letterSpacing: 0.14 * 12, color: colors.ink }}>
          THE SHADOW
        </Text>
      </View>
    </View>
  );
}
