// M17 (UX audit 2026-10-20, O5): a screen's one button fixed at the bottom, above the gesture bar, so it is in reach
// however long the screen is (Your game's and Training's Save sat under up to 13 option cards). The scroll ends above
// the bar, as tall as the bar really is.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme/tokens.ts';

/** The bar's height before it is measured. */
export const BOTTOM_BAR_SPACE = 84;

export function BottomBarFrame({ bar, children, testID = 'bottom-bar' }: { bar: ReactNode; children: (space: number) => ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(BOTTOM_BAR_SPACE + insets.bottom);
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      {children(height)}
      <View testID={testID} onLayout={(e) => setHeight(Math.ceil(e.nativeEvent.layout.height))} style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, gap: 6, paddingTop: 12, paddingHorizontal: space.gutter,
        paddingBottom: insets.bottom + 12, backgroundColor: colors.night, borderTopWidth: 1, borderTopColor: colors.divider,
      }}>
        {bar}
      </View>
    </View>
  );
}
