// M17 (UX audit 2026-10-20, O3 and O6): the top row of every tab: its title on the left and the Settings gear on the
// right. Settings opened only from Today before; now it is one tap from every tab, in the same place.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { colors, radius } from '../theme/tokens.ts';
import { Icon } from './icons.tsx';
import { Tap } from './Tap.tsx';

export function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={onPress}
      radius={radius.pill}
      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.panel }}
    >
      <Icon name="settings" size={20} />
    </Tap>
  );
}

/** The title side shrinks and wraps; the gear keeps its 48 dp. */
export function TabTop({ children, onSettings }: { children: ReactNode; onSettings?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <View style={{ flexShrink: 1 }}>{children}</View>
      {onSettings !== undefined && <SettingsButton onPress={onSettings} />}
    </View>
  );
}
