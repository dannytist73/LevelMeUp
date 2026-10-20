// M17 (UX audit 2026-10-20, N7): what comes and goes on a screen moves instead of snapping. A row checked off fades away
// and the rows under it glide up; a section opened in place fades in. Short (180 ms in, 120 ms out, 200 ms to glide), on
// the UI thread, and still when the phone asks for less motion (Reanimated's layout animations read that setting).
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

export const ENTER = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
export const EXIT = FadeOut.duration(120).reduceMotion(ReduceMotion.System);
export const GLIDE = LinearTransition.duration(200).reduceMotion(ReduceMotion.System);

/** Fades in when it appears, out when it goes, and glides when what's above it changes. */
export function Appear({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return <Animated.View testID={testID} entering={ENTER} exiting={EXIT} layout={GLIDE} style={style}>{children}</Animated.View>;
}

/** Glides when what's above it changes; never fades (a section that is always there). */
export function Glide({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Animated.View layout={GLIDE} style={style}>{children}</Animated.View>;
}
