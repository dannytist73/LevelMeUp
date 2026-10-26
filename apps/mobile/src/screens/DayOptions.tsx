// A simpler day (docs/2026-10-26-simpler-day.md, decision 5): the day's options, off Camp. Swap, hard day, a rest today
// or tomorrow, the Monk's and Rogue's abilities (DayActions, all shown), and the exercises resting after pain with Resume.
// "I felt pain" is here too for an open exercise quest: pain always offers a rest (CLAUDE.md).
import { CAMP_TEXT, TODAY_TEXT } from '@levelmeup/content';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isExercise } from '../game/adjust.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { DayActions, DayBanners, PausedExercises } from './DayActions.tsx';

export type DayOptionsProps = { onBack: () => void; onSwap: () => void; onVanish: () => void; onPain: (questId: number) => void };

export function DayOptions({ onBack, onSwap, onVanish, onPain }: DayOptionsProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const enqueue = useGame((s) => s.enqueue);
  const today = view?.today ?? null;
  const exercise = today?.quests.find((q) => q.completedAt === null && (q.slot === 'core' || q.slot === 'recovery') && isExercise(q));
  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <TopBar title={TODAY_TEXT.change} onBack={onBack} />
      {view === null || today === null ? (
        <NarrationBox>{CAMP_TEXT.dayNothing}</NarrationBox>
      ) : (
        <View style={{ gap: 20 }}>
          <DayBanners today={today} restDay={view.character.restDay} />
          <DayActions view={view} enqueue={enqueue} onSwap={onSwap} onVanish={onVanish} unfolded
            onPain={exercise === undefined ? undefined : () => onPain(exercise.id)} />
          <PausedExercises view={view} enqueue={enqueue} />
        </View>
      )}
    </ScreenScroll>
  );
}
