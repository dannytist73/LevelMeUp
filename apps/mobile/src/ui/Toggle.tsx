// A switch row (S1 board; M7d): the whole row is the switch, since Android's own is 27 dp tall, under the 44 dp target
// (emulator, M7d row 10). M10b: shared by Settings → Notifications and Settings → Game's Haptics.
import { Switch, View } from 'react-native';
import { colors, radius } from '../theme/tokens.ts';
import { Tap } from './Tap.tsx';
import { Body, Small } from './Text.tsx';

export type ToggleProps = { label: string; line: string; value: boolean; disabled?: boolean; onChange: (on: boolean) => void };

export function Toggle({ label, line, value, disabled = false, onChange }: ToggleProps) {
  return (
    <View style={{ gap: 6 }}>
      <Tap
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={() => onChange(!value)}
        radius={radius.small}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <Body weight="bold" style={{ flexShrink: 1 }}>{label}</Body>
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Switch value={value} disabled={disabled} trackColor={{ false: colors.lineStrong, true: colors.accent }} thumbColor={colors.chalk} />
        </View>
      </Tap>
      <Small>{line}</Small>
    </View>
  );
}
