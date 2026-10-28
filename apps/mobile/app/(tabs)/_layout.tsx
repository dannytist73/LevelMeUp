// The base app's tabs (docs/2026-10-28-base-app.md): Today, Train, Read and Eat. Without a plan yet, the plan setup.
// Grumble Camp's tab screens (library, character) stay as files but have no tab.
import { BASE_TEXT } from '@levelmeup/content';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../src/base/icons.tsx';
import type { BaseIcon } from '../../src/base/icons.tsx';
import { useBase } from '../../src/base/store.ts';
import { G } from '../../src/base/theme.ts';
import { T } from '../../src/base/ui.tsx';
import { setTabBarHeight } from '../../src/ui/toast.ts';

const TABS: readonly { key: string; label: string; icon: BaseIcon }[] = [
  { key: 'index', label: BASE_TEXT.tabs.today, icon: 'today' },
  { key: 'train', label: BASE_TEXT.tabs.train, icon: 'train' },
  { key: 'read', label: BASE_TEXT.tabs.read, icon: 'read' },
  { key: 'eat', label: BASE_TEXT.tabs.eat, icon: 'eat' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const hasPlan = useBase((s) => s.plan !== null);
  if (!hasPlan) return <Redirect href="/start" />;
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: G.bg } }}
      tabBar={({ state, navigation }) => (
        <View accessibilityRole="tablist" onLayout={(e) => setTabBarHeight(e.nativeEvent.layout.height)}
          style={{ flexDirection: 'row', backgroundColor: G.tabBar, borderTopWidth: 1, borderTopColor: G.line, paddingBottom: insets.bottom }}>
          {TABS.map((tab) => {
            const on = state.routes[state.index]?.name === tab.key;
            return (
              <Pressable key={tab.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: on }}
                android_ripple={{ color: G.ripple, borderless: false }}
                onPress={() => navigation.navigate(tab.key)}
                style={{ flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 }}>
                <Icon name={tab.icon} size={22} color={on ? G.accentText : G.muted} />
                <T v="label" color={on ? G.text : G.muted} style={{ textAlign: 'center' }}>{tab.label}</T>
              </Pressable>
            );
          })}
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="train" />
      <Tabs.Screen name="read" />
      <Tabs.Screen name="eat" />
    </Tabs>
  );
}
