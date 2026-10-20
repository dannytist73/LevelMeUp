// Development only (M7a): Today with a made-up check-in for yesterday, and the check-in screen, in a store of their own.
// Nothing is sent, so the words and the flow can be checked on a device without missing a day.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { project } from '../../game/project.ts';
import { Checkin } from '../../screens/Checkin.tsx';
import { Today } from '../../screens/Today.tsx';
import { GameProvider, useGame } from '../../state/store.ts';
import type { GameState } from '../../state/store.ts';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';

const noop = async () => {};

export default function CheckinPreview() {
  const insets = useSafeAreaInsets();
  const cached = useGame((s) => s.cached);
  const art = useGame((s) => s.art);
  const [screen, setScreen] = useState<'today' | 'checkin'>('today');
  const store = useMemo(() => {
    const state = cached?.state;
    if (state === undefined || state.today === null) return null;
    const core = state.today.quests.find((q) => q.slot === 'core') ?? null;
    const yesterday = Math.max(1, state.today.dayNumber - 1);
    const view = project({
      ...state,
      character: { ...state.character, streak: { ...state.character.streak, awaitingCheckin: true } },
      checkin: {
        id: -1, from: yesterday, to: yesterday, gap: false, date: null, core: core?.templateId ?? null, ladder: core?.ladder ?? null,
        answer: null, secondWind: null, recoveryDayId: null, consequence: null, trialDone: false, note: null,
      },
      lighterPlan: state.lighterPlan === null ? null : { ...state.lighterPlan, offered: true },
    }, []);
    return createStore(() => ({
      // M17: what Today reads since M12/M13 (the preview crashed on `account` without it).
      account: { kind: 'guest' }, accountKnown: true, offers: [], vow: null, markOffer: noop, articles: {}, codex: [], portrait: null,
      phase: 'ready', view, art, status: 'idle', notices: [], signInLost: false, updateRequired: false, trainingNoticeSeen: true, lastSyncedAt: null,
      checkinLater: null, checkinResultSeen: null, shadowSeen: null,
      error: null, pending: [], cached: null, // premium pass: what Today reads now (a refused sync, what waits, the deadline)
      syncNow: noop, dismissNotice: noop, enqueue: noop, startOver: noop, dismissTrainingNotice: noop,
      answerLater: () => {}, reopen: () => {}, dismissCheckinResult: noop,
    })) as unknown as StoreApi<GameState>;
  }, [cached, art]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, gap: 8 }}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <NarrationBox>
          {store === null ? 'No day is cached yet: sync once, then open this preview.' : 'A made-up check-in for yesterday. Nothing is sent.'}
        </NarrationBox>
      </View>
      {store !== null && (
        <GameProvider store={store}>
          {screen === 'today'
            ? (
              <Today
                onSettings={() => {}} onOpenQuest={() => {}} onSwap={() => {}} onPain={() => {}} onVanish={() => {}} onTraining={() => {}}
                onCheckin={() => setScreen('checkin')}
              />
            )
            : <Checkin onDone={() => setScreen('today')} />}
        </GameProvider>
      )}
    </View>
  );
}
