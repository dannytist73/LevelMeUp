// A small pill for a stat or a completion type (Lantern, M11): solid (paper on the night, ink on paper) or outlined.
// M10c: "accent", the accent with navy text, for the one quest to do next. Monster Week: "candy", the battles' colour.
import { Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme/tokens.ts';

export function Chip({ label, kind = 'solid', on = 'night' }: { label: string; kind?: 'solid' | 'outline' | 'accent' | 'candy'; on?: 'night' | 'paper' }) {
  const solid = kind !== 'outline';
  const bg = kind === 'candy' ? colors.candy : kind === 'accent' ? colors.accent : kind === 'solid' ? (on === 'night' ? colors.paper : colors.ink) : 'transparent';
  const fg = kind === 'accent' || kind === 'candy' ? colors.onAccent : kind === 'solid' ? (on === 'night' ? colors.ink : colors.chalk) : on === 'night' ? colors.ashLight : colors.inkSoft;
  return (
    <View
      testID="chip"
      style={{
        alignSelf: 'flex-start',
        paddingVertical: solid ? 4 : 3,
        paddingHorizontal: solid ? 11 : 10,
        borderRadius: radius.pill,
        backgroundColor: bg,
        borderWidth: solid ? 0 : 1.5,
        borderColor: on === 'night' ? colors.line : colors.inkMuted,
      }}
    >
      <Text maxFontSizeMultiplier={2} style={{ fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: fg }}>
        {label}
      </Text>
    </View>
  );
}
