// The XP bar (D1 Today, D2 Quest cleared): a 14 px bar with a 2 px border (chalk on the night, ink on paper) and a
// vermilion fill.
import { View } from 'react-native';
import { colors } from '../theme/tokens.ts';

/** The filled share of the bar, between 0 and 1. */
export function fillFraction(value: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.max(0, Math.min(1, value / max));
}

export function XpBar({ value, max, label, on = 'night' }: { value: number; max: number; label: string; on?: 'night' | 'paper' }) {
  const paper = on === 'paper';
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
      style={{ height: 14, borderWidth: 2, borderColor: paper ? colors.ink : colors.chalk, backgroundColor: paper ? colors.paper : colors.night }}
    >
      <View style={{ width: `${fillFraction(value, max) * 100}%`, height: '100%', backgroundColor: colors.vermilion }} />
    </View>
  );
}
