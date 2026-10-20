// The tabs (spec §1.3) with the Ink Panel tab bar. M12 (plan decision 1): Library joins as the second.
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../../src/state/store.ts';
import { colors } from '../../src/theme/tokens.ts';
import { InkTabBar } from '../../src/ui/InkTabBar.tsx';
import { useReduce } from '../../src/ui/useMotion.ts';
import type { TabItem } from '../../src/ui/InkTabBar.tsx';

const TABS: readonly TabItem[] = [
  { key: 'index', label: 'Today', icon: 'sun' },
  { key: 'library', label: 'Library', icon: 'book' },
  { key: 'character', label: 'Character', icon: 'user' },
  { key: 'chronicle', label: 'Chronicle', icon: 'calendar' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const phase = useGame((s) => s.phase);
  const reduce = useReduce();
  // No character yet (M5): the onboarding, never Today's empty state.
  if (phase === 'not_started') return <Redirect href="/onboarding" />;
  return (
    <Tabs
      // M17: tabs cross-fade instead of snapping; still with reduced motion.
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.night }, animation: reduce ? 'none' : 'fade' }}
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
      <Tabs.Screen name="library" />
      <Tabs.Screen name="character" />
      <Tabs.Screen name="chronicle" />
    </Tabs>
  );
}
