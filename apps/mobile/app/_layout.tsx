// The root of the base app (docs/2026-10-28-base-app.md): Geist, the splash screen, and the base store, which keeps the
// plan, workouts, reading and food on the phone. Grumble Camp's game store no longer starts (no sync, no game
// notifications); its screens stay in the code, unreachable, until the clean-up (B4). A screen that fails shows Crashed.
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import kvStore from 'expo-sqlite/kv-store';
import * as Crypto from 'expo-crypto';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { StoreApi } from 'zustand/vanilla';
import { BaseProvider, createBaseStore } from '../src/base/store.ts';
import type { BaseState } from '../src/base/store.ts';
import { G } from '../src/base/theme.ts';
import { expoNotes } from '../src/notify/os.ts';
import { Crashed } from '../src/screens/Crashed.tsx';
import { Toasts } from '../src/ui/Toasts.tsx';

void SplashScreen.preventAutoHideAsync();

export const ErrorBoundary = Crashed;

/** Grumble Camp's planned reminders are cleared once, so a tester's phone stops nudging about quests that are gone. */
const GAME_NOTES_CLEARED = 'base.gameNotesCleared';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Geist-Regular': require('../assets/fonts/Geist-Regular-Latin.ttf'),
    'Geist-Medium': require('../assets/fonts/Geist-Medium-Latin.ttf'),
    'Geist-SemiBold': require('../assets/fonts/Geist-SemiBold-Latin.ttf'),
    'Geist-Bold': require('../assets/fonts/Geist-Bold-Latin.ttf'),
  });
  const [store] = useState<StoreApi<BaseState>>(() => createBaseStore({ blobs: kvStore, now: Date.now, newId: Crypto.randomUUID }));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void store.getState().load().then(() => setLoaded(true));
    void (async () => {
      if ((await kvStore.getItem(GAME_NOTES_CLEARED).catch(() => null)) !== null) return;
      await expoNotes.cancelAll();
      await kvStore.setItem(GAME_NOTES_CLEARED, '1');
    })().catch(() => undefined);
  }, [store]);

  const ready = (fontsLoaded || fontError !== null) && loaded;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <BaseProvider store={store}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: G.bg } }}>
          <Stack.Screen name="workout" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="exercise-swap" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="exercise-pain" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="food-add" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
        <Toasts />
      </BaseProvider>
    </SafeAreaProvider>
  );
}
