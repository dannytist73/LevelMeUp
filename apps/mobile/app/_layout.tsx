// The root: fonts, the splash screen, the game store and when it syncs (launch, foreground, network back); M7d:
// notification taps. M10c: the home-screen widget follows the game. A screen that fails shows Crashed (audit 2026-10-15).
import { CRASH_TEXT } from '@levelmeup/content';
import { useFonts } from 'expo-font';
import * as Network from 'expo-network';
import { Stack, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { StoreApi } from 'zustand/vanilla';
import { NoteTaps } from '../src/notify/NoteTaps.tsx';
import { Celebration } from '../src/screens/Celebration.tsx';
import { Crashed } from '../src/screens/Crashed.tsx';
import { createAppStore } from '../src/state/appStore.ts';
import { GameProvider, useGame } from '../src/state/store.ts';
import type { GameState } from '../src/state/store.ts';
import { appliedTheme, applyTheme } from '../src/theme/palettes.ts';
import { colors, space } from '../src/theme/tokens.ts';
import { NarrationBox } from '../src/ui/NarrationBox.tsx';
import { Toasts } from '../src/ui/Toasts.tsx';
import { publishWidget } from '../src/widget/publish.tsx';

void SplashScreen.preventAutoHideAsync();

/** A screen that throws shows Crashed instead of closing the app (audit 2026-10-15); Try again draws it again. */
export const ErrorBoundary = Crashed;

/**
 * M13: the look in use (a Plus theme only while Plus is on) is set before anything below draws, and a new look redraws
 * the whole app: screens read the colours as they draw, and a navigator keeps its screens.
 */
function Themed({ children }: { children: ReactNode }) {
  const look = useGame((s) => s.look);
  const ready = useGame((s) => s.lookReady);
  // Review: nothing is drawn before the look is known, so a launch never redraws itself.
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.night }} />;
  if (appliedTheme() !== look) applyTheme(look);
  return <View key={look} style={{ flex: 1, backgroundColor: colors.night }}>{children}</View>;
}

/** Drawn inside Themed, so the screens' background is the new look's. */
function Screens() {
  // M17 (UX audit O14): the screens that close with an X rise from the bottom (the Shadow's scene fades in), so they read
  // as a layer over where you were, not a page further in.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}>
      <Stack.Screen name="plus" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="trial" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="vanish" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="shadow" options={{ animation: 'fade' }} />
    </Stack>
  );
}

/** After the player picks a new look, the redrawn app starts on Today: this takes them back to Your look once. */
function ThemeReturn() {
  const back = useGame((s) => s.themeReturn);
  const clear = useGame((s) => s.clearThemeReturn);
  const path = usePathname();
  useEffect(() => {
    if (!back) return;
    // If the redrawn app kept its screens, the player is still on Your look: nothing to reopen.
    if (path === '/look') {
      clear();
      return;
    }
    // Cleared inside the timer (review): clearing first re-ran this effect, whose cleanup cancelled the timer.
    const t = setTimeout(() => {
      clear();
      router.push('/settings');
      router.push('/look');
    }, 0);
    return () => clearTimeout(t);
  }, [back, clear, path]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'MPlusRounded-ExtraBold': require('../assets/fonts/MPlusRounded1c-ExtraBold-Latin.ttf'),
    'MPlusRounded-Regular': require('../assets/fonts/MPlusRounded1c-Regular-Latin.ttf'),
    'MPlusRounded-Medium': require('../assets/fonts/MPlusRounded1c-Medium-Latin.ttf'),
    'MPlusRounded-Bold': require('../assets/fonts/MPlusRounded1c-Bold-Latin.ttf'),
  });
  const [store, setStore] = useState<StoreApi<GameState> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let created: StoreApi<GameState> | null = null;
    createAppStore()
      .then((s) => {
        created = s;
        setStore(s);
        void s.getState().boot();
      })
      .catch((error: unknown) => {
        console.error('LevelMeUp could not open its local records', error);
        setFailed(true);
      });
    return () => created?.getState().stop();
  }, []);

  useEffect(() => {
    if (store === null) return;
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // M7a: a check-in put off with "Later" shows again when the app is opened.
        store.getState().reopen();
        void store.getState().syncNow();
      }
    });
    const network = Network.addNetworkStateListener((state) => {
      if (state.isInternetReachable === true) void store.getState().syncNow();
    });
    // M10c decision 9: a changed day redraws the widget; a character that goes (the view gone after one) clears it. Not
    // at launch, before the phone's records are read: the widget keeps what it showed.
    const widget = store.subscribe((now, before) => {
      if (now.view !== before.view && (now.view !== null || before.view !== null)) void publishWidget(now.view);
    });
    if (store.getState().view !== null) void publishWidget(store.getState().view);
    return () => {
      foreground.remove();
      network.remove();
      widget();
    };
  }, [store]);

  const fontsDone = fontsLoaded || fontError !== null;
  const ready = fontsDone && (store !== null || failed);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {store === null ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: space.gutter, backgroundColor: colors.night }}>
          <NarrationBox>{CRASH_TEXT.records}</NarrationBox>
        </View>
      ) : (
        <GameProvider store={store}>
          <Themed>
            <Screens />
            <Celebration />
            <NoteTaps />
            <ThemeReturn />
            <Toasts />
          </Themed>
        </GameProvider>
      )}
    </SafeAreaProvider>
  );
}
