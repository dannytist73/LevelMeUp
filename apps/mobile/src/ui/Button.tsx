// Buttons (visual spec §2): primary is paper on the night and ink on paper; commitment is seal red with white text
// (accept class, swear, sign, claim); secondary is a 2 px outline. At least 48 high; the label wraps instead of cutting.
import { Pressable, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, type as scale } from '../theme/tokens.ts';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'commitment' | 'secondary';
  /** The surface the button sits on. */
  on?: 'night' | 'paper';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', on = 'night', disabled = false, style }: ButtonProps) {
  const look = {
    primary: on === 'night' ? { bg: colors.paper, fg: colors.ink, border: colors.paper } : { bg: colors.ink, fg: colors.chalk, border: colors.ink },
    commitment: { bg: colors.seal, fg: colors.white, border: colors.chalk },
    secondary: { bg: 'transparent', fg: on === 'night' ? colors.chalk : colors.ink, border: on === 'night' ? colors.chalk : colors.ink },
  }[variant];
  const display = variant !== 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          paddingHorizontal: 16,
          paddingVertical: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: look.bg,
          borderWidth: 2,
          borderColor: look.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={scale.label.maxScale}
        style={{
          color: look.fg,
          textAlign: 'center',
          ...(display
            ? { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, letterSpacing: 0.12 * 16, textTransform: 'uppercase' }
            : { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19 }),
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
