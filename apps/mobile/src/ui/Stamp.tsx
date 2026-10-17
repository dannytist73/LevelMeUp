// Stamps (Lantern, M11): an accent circle for XP rewards and an accent outline for marks such as Cleared. Still turned
// a little when asked, never more than 12°. The accent means reward; red is the Shadow's alone.
import { Text, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '../theme/tokens.ts';

export const clampRotation = (degrees: number): number => Math.max(-12, Math.min(12, degrees));

/** The stamp's text grows with the phone's font size (up to 1.2×), and the circle grows with it. */
const STAMP_MAX_SCALE = 1.2;

export function XpStamp({ xp, size: base = 66, rotate = -10, style }: { xp: number; size?: number; rotate?: number; style?: StyleProp<ViewStyle> }) {
  const size = Math.round(base * Math.min(useWindowDimensions().fontScale || 1, STAMP_MAX_SCALE));
  return (
    <View
      accessible
      accessibilityLabel={`+${xp} XP`}
      style={[
        {
          width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: colors.night,
          backgroundColor: colors.commit, alignItems: 'center', justifyContent: 'center',
          transform: [{ rotate: `${clampRotation(rotate)}deg` }],
        },
        style,
      ]}
    >
      <Text maxFontSizeMultiplier={STAMP_MAX_SCALE} style={{ fontFamily: fonts.display, fontSize: Math.round(base * 0.33), lineHeight: Math.round(base * 0.37), color: colors.onAccent }}>
        +{xp}
      </Text>
      <Text maxFontSizeMultiplier={STAMP_MAX_SCALE} style={{ fontFamily: fonts.bodyBold, fontSize: Math.round(base * 0.15), letterSpacing: 1, color: colors.onAccent }}>
        XP
      </Text>
    </View>
  );
}

export function MarkStamp({ text, rotate = -6, style }: { text: string; rotate?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityLabel={text}
      style={[
        {
          alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.accentText,
          transform: [{ rotate: `${clampRotation(rotate)}deg` }],
        },
        style,
      ]}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 15, lineHeight: 19, color: colors.accentText }}>
        {text}
      </Text>
    </View>
  );
}
