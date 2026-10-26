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
import { offlineDay } from '../../game/offlineDay.ts';
import { project } from '../../game/project.ts';
import { deviceZone } from '../../state/appStore.ts';
import { GameProvider, useGame } from '../../state/store.ts';
import type { GameState } from '../../state/store.ts';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { Today } from '../../screens/Today.tsx';

const noop = async () => {};

export default function OfflinePreview() {
  const insets = useSafeAreaInsets();
  const cached = useGame((s) => s.cached);
  const preview = useMemo(() => {
    if (cached === null) return null;
    const shown = project(cached.state, []);
    const endsAt = shown.today?.endsAt;
    if (endsAt == null) return null;
    const at = Date.parse(endsAt) + 60_000; // a minute after today ends
    const event = offlineDay(cached.state, shown, at, deviceZone());
    if (event === null) return null;
    const built = { ...event, id: '00000000-0000-4000-8000-0000000000ff' } as const;
    const view = project(cached.state, [built]);
    const store = createStore(() => ({
      // M17: what Today reads since M12/M13 (the preview crashed on `account` without it).
      account: { kind: 'guest' }, accountKnown: true, offers: [], vow: null, markOffer: noop, articles: {}, codex: [],
      phase: 'ready', view, status: 'offline', notices: [], signInLost: false, updateRequired: false, trainingNoticeSeen: true, lastSyncedAt: null,
      checkinLater: null, checkinResultSeen: null,
      // Premium pass A3, A6: Today reads the refused sync, what waits, and the cached state (the day's deadline).
      error: null, pending: [built], cached: { state: cached.state, syncedAt: 0 },
      syncNow: noop, dismissNotice: noop, enqueue: noop, startOver: noop, dismissTrainingNotice: noop,
      answerLater: () => {}, reopen: () => {}, dismissCheckinResult: noop,
    })) as unknown as StoreApi<GameState>;
    return { store, at };
  }, [cached]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, gap: 8 }}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <NarrationBox>{preview === null ? OFFLINE_TEXT.previewNone : OFFLINE_TEXT.previewLead}</NarrationBox>
      </View>
      {preview !== null && (
        <GameProvider store={preview.store}>
          <Today
            onOpenQuest={() => {}} onDay={() => {}}
            now={() => preview.at}
          />
        </GameProvider>
      )}
    </View>
  );
}
