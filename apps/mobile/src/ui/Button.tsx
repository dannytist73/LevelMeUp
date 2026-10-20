// Buttons (Lantern, M11): pills. Primary is the accent on the night and ink on paper; commitment (accept class, swear,
// sign, claim) is the commit colour; both carry navy text. Secondary is a quiet outline. At least 48 high; the label
// wraps instead of cutting.
// The label fills the button's width: a label box only as wide as its words lost its last word on Android when the text
// view was reused from another screen ("Add a set" showed "Add a", 2026-10-15). M12: a ripple on every press (audit 4)
// and a secondary outline you can see (audit 13).
import { Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, radius, space, type as scale } from '../theme/tokens.ts';
import { Tap } from './Tap.tsx';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'commitment' | 'secondary';
  /** The surface the button sits on. */
  on?: 'night' | 'paper';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** What a screen reader says, when the label alone is ambiguous (defaults to the label). */
  accessibilityLabel?: string;
};

export function Button({ label, onPress, variant = 'primary', on = 'night', disabled = false, style, accessibilityLabel }: ButtonProps) {
  const look = {
    primary: on === 'night' ? { bg: colors.accent, fg: colors.onAccent, border: colors.accent } : { bg: colors.ink, fg: colors.chalk, border: colors.ink },
    commitment: { bg: colors.commit, fg: colors.onAccent, border: colors.commit },
    secondary: { bg: 'transparent', fg: on === 'night' ? colors.chalk : colors.ink, border: on === 'night' ? colors.lineStrong : colors.inkMuted },
  }[variant];
  const display = variant !== 'secondary';
  // M17 (design critique): disabled, every button is a quiet outline at full opacity; faded, the bright ones read as
  // broken (their label fell to about 1.5:1).
  const shown = disabled ? { bg: 'transparent', fg: on === 'night' ? colors.ash : colors.inkMuted, border: on === 'night' ? colors.lineStrong : colors.inkMuted } : look;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      on={display ? 'accent' : on}
      radius={radius.pill}
      style={[
        {
          minHeight: display ? 52 : 48,
          paddingHorizontal: 20,
          paddingVertical: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: shown.bg,
          borderWidth: space.border,
          borderColor: shown.border,
          borderRadius: radius.pill,
        },
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={scale.label.maxScale}
        style={{
          alignSelf: 'stretch',
          color: shown.fg,
          textAlign: 'center',
          ...(display ? { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 } : { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 }),
        }}
      >
        {label}
      </Text>
    </Tap>
  );
}
