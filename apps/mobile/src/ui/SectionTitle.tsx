// A section heading (Lantern, M11): a quiet label ("Core quest") with an optional count at the end of the line.
import { Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';

export function SectionTitle({ title, count }: { title: string; count?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={{ flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, color: colors.ash }}>
        {title}
      </Text>
      {count !== undefined && (
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.ash }}>
          {count}
        </Text>
      )}
    </View>
  );
}
