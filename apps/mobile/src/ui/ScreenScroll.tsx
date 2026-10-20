// A screen's scroll view. Headers run behind the status bar (edge to edge), so a night band fades in behind the status
// bar as the page scrolls: scrolled text never sits under the clock (device check 10, found on the emulator).
import type { ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens.ts';

/** M17: pull to refresh, where a screen offers it (Today: pull down to sync). */
export type Refresh = { refreshing: boolean; onRefresh: () => void };

export function ScreenScroll({ children, contentContainerStyle, refresh }: { children: ReactNode; contentContainerStyle?: StyleProp<ViewStyle>; refresh?: Refresh }) {
  const insets = useSafeAreaInsets();
  const scrolled = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrolled.value = event.contentOffset.y;
  });
  const band = useAnimatedStyle(() => ({ opacity: interpolate(scrolled.value, [0, Math.max(insets.top, 1)], [0, 1], 'clamp') }));
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      {/* M17 (UX audit N8): a tap on a button lands even while the keyboard is up (it used to only close the keyboard). */}
      <Animated.ScrollView contentContainerStyle={contentContainerStyle} onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled"
        refreshControl={refresh === undefined ? undefined : (
          <RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} colors={[colors.onAccent]} progressBackgroundColor={colors.accent}
            tintColor={colors.accent} progressViewOffset={insets.top} />
        )}>
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
