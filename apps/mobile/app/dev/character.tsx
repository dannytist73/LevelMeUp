// Development only (M6d decision 15): Character and Chronicle for a made-up level-10 Mage with a book, a title and two
// months of days, built from the real view, so the screens can be checked on a device before a test character gets
// there. Its own small store, so nothing is sent from the preview itself; "Change book" opens the real book screen for
// the real character (closed below a Mage's level 10, the refusal worth seeing).
import { levelForXp, localDateKey } from '@levelmeup/rules';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { addStatXp } from '../../src/game/project.ts';
import type { Shown } from '../../src/game/project.ts';
import type { ServerState } from '../../src/game/types.ts';
import { Character } from '../../src/screens/Character.tsx';
import { Chronicle } from '../../src/screens/Chronicle.tsx';
import { GameProvider, useGame } from '../../src/state/store.ts';
import type { GameState } from '../../src/state/store.ts';
import { space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { NarrationBox } from '../../src/ui/NarrationBox.tsx';
import { ScreenScroll } from '../../src/ui/ScreenScroll.tsx';

const DAY_MS = 86_400_000;
const shiftDate = (date: string, days: number): string => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
/** Days back from today and their marks: cleared most days, a hard day, two rest days, a paused day, one without either. */
const MARKS: Readonly<Record<number, ServerState['calendar'][number]['mark']>> = { 0: 'open', 3: 'hard', 7: 'rest', 8: 'rest', 12: 'paused', 20: 'none' };

function scholar(real: Shown): Shown {
  let extra = 0;
  while (levelForXp(real.character.totalXp + extra) < 10) extra += 50;
  const character = addStatXp(real.character, { wisdom: extra }, 1);
  const today = localDateKey(real.profile.timeZone, Date.now());
  const days = 60;
  return {
    ...real,
    profile: {
      ...real.profile, classId: 'mage', book: 'Meditations', bookStartedAt: new Date(Date.now() - 20 * DAY_MS).toISOString(),
      booksFinished: [{
        title: 'The Way of Kings', startedAt: new Date(Date.now() - 50 * DAY_MS).toISOString(),
        finishedAt: new Date(Date.now() - 21 * DAY_MS).toISOString(), sessions: 21, minutes: 380,
      }],
    },
    character,
    reading: { sessions: 4, minutes: 60 },
    achievements: ['first-trial', 'streak-7', 'trials-100'],
    calendar: Array.from({ length: days }, (_, back) => ({ dayNumber: days - back, date: shiftDate(today, -back), mark: MARKS[back] ?? 'cleared' })),
    growth: {
      since: shiftDate(today, -(days - 1)), levels: character.level - 1,
      stats: { strength: 1, vitality: 3, wisdom: 9, focus: 4, discipline: 6 }, questsCleared: 134, newRungs: 7,
    },
  };
}

export default function CharacterPreview() {
  const insets = useSafeAreaInsets();
  const real = useGame((s) => s.view);
  const [tab, setTab] = useState<'character' | 'chronicle'>('character');
  const store = useMemo(
    () => (real === null ? null : (createStore(() => ({ view: scholar(real), vow: 'I rise before the sun.', status: 'idle', lastSyncedAt: null })) as unknown as StoreApi<GameState>)),
    [real],
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
        <Button label="Character" variant={tab === 'character' ? 'primary' : 'secondary'} onPress={() => setTab('character')} />
        <Button label="Chronicle" variant={tab === 'chronicle' ? 'primary' : 'secondary'} onPress={() => setTab('chronicle')} />
      </View>
      {store === null ? (
        <ScreenScroll contentContainerStyle={{ padding: space.gutter }}>
          <NarrationBox>Start a test character first.</NarrationBox>
        </ScreenScroll>
      ) : (
        <GameProvider store={store}>
          {tab === 'character'
            ? <Character onChangeClass={() => {}} onOpenBook={() => router.push('/book')} />
            : <Chronicle />}
        </GameProvider>
      )}
    </View>
  );
}
