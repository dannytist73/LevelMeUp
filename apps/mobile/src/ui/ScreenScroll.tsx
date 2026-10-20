// A screen's scroll view. Headers run behind the status bar (edge to edge), so a night band fades in behind the status
// bar as the page scrolls: scrolled text never sits under the clock (device check 10, found on the emulator).
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens.ts';

/** M17: pull to refresh, where a screen offers it (Today: pull down to sync). */
export type Refresh = { refreshing: boolean; onRefresh: () => void };

/** The scroll handler, and the band that fades in behind the status bar as the page scrolls. */
function useStatusBand() {
  const insets = useSafeAreaInsets();
  const scrolled = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrolled.value = event.contentOffset.y;
  });
  const band = useAnimatedStyle(() => ({ opacity: interpolate(scrolled.value, [0, Math.max(insets.top, 1)], [0, 1], 'clamp') }));
  const bandView = (
    <Animated.View
      testID="status-band"
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.night }, band]}
    />
  );
  return { insets, onScroll, bandView };
}

export function ScreenScroll({ children, contentContainerStyle, refresh }: { children: ReactNode; contentContainerStyle?: StyleProp<ViewStyle>; refresh?: Refresh }) {
  const { insets, onScroll, bandView } = useStatusBand();
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
      {bandView}
    </View>
  );
}

/** M17: a screen that is one long list (the Codex holds up to 200 lessons): only the rows near the screen are drawn, so
 * it opens at once however full it is. `header` scrolls with the rows; `space` is the gap between rows. */
export function ScreenList<T>({ data, keyOf, renderRow, header, space, contentContainerStyle }: {
  data: readonly T[];
  keyOf: (item: T) => string;
  renderRow: (item: T) => ReactNode;
  header: ReactNode;
  space: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { onScroll, bandView } = useStatusBand();
  // Stable across redraws (review): a new separator type each time remounted every drawn row; the space above each row
  // after the first does the separator's job.
  const renderItem = useCallback(({ item, index }: { item: T; index: number }) => (
    <View style={index > 0 ? { marginTop: space } : undefined}>{renderRow(item)}</View>
  ), [renderRow, space]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <Animated.FlatList<T>
        data={data}
        keyExtractor={keyOf}
        renderItem={renderItem}
        ListHeaderComponent={<View style={{ gap: space, marginBottom: data.length > 0 ? space : 0 }}>{header}</View>}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      />
      {bandView}
    </View>
  );
}
