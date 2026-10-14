// A small label for a stat or a completion type (visual spec §2): solid (paper on the night, ink on paper) or outlined.
// M10c: "ember", seal red with white text, for the one quest to do next.
import { Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';

export function Chip({ label, kind = 'solid', on = 'night' }: { label: string; kind?: 'solid' | 'outline' | 'ember'; on?: 'night' | 'paper' }) {
  if (kind === 'ember') {
    return (
      <View testID="chip" style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.seal }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: colors.white, textTransform: 'uppercase' }}>
          {label}
        </Text>
      </View>
    );
  }
  const solid = kind === 'solid';
  const fg = solid ? (on === 'night' ? colors.ink : colors.chalk) : on === 'night' ? colors.chalk : colors.ink;
  return (
    <View
      testID="chip"
      style={{
        alignSelf: 'flex-start',
        paddingVertical: solid ? 4 : 3,
        paddingHorizontal: solid ? 9 : 8,
        backgroundColor: solid ? (on === 'night' ? colors.paper : colors.ink) : 'transparent',
        borderWidth: solid ? 0 : 1.5,
        borderColor: on === 'night' ? colors.chalk : colors.ink,
      }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: fg, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}
