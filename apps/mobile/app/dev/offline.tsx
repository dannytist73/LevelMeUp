// Development only (M6e decision 14): the day this phone would build from its cached state if today had just ended,
// shown on the real Today screen in a small store of its own. Nothing is sent, so the builder (rules and time zones on
// Hermes) can be checked on a device without waiting for a day boundary offline.
import { OFFLINE_TEXT } from '@levelmeup/content';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { offlineDay } from '../../src/game/offlineDay.ts';
import { project } from '../../src/game/project.ts';
import { deviceZone } from '../../src/state/appStore.ts';
import { GameProvider, useGame } from '../../src/state/store.ts';
import type { GameState } from '../../src/state/store.ts';
import { colors, space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { NarrationBox } from '../../src/ui/NarrationBox.tsx';
import { Today } from '../../src/screens/Today.tsx';

const noop = async () => {};

export default function OfflinePreview() {
  const insets = useSafeAreaInsets();
  const cached = useGame((s) => s.cached);
  const art = useGame((s) => s.art);
  const preview = useMemo(() => {
    if (cached === null) return null;
    const shown = project(cached.state, []);
    const endsAt = shown.today?.endsAt;
    if (endsAt == null) return null;
    const at = Date.parse(endsAt) + 60_000; // a minute after today ends
    const event = offlineDay(cached.state, shown, at, deviceZone());
    if (event === null) return null;
    const view = project(cached.state, [{ ...event, id: '00000000-0000-4000-8000-0000000000ff' }]);
    const store = createStore(() => ({
      phase: 'ready', view, art, status: 'offline', notices: [], signInLost: false, trainingNoticeSeen: true, lastSyncedAt: null,
      syncNow: noop, dismissNotice: noop, enqueue: noop, startOver: noop, dismissTrainingNotice: noop,
    })) as unknown as StoreApi<GameState>;
    return { store, at };
  }, [cached, art]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, gap: 8 }}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <NarrationBox>{preview === null ? OFFLINE_TEXT.previewNone : OFFLINE_TEXT.previewLead}</NarrationBox>
      </View>
      {preview !== null && (
        <GameProvider store={preview.store}>
          <Today onSettings={() => {}} onOpenQuest={() => {}} onSwap={() => {}} onPain={() => {}} onVanish={() => {}} onTraining={() => {}} now={() => preview.at} />
        </GameProvider>
      )}
    </View>
  );
}
