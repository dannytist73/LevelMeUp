// A switch row (S1 board; M7d): the whole row is the switch, since Android's own is 27 dp tall, under the 44 dp target
// (emulator, M7d row 10). M10b: shared by Settings → Notifications and Settings → Game's Haptics.
import { Switch, View } from 'react-native';
import { colors, radius } from '../theme/tokens.ts';
import { Tap } from './Tap.tsx';
import { Body, Small } from './Text.tsx';

export type ToggleProps = {
  label: string; line: string; value: boolean; disabled?: boolean; onChange: (on: boolean) => void;
  /** M17: a row inside a Group card, padded as its other rows. */
  flat?: boolean;
};

export function Toggle({ label, line, value, disabled = false, onChange, flat = false }: ToggleProps) {
  return (
    // M17 (design critique): the words on the left and the switch centred beside them, the whole row the switch (the line
    // floated under the row before).
    <Tap
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={line}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      radius={flat ? 0 : radius.small}
      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, ...(flat ? { paddingHorizontal: 16, paddingVertical: 12 } : {}) }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Body weight="bold">{label}</Body>
        <Small>{line}</Small>
      </View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Switch value={value} disabled={disabled} trackColor={{ false: colors.lineStrong, true: colors.accent }} thumbColor={colors.chalk} />
      </View>
    </Tap>
  );
}
