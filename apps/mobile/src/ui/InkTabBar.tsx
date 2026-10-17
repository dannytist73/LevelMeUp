// The tab bar (Lantern, M11): a dark bar with a quiet top line; the active tab's icon sits on a soft pill and its icon
// and label take the accent. Labels are single words, so wrapping could only break one mid-word ("CHARACT/ER" at the
// largest font and display size, found on the emulator): a label grows with the font size while its tab has room, then
// shrinks to fit it. Android shrinks as far as needed (its only floor is 4 px), so nothing is cut; `minimumFontScale`
// applies on iOS only, where 0.6× is still far below what any of these words needs.
import { Pressable, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme/tokens.ts';
import { Icon } from './icons.tsx';
import type { IconName } from './icons.tsx';

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
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.key)}
            style={{ flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 4 }}
          >
            <View testID={selected ? 'tab-pill' : undefined} style={{ paddingHorizontal: 18, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: selected ? colors.panel : 'transparent' }}>
              <Icon name={tab.icon} color={tone} />
            </View>
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, color: tone, textAlign: 'center' }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
