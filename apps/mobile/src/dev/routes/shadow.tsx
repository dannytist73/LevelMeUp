// Development only (M7c): Today after a miss under a pact, the Shadow's scene, the Pact and the focus session, over the
// cached day with a made-up "I just didn't" and its recovery quest, in a store of their own. Nothing is sent, so the
// screens can be checked on a device without missing a day.
import { DAY_MS, questDayDate } from '@levelmeup/rules';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { project } from '../../game/project.ts';
import type { QuestView } from '../../game/types.ts';
import { Pact } from '../../screens/Pact.tsx';
import { ShadowScene } from '../../screens/ShadowScene.tsx';
import { Today } from '../../screens/Today.tsx';
import { Trial } from '../../screens/Trial.tsx';
import { GameProvider, useGame } from '../../state/store.ts';
import type { GameState } from '../../state/store.ts';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';

const noop = async () => {};
type Screen = 'today' | 'scene' | 'pact' | 'trial';

export default function ShadowPreview() {
  const insets = useSafeAreaInsets();
  const cached = useGame((s) => s.cached);
  const [kind, setKind] = useState<'shadow' | 'trial' | 'paused'>('shadow');
  const [screen, setScreen] = useState<Screen>('today');
  const store = useMemo(() => {
    const state = cached?.state;
    if (state === undefined || state.today === null) return null;
    const core = state.today.quests.find((q) => q.slot === 'core') ?? null;
    const yesterday = Math.max(1, state.today.dayNumber - 1);
    // The day before today's window, so the scene shows its "Claimed" stamp.
    const date = questDayDate({
      startsAt: Date.parse(state.today.startsAt!) - DAY_MS, endsAt: Date.parse(state.today.endsAt!) - DAY_MS, timeZone: state.today.timeZone,
    });
    const recovery: QuestView = {
      id: -2, slot: 'recovery', templateId: 'recovery-walk', ladder: null, rung: null, stat: 'discipline', tier: 'minor', minutes: 5,
      completion: 'tap', condition: { kind: 'minutes', minutes: 5 }, hardDay: false, xp: { discipline: 5 }, why: { code: 'recovery' },
      book: null, completedAt: null, rating: null, swaps: [], gentle: null, canStepDown: false,
    };
    const view = project({
      ...state,
      profile: { ...state.profile, accountabilityLevel: kind === 'trial' ? 2 : 1, accountabilityFrom: null },
      character: { ...state.character, streak: { ...state.character.streak, awaitingCheckin: true } },
      // The made-up recovery quest replaces a real one (the emulator: a day with one already cleared).
      today: { ...state.today, quests: [...state.today.quests.filter((q) => q.slot !== 'recovery'), recovery] },
      checkin: {
        id: -1, from: yesterday, to: yesterday, gap: false, date, core: core?.templateId ?? null, ladder: core?.ladder ?? null,
        answer: 'just_didnt', secondWind: null, recoveryDayId: state.today.id, consequence: kind, trialDone: false, note: null,
      },
    }, []);
    return createStore(() => ({
      // M17: what Today reads since M12/M13 (the preview crashed on `account` without it).
      account: { kind: 'guest' }, accountKnown: true, offers: [], vow: null, markOffer: noop, articles: {}, codex: [],
      phase: 'ready', view, status: 'idle', notices: [], signInLost: false, updateRequired: false, trainingNoticeSeen: true, lastSyncedAt: null,
      checkinLater: null, checkinResultSeen: null, shadowSeen: null, draft: { pact: null }, pending: [],
      error: null, cached: null, // premium pass: what Today reads now (a refused sync, the deadline)
      syncNow: noop, dismissNotice: noop, enqueue: noop, startOver: noop, dismissTrainingNotice: noop, editDraft: () => {},
      answerLater: () => {}, reopen: () => {}, dismissCheckinResult: noop, seeShadow: noop, trialMs: async () => 0, saveTrialMs: noop,
    })) as unknown as StoreApi<GameState>;
  }, [cached, kind]);

  const back = () => setScreen('today');
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, gap: 8 }}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <NarrationBox>
          {store === null ? 'No day is cached yet: sync once, then open this preview.' : `A made-up "I just didn't" (${kind}). Nothing is sent.`}
        </NarrationBox>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['shadow', 'trial', 'paused'] as const).map((k) => (
            <Button key={k} label={k} variant={k === kind ? 'primary' : 'secondary'} onPress={() => { setKind(k); setScreen('today'); }} />
          ))}
          <Button label="Scene" variant="secondary" onPress={() => setScreen('scene')} />
          <Button label="Pact" variant="secondary" onPress={() => setScreen('pact')} />
        </View>
      </View>
      {store !== null && (
        <GameProvider store={store}>
          {screen === 'today' && (
            <Today
              onSettings={() => {}} onOpenQuest={() => {}} onSwap={() => {}} onPain={() => {}} onVanish={() => {}} onTraining={() => {}}
              onCheckin={() => {}} onShadow={() => setScreen('scene')} onTrial={() => setScreen('trial')}
            />
          )}
          {screen === 'scene' && <ShadowScene onDone={back} onRecovery={back} onTrial={() => setScreen('trial')} onPact={() => setScreen('pact')} />}
          {screen === 'pact' && <Pact mode="draft" onDone={back} />}
          {screen === 'trial' && <Trial onDone={back} />}
        </GameProvider>
      )}
    </View>
  );
}
