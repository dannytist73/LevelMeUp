// Buttons (Lantern, M11): pills. Primary is the accent on the night and ink on paper; commitment (accept class, swear,
// sign, claim) is the commit colour; both carry navy text. Secondary is a quiet outline. At least 48 high; the label
// wraps instead of cutting.
// The label fills the button's width: a label box only as wide as its words lost its last word on Android when the text
// view was reused from another screen ("Add a set" showed "Add a", 2026-10-15). M12: a ripple on every press (audit 4)
// and a secondary outline you can see (audit 13).
// Monster Week: chunky game buttons. Each sits on a darker lip (accentLip under the bright ones, lip under a quiet
// outline) and drops onto it while pressed, so a press feels like pushing a real button; disabled, it lies flat.
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, radius, space, type as scale } from '../theme/tokens.ts';
import { Tap } from './Tap.tsx';

/** Monster Week: how far a button stands on its lip, and drops while pressed. */
export const LIP = 4;

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
  /**
   * Premium pass B5: its work is on its way (a network call). The button is off, and says what it is doing
   * (`busyLabel`, e.g. "Saving…"), so it never looks merely unavailable.
   */
  busy?: boolean;
  busyLabel?: string;
};

export function Button({ label, onPress, variant = 'primary', on = 'night', disabled: off = false, style, accessibilityLabel, busy = false, busyLabel }: ButtonProps) {
  const disabled = off || busy;
  const text = busy && busyLabel !== undefined ? busyLabel : label;
  const look = {
    primary: on === 'night' ? { bg: colors.accent, fg: colors.onAccent, border: colors.accent } : { bg: colors.ink, fg: colors.chalk, border: colors.ink },
    commitment: { bg: colors.commit, fg: colors.onAccent, border: colors.commit },
    secondary: { bg: 'transparent', fg: on === 'night' ? colors.chalk : colors.ink, border: on === 'night' ? colors.lineStrong : colors.inkMuted },
  }[variant];
  const display = variant !== 'secondary';
  // M17 (design critique): disabled, every button is a quiet outline at full opacity; faded, the bright ones read as
  // broken (their label fell to about 1.5:1).
  // Its edge is the quiet line (review), so a disabled outline doesn't look like an enabled one beside it.
  const shown = disabled ? { bg: 'transparent', fg: on === 'night' ? colors.ash : colors.inkMuted, border: on === 'night' ? colors.line : colors.trackOnPaper } : look;
  const lip = disabled ? null : display ? (on === 'night' || variant === 'commitment' ? colors.accentLip : colors.inkSoft) : colors.lip;
  return (
    <View style={[{ paddingBottom: lip === null ? 0 : LIP }, style]}>
      {lip !== null && (
        <View testID="button-lip" pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: LIP, bottom: 0, borderRadius: radius.control, backgroundColor: lip }} />
      )}
    <Tap
      accessibilityRole="button"
      accessibilityLabel={busy && busyLabel !== undefined ? busyLabel : (accessibilityLabel ?? label)}
      accessibilityState={busy ? { disabled: true, busy: true } : { disabled }}
      disabled={disabled}
      onPress={onPress}
      on={display ? 'accent' : on}
      radius={radius.control}
      style={({ pressed }) => [
        {
          minHeight: display ? 52 : 48,
          paddingHorizontal: 20,
          paddingVertical: 8,
          alignItems: 'center',
          justifyContent: 'center',
          // A quiet button is solid over its lip, so the lip shows only below it.
          backgroundColor: shown.bg === 'transparent' && lip !== null ? colors.night : shown.bg,
          borderWidth: space.border,
          borderColor: shown.border,
          borderRadius: radius.control,
        },
        pressed && lip !== null ? { transform: [{ translateY: LIP }] } : null,
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
        {text}
      </Text>
    </Tap>
    </View>
  );
}
