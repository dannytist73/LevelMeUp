// The tabs (spec §1.3) with the Ink Panel tab bar. M12 (plan decision 1): Library joins as the second. Monster Week: Today,
// Camp, Lessons (the Library) and Me (Character, with the Chronicle inside it). A simpler day (docs/2026-10-26-simpler-day.md,
// decision 1): three, Camp (the home, where Today and the Camp tab became one), Stories (the Library) and Me, whose tab shows
// a dot while something waits in its Set up list.
import { CAMP_TEXT } from '@levelmeup/content';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../../src/state/store.ts';
import { colors } from '../../src/theme/tokens.ts';
import { InkTabBar } from '../../src/ui/InkTabBar.tsx';
import { tabTop } from '../../src/ui/tabTop.ts';
import { useReduce } from '../../src/ui/useMotion.ts';
import type { TabItem } from '../../src/ui/InkTabBar.tsx';
import { useSetUpItems } from '../../src/screens/character/SetUp.tsx';

const TABS: readonly TabItem[] = [
  { key: 'index', label: CAMP_TEXT.tabs.camp, icon: 'camp' },
  { key: 'library', label: CAMP_TEXT.tabs.stories, icon: 'book' },
  { key: 'character', label: CAMP_TEXT.tabs.me, icon: 'user' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const phase = useGame((s) => s.phase);
  const reduce = useReduce();
  const setUp = useSetUpItems().length > 0;
  // No character yet (M5): the onboarding, never Today's empty state.
  if (phase === 'not_started') return <Redirect href="/onboarding" />;
  return (
    <Tabs
      // M17: tabs cross-fade instead of snapping; still with reduced motion.
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.night }, animation: reduce ? 'none' : 'fade' }}
      tabBar={({ state, navigation }) => (
        <InkTabBar
          tabs={setUp ? TABS.map((t) => (t.key === 'character' ? { ...t, dot: CAMP_TEXT.setUp.dot } : t)) : TABS}
          active={state.routes[state.index]!.name}
          // M17: the tab already shown goes back to its top.
          onSelect={(key) => (key === state.routes[state.index]!.name ? tabTop(key) : navigation.navigate(key))}
          bottomInset={insets.bottom}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="character" />
    </Tabs>
  );
}
