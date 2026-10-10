// Stamps (visual spec §1.3, §2): a seal-red circle for XP rewards and an ember outline for marks such as CLEARED. Always
// rotated a little, never more than 12°. Red means reward here, never a warning.
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';

export const clampRotation = (degrees: number): number => Math.max(-12, Math.min(12, degrees));

export function XpStamp({ xp, size = 66, rotate = -10, style }: { xp: number; size?: number; rotate?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityLabel={`+${xp} XP`}
      style={[
        {
          width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.chalk,
          backgroundColor: colors.seal, alignItems: 'center', justifyContent: 'center',
          transform: [{ rotate: `${clampRotation(rotate)}deg` }],
        },
        style,
      ]}
    >
      <Text allowFontScaling={false} style={{ fontFamily: fonts.display, fontSize: Math.round(size * 0.35), lineHeight: Math.round(size * 0.37), color: colors.white }}>
        +{xp}
      </Text>
      <Text allowFontScaling={false} style={{ fontFamily: fonts.bodyBold, fontSize: Math.round(size * 0.15), letterSpacing: 1.6, color: colors.white }}>
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
          alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderWidth: 2, borderColor: colors.ember,
          transform: [{ rotate: `${clampRotation(rotate)}deg` }],
        },
        style,
      ]}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 14, lineHeight: 18, letterSpacing: 0.08 * 14, color: colors.ember, textTransform: 'uppercase' }}>
        {text}
      </Text>
    </View>
  );
}
