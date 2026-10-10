// The tab bar (visual spec §2, D1 Today): an ink bar under a 2 px chalk rule; the active tab has a 4 px vermilion top
// bar and chalk text. Labels may grow with the font size and wrap rather than truncate.
import { Pressable, Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';
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
      style={{ flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 8 + bottomInset, borderTopWidth: 2, borderTopColor: colors.chalk, backgroundColor: colors.tabBar }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const tone = selected ? colors.chalk : colors.ash;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.key)}
            style={{
              flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6,
              borderTopWidth: 4, borderTopColor: selected ? colors.vermilion : 'transparent',
            }}
          >
            <Icon name={tab.icon} color={tone} />
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tone, textTransform: 'uppercase', textAlign: 'center' }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
