// A section heading with the paper rule after it ("CORE QUEST ———", D1 Today), and an optional count.
import { Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';

export function SectionTitle({ title, count }: { title: string; count?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={1.2}
        style={{ flexShrink: 1, fontFamily: fonts.display, fontSize: 20, lineHeight: 24, letterSpacing: 0.8, color: colors.chalk, textTransform: 'uppercase' }}
      >
        {title}
      </Text>
      <View style={{ flex: 1, height: 2, backgroundColor: colors.paper }} />
      {count !== undefined && (
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 15, lineHeight: 19, color: colors.ash }}>
          {count}
        </Text>
      )}
    </View>
  );
}
