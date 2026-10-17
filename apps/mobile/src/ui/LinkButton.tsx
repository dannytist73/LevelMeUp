// A quiet action (M10c decision 5): underlined text, for the thing you rarely need ("Logged by mistake? Undo"), so it
// never competes with the screen's one main button. At least 48 high, as every button.
import type { StyleProp, ViewStyle } from 'react-native';
import { radius } from '../theme/tokens.ts';
import { Tap } from './Tap.tsx';
import { Body } from './Text.tsx';

export type LinkButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'chalk' | 'accentText' | 'accentInk';
  /** What a screen reader says, when the label alone is ambiguous (defaults to the label). */
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function LinkButton({ label, onPress, tone = 'chalk', disabled = false, style, accessibilityLabel }: LinkButtonProps) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      on={tone === 'accentInk' ? 'paper' : 'night'}
      radius={radius.small}
      style={({ pressed }) => [{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }, style]}
    >
      <Body tone={tone} weight="bold" style={{ textDecorationLine: 'underline' }}>{label}</Body>
    </Tap>
  );
}
