// Development only (Monster Week): Today's arena, a won and a lost battle, a camp with friends and a battle waiting for its
// check-in, made up from the real cached day, in a store of their own. Clearing a quest here only marks it on the preview
// (the arena's flinch, burst and gain play); nothing is sent, so the screens can be checked on a device with any character.
import { GRUMBLES } from '@levelmeup/content';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { project } from '../../game/project.ts';
import type { Shown } from '../../game/project.ts';
import type { ServerState } from '../../game/types.ts';
import { BattleResult } from '../../screens/BattleResult.tsx';
import { Camp } from '../../screens/Camp.tsx';
import { Today } from '../../screens/Today.tsx';
import { GameProvider, useGame } from '../../state/store.ts';
import type { GameState, NewEvent } from '../../state/store.ts';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';

type Mode = 'today' | 'won' | 'lost' | 'camp' | 'waiting';
const noop = async () => {};

/** The real state with a made-up battle and camp. */
function madeUp(state: ServerState, mode: Mode): ServerState {
  const won = mode !== 'lost';
  const friends = mode === 'camp' ? 6 : won ? 1 : 0;
  const wins = Object.fromEntries(GRUMBLES.slice(0, friends).map((g) => [g.id, 1]));
  const next = GRUMBLES[friends]!;
  const day = state.today?.dayNumber ?? 1;
  const first = day - ((day - 1) % 3);
  return {
    ...state,
    camp: {
      wins,
      last: { n: 1, grumble: 'snoozle', won, power: won ? 9 : 5, need: 8, rematch: 0, byStat: won ? { vitality: 4, strength: 3, wisdom: 2 } : { strength: 3, focus: 2 } },
    },
    battle: {
      ...state.battle,
      n: 2, grumble: won ? next.id : 'snoozle', weakness: won ? next.weakness : 'vitality', rematch: won ? 0 : 1,
      first: mode === 'waiting' ? first - 3 : first, last: mode === 'waiting' ? first - 1 : first + 2,
      waiting: mode === 'waiting',
    },
  };
}

export default function MonsterPreview() {
  const insets = useSafeAreaInsets();
  const cached = useGame((s) => s.cached);
  const art = useGame((s) => s.art);
  const [mode, setMode] = useState<Mode>('today');
  const store = useMemo(() => {
    const state = cached?.state;
    if (state === undefined || state.today === null || state.battle === undefined) return null;
    const view: Shown = project(madeUp(state, mode), []);
    let s: StoreApi<GameState>;
    // Clearing a quest marks it here only, so the arena's power rises as it would.
    const enqueue = async (event: NewEvent) => {
      if (event.type !== 'complete' || event.instanceId === null) return;
      const v = s.getState().view!;
      const quests = v.today!.quests.map((q) => (q.id === event.instanceId ? { ...q, completedAt: new Date().toISOString() } : q));
      s.setState({ view: { ...v, today: { ...v.today!, quests } } });
    };
    s = createStore(() => ({
      account: { kind: 'guest' }, accountKnown: true, offers: ['monster:intro'], vow: null, markOffer: noop, articles: {}, codex: [], portrait: null,
      phase: 'ready', view, art, status: 'idle', notices: [], signInLost: false, updateRequired: false, trainingNoticeSeen: true, lastSyncedAt: null,
      checkinLater: null, checkinResultSeen: null, shadowSeen: null, celebrations: [],
      error: null, pending: [], cached: null,
      syncNow: noop, dismissNotice: noop, enqueue, startOver: noop, dismissTrainingNotice: noop,
      answerLater: () => {}, reopen: () => {}, dismissCheckinResult: noop,
    })) as unknown as StoreApi<GameState>;
    return s;
  }, [cached, art, mode]);

  const pick = (label: string, m: Mode) => (
    <Button key={m} label={label} variant={mode === m ? 'primary' : 'secondary'} onPress={() => setMode(m)} style={{ flexGrow: 1, minWidth: 96 }} />
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, gap: 8 }}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <NarrationBox>
          {store === null ? 'No day with a battle is cached yet: sync once, then open this preview.' : 'A made-up battle. Clears here are not sent.'}
        </NarrationBox>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[pick('Today', 'today'), pick('Won', 'won'), pick('Lost', 'lost'), pick('Camp', 'camp'), pick('Waiting', 'waiting')]}
        </View>
      </View>
      {store !== null && (
        <GameProvider key={mode} store={store}>
          {mode === 'won' || mode === 'lost'
            ? <BattleResult onDone={() => setMode('today')} onCamp={() => setMode('camp')} />
            : mode === 'camp'
              ? <Camp />
              : <Today onSettings={() => {}} onOpenQuest={() => {}} onSwap={() => {}} onPain={() => {}} onVanish={() => {}} onTraining={() => {}} onCheckin={() => {}} />}
        </GameProvider>
      )}
    </View>
  );
}
