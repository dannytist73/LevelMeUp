// Every tap answers (M12, audit 4, board R3-8): Android's own ripple within the shape that was pressed, and a darker
// press on other platforms. Every tappable thing in the app is one of these, so none stays silent under a finger.
import { Platform, Pressable } from 'react-native';
import type { PressableProps, PressableStateCallbackType, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens.ts';

/** The surface under the press: the ripple is a tint that reads on it. */
export type TapSurface = 'night' | 'paper' | 'accent';

// Read when a Tap draws, so a Plus look's ripple follows it (M13).
export const RIPPLE: Readonly<Record<TapSurface, string>> = {
  get night() { return colors.rippleNight; },
  get paper() { return colors.ripplePaper; },
  get accent() { return colors.rippleAccent; },
};

export type TapProps = Omit<PressableProps, 'style' | 'android_ripple'> & {
  on?: TapSurface;
  /** The shape's corner radius: the ripple stays inside it. */
  radius?: number;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

export function Tap({ on = 'night', radius, style, children, ...rest }: TapProps) {
  return (
    <Pressable
      android_ripple={{ color: RIPPLE[on], foreground: true }}
      style={(state) => [
        radius === undefined ? null : { borderRadius: radius, overflow: 'hidden' },
        Platform.OS !== 'android' && state.pressed ? { opacity: 0.8 } : null,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
