// Settings → Your game (spec §1.3; M7b decision 2): the voice, when the quest day ends, the minutes a day and the
// difficulty. Saving sends one `settings` event with all four; the voice shows at once, the rest applies from the next
// quest day. The minutes keep onboarding's notes (M2 review, M6c) for the player's own setup.
import { DIFFICULTY_CHOICES, LIBRARY, ONBOARDING_TEXT, PLAY_TEXT, SETTINGS_TEXT, VOICES, VOICE_NAMES, VOICE_SAMPLES } from '@levelmeup/content';
import type { Voice } from '@levelmeup/content';
import { DIFFICULTIES, MINUTES_OPTIONS, strengthClosed, workoutsFit } from '@levelmeup/rules';
import type { Difficulty } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rulesProfile } from '../game/offlineDay.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { BottomBarFrame } from '../ui/BottomBar.tsx';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label, Small } from '../ui/Text.tsx';
import { TimeStepper } from '../ui/TimeStepper.tsx';
import { useLeavingView } from './leaving.ts';
import { TopBar } from '../ui/TopBar.tsx';

const T = SETTINGS_TEXT.game;
const R = ONBOARDING_TEXT.rhythm;

type Picked = { voice: Voice; boundaryMinutes: number; minutesPerDay: number; difficulty: Difficulty };
/** The day's end on the stepper's half-hour grid: the server takes only whole half hours, a profile may hold any minute. */
const onGrid = (minutes: number): number => (Math.round(minutes / 30) * 30) % (24 * 60);
const KEYS: readonly (keyof Picked)[] = ['voice', 'boundaryMinutes', 'minutesPerDay', 'difficulty'];

export type GameSettingsProps = {
  onDone: () => void; onBack: () => void;
  /** M17: told whether there are unsaved changes, so Back can ask first (lib/leaveGuard.ts). */
  onDirty?: (changed: boolean) => void;
};

export function GameSettings({ onDone, onBack, onDirty }: GameSettingsProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [edits, setEdits] = useState<Partial<Picked>>({});
  const [busy, setBusy] = useState(false);

  if (view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 20 }}>
        <NarrationBox>The System is preparing your trials.</NarrationBox>
        <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }
  const p = view.profile;
  // A day's end off the grid starts at the nearest half hour (review), so a save is never refused for it.
  const saved: Picked = { voice: p.voice, boundaryMinutes: onGrid(p.boundaryMinutes), minutesPerDay: p.minutesPerDay, difficulty: p.difficulty };
  const picked: Picked = { ...saved, ...edits };
  const changed = KEYS.some((k) => picked[k] !== saved[k]);
  // Reported as it draws (it only sets the route's flag), so the loading screen above needs no hook of its own.
  onDirty?.(changed);
  const player = { ...rulesProfile(p, view.character), minutesPerDay: picked.minutesPerDay };
  const noStrength = p.ownProgram && !p.gentleStart && strengthClosed(LIBRARY, player);
  const noWorkouts = !p.ownProgram && !p.gentleStart && !workoutsFit(LIBRARY, player);
  const edit = (patch: Partial<Picked>) => setEdits({ ...edits, ...patch });
  const save = async (): Promise<void> => {
    if (!changed || busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'settings', ...picked });
    } catch {
      stay();
      setBusy(false);
      return;
    }
    onDone();
  };

  // M17 (UX audit O5): Save stays in a bar at the bottom, in reach under any number of options.
  return (
    <BottomBarFrame bar={<Button label={T.save} variant="commitment" disabled={!changed || busy} onPress={() => void save()} />}>
    {(barSpace) => (
    <ScreenScroll contentContainerStyle={{ paddingBottom: barSpace + 24, paddingHorizontal: space.gutter, gap: 16 }}>
      {/* M17: the name in the bar, as on the other Settings screens (review). */}
      <TopBar title={T.title} onBack={onBack} />
      <Body>{T.line}</Body>
      <View style={{ gap: 12 }}>
        <Label>{T.voice}</Label>
        {VOICES.map((voice) => (
          <OptionCard key={voice} label={VOICE_NAMES[voice]} detail={VOICE_SAMPLES[voice]} selected={picked.voice === voice} onPress={() => edit({ voice })} />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <TimeStepper label={T.dayEnd} minutes={picked.boundaryMinutes} onChange={(boundaryMinutes) => edit({ boundaryMinutes })} />
        <Small>{T.dayEndNote}</Small>
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.minutes}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {MINUTES_OPTIONS.map((minutes) => (
            <View key={minutes} style={{ flexGrow: 1, flexBasis: 64 }}>
              <OptionCard center label={String(minutes)} accessibilityLabel={`${minutes} minutes a day`} selected={picked.minutesPerDay === minutes}
                onPress={() => edit({ minutesPerDay: minutes })} />
            </View>
          ))}
        </View>
        {noStrength && (
          <NightCard>
            <Small tone="chalk">{R.ownProgram}</Small>
          </NightCard>
        )}
        {noWorkouts && (
          <NightCard>
            <Small tone="chalk">{R.workouts}</Small>
          </NightCard>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.difficulty}</Label>
        {DIFFICULTIES.map((d) => (
          <OptionCard key={d} label={DIFFICULTY_CHOICES[d].name} detail={DIFFICULTY_CHOICES[d].line} selected={picked.difficulty === d}
            onPress={() => edit({ difficulty: d })} />
        ))}
      </View>
      <Small>{T.when}</Small>
    </ScreenScroll>
    )}
    </BottomBarFrame>
  );
}
