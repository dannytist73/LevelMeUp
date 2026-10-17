// A rounded panel (Lantern, M11; it replaces Ink Panel's slanted panel): paper by default, with ink text inside.
// `outlined` marks the panel you act on now with the accent's border (it replaces the vermilion offset).
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, radius, space } from '../theme/tokens.ts';

export type PanelProps = {
  children: ReactNode;
  fill?: string;
  outlined?: boolean;
  /** Padding and gaps of the content inside the panel. */
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function Panel({ children, fill = colors.paper, outlined = false, contentStyle, style }: PanelProps) {
  return (
    <View
      testID="panel"
      style={[
        {
          borderRadius: radius.card,
          backgroundColor: fill,
          borderWidth: outlined ? space.heroBorder : 0,
          borderColor: colors.accent,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View style={[{ padding: 16 }, contentStyle]}>{children}</View>
    </View>
  );
}
