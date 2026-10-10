// A screen's scroll view. Headers run behind the status bar (edge to edge), so a night band fades in behind the status
// bar as the page scrolls: scrolled text never sits under the clock (device check 10, found on the emulator).
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens.ts';

export function ScreenScroll({ children, contentContainerStyle }: { children: ReactNode; contentContainerStyle?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const scrolled = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrolled.value = event.contentOffset.y;
  });
  const band = useAnimatedStyle(() => ({ opacity: interpolate(scrolled.value, [0, Math.max(insets.top, 1)], [0, 1], 'clamp') }));
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <Animated.ScrollView contentContainerStyle={contentContainerStyle} onScroll={onScroll} scrollEventThrottle={16}>
        {children}
      </Animated.ScrollView>
      <Animated.View
        testID="status-band"
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.night }, band]}
      />
    </View>
  );
}
