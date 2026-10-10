// The three tabs (spec §1.3) with the Ink Panel tab bar.
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/tokens.ts';
import { InkTabBar } from '../../src/ui/InkTabBar.tsx';
import type { TabItem } from '../../src/ui/InkTabBar.tsx';

const TABS: readonly TabItem[] = [
  { key: 'index', label: 'Today', icon: 'sun' },
  { key: 'character', label: 'Character', icon: 'user' },
  { key: 'chronicle', label: 'Chronicle', icon: 'calendar' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.night } }}
      tabBar={({ state, navigation }) => (
        <InkTabBar
          tabs={TABS}
          active={state.routes[state.index]!.name}
          onSelect={(key) => navigation.navigate(key)}
          bottomInset={insets.bottom}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="character" />
      <Tabs.Screen name="chronicle" />
    </Tabs>
  );
}
