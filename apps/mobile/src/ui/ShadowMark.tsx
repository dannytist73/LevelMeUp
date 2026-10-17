// The Shadow's mark as a tag (board F3; Lantern, M11: a dashed pill in the Shadow's red): Today's header while the
// Shadow holds the day and the recovery quest isn't cleared (M7c decision 9).
import { Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme/tokens.ts';

export function ShadowMark({ label, accessibilityLabel }: { label: string; accessibilityLabel: string }) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.shadow }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: colors.shadow }}>
        {label}
      </Text>
    </View>
  );
}
