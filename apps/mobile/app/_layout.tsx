// The root: fonts, the splash screen, the game store and when it syncs (launch, foreground, network back).
import { useFonts } from 'expo-font';
import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { StoreApi } from 'zustand/vanilla';
import { createAppStore } from '../src/state/appStore.ts';
import { GameProvider } from '../src/state/store.ts';
import type { GameState } from '../src/state/store.ts';
import { colors, space } from '../src/theme/tokens.ts';
import { NarrationBox } from '../src/ui/NarrationBox.tsx';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BlackHanSans: require('../assets/fonts/BlackHanSans-Latin.ttf'),
    'GothicA1-Regular': require('../assets/fonts/GothicA1-Regular-Latin.ttf'),
    'GothicA1-Medium': require('../assets/fonts/GothicA1-Medium-Latin.ttf'),
    'GothicA1-Bold': require('../assets/fonts/GothicA1-Bold-Latin.ttf'),
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
      if (state === 'active') void store.getState().syncNow();
    });
    const network = Network.addNetworkStateListener((state) => {
      if (state.isInternetReachable === true) void store.getState().syncNow();
    });
    return () => {
      foreground.remove();
      network.remove();
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
          <NarrationBox>The System could not open its records on this phone. Close the app and open it again.</NarrationBox>
        </View>
      ) : (
        <GameProvider store={store}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }} />
        </GameProvider>
      )}
    </SafeAreaProvider>
  );
}
