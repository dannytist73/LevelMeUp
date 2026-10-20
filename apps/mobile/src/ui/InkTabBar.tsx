// The tab bar (Lantern, M11): a dark bar with a quiet top line; the active tab's icon sits on a soft pill and its icon
// and label take the accent. Labels are single words, so wrapping could only break one mid-word ("CHARACT/ER" at the
// largest font and display size, found on the emulator): a label grows with the font size while its tab has room, then
// shrinks to fit it. Android shrinks as far as needed (its only floor is 4 px), so nothing is cut; `minimumFontScale`
// applies on iOS only, where 0.6× is still far below what any of these words needs.
// M12 (audit 5, board R3-8): the tab you're on was barely distinct (1.35:1); now its icon sits on a filled accent pill in
// navy and its label is bold accent text. Four tabs (Library joins), each with a ripple.
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts, radius } from '../theme/tokens.ts';
import { Icon } from './icons.tsx';
import { timing } from './motion.ts';
import { Tap } from './Tap.tsx';
import { useReduce } from './useMotion.ts';
import type { IconName } from './icons.tsx';

/** M17: how long the pill takes to grow onto the tab you picked. */
export const PILL_MS = 200;

/**
 * M17: the pill is a layer under every tab's icon, there from the start and shown on the active tab. A pill that only got
 * its colour when its tab was picked drew square on Android (emulator, 0.8.0: round on Today, square on the other tabs).
 * It grows sideways as it fades in, as Material's navigation bar does; with reduced motion it is simply there.
 */
function Pill({ selected }: { selected: boolean }) {
  const reduce = useReduce();
  const shown = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    shown.value = reduce ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, timing(PILL_MS));
  }, [selected, reduce, shown]);
  const look = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ scaleX: 0.5 + 0.5 * shown.value }] }));
  return (
    <Animated.View testID={selected ? 'tab-pill' : undefined} pointerEvents="none"
      style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.pill, backgroundColor: colors.accent }, look]} />
  );
}

export type TabItem = { key: string; label: string; icon: IconName };

export function InkTabBar({
  tabs,
  active,
  onSelect,
  bottomInset = 0,
}: {
  tabs: readonly TabItem[];
  active: string;
  onSelect: (key: string) => void;
  bottomInset?: number;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8 + bottomInset, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.tabBar }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const tone = selected ? colors.accentText : colors.ash;
        return (
          <Tap
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.key)}
            radius={radius.control}
            style={{ flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 2 }}
          >
            <View style={{ paddingHorizontal: 20, paddingVertical: 4 }}>
              <Pill selected={selected} />
              <Icon name={tab.icon} color={selected ? colors.onAccent : tone} />
            </View>
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}
              style={{ fontFamily: selected ? fonts.display : fonts.bodyBold, fontSize: 12, lineHeight: 16, color: tone, textAlign: 'center' }}>
              {tab.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}
