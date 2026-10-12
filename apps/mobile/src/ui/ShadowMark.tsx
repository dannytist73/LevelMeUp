// The Shadow's mark as a tag (board F3, "SHADOW MARK" in a dashed ember border): Today's header while the Shadow holds
// the day and the recovery quest isn't cleared (M7c decision 9).
import { Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';

export function ShadowMark({ label, accessibilityLabel }: { label: string; accessibilityLabel: string }) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ember }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 16, letterSpacing: 0.08 * 12, color: colors.ember, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}
