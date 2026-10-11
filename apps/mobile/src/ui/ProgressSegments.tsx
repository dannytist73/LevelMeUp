// The onboarding's progress (visual spec §2): one bar per question screen; done = paper, current = vermilion.
import { View } from 'react-native';
import { colors } from '../theme/tokens.ts';

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
          style={{ flex: 1, height: 6, backgroundColor: i < current ? colors.paper : i === current ? colors.vermilion : colors.segmentNext }}
        />
      ))}
    </View>
  );
}
