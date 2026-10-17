// The onboarding's progress (Lantern, M11): one rounded bar per question screen; done = paper, current = the accent.
import { View } from 'react-native';
import { colors, radius } from '../theme/tokens.ts';

export function ProgressSegments({ count, current }: { count: number; current: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: current + 1 }}
      style={{ flexDirection: 'row', gap: 6 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          testID="segment"
          style={{ flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: i < current ? colors.paper : i === current ? colors.accent : colors.segmentNext }}
        />
      ))}
    </View>
  );
}
