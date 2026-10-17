// A quiet action (M10c decision 5): underlined text, for the thing you rarely need ("Logged by mistake? Undo"), so it
// never competes with the screen's one main button. At least 48 high, as every button.
import { Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Body } from './Text.tsx';

export type LinkButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'chalk' | 'accentText';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function LinkButton({ label, onPress, tone = 'chalk', disabled = false, style }: LinkButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }, style]}
    >
      <Body tone={tone} weight="bold" style={{ textDecorationLine: 'underline' }}>{label}</Body>
    </Pressable>
  );
}
