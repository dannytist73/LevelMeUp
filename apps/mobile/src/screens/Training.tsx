// Settings → Training (M6c decision 12): the equipment and program the player's workouts follow. Saving sends one
// `training` event: the server re-plans today's open workout and the next days follow the new setup.
import { ADJUST_TEXT, EQUIPMENT_NAMES, LIBRARY, ONBOARDING_TEXT, PLAY_TEXT, PROGRAM_STYLE_CHOICES } from '@levelmeup/content';
import { EQUIPMENT, PROGRAM_STYLES, workoutsFit } from '@levelmeup/rules';
import type { Equipment, ProgramStyle } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label, Small, Title } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';
import { TopBar } from '../ui/TopBar.tsx';

const T = ADJUST_TEXT.training;
const G = ONBOARDING_TEXT.gear;

const sameItems = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

export type TrainingProps = { onDone: () => void; onBack: () => void };

export function Training({ onDone, onBack }: TrainingProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [equipment, setEquipment] = useState<Equipment[] | null>(null);
  const [style, setStyle] = useState<ProgramStyle | null>(null);
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
  const picked = equipment ?? p.equipment;
  const pickedStyle = style ?? p.programStyle;
  const changed = pickedStyle !== p.programStyle || !sameItems(picked, p.equipment);
  const fits = workoutsFit(LIBRARY, {
    classId: p.classId, level: view.character.level, goals: p.goals, minutesPerDay: p.minutesPerDay, difficulty: p.difficulty,
    limitations: p.limitations, gentleStart: p.gentleStart, ownProgram: p.ownProgram, equipment: picked, programStyle: pickedStyle,
    stats: { strength: 0, vitality: 0, wisdom: 0, focus: 0 }, book: p.book,
  });
  const toggle = (item: Equipment) => setEquipment(picked.includes(item) ? picked.filter((e) => e !== item) : [...picked, item]);
  const save = async (): Promise<void> => {
    if (!changed || busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'training', equipment: picked, programStyle: pickedStyle });
    } catch {
      stay();
      setBusy(false);
      return;
    }
    onDone();
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <TopBar onBack={onBack} />
      <Title>{T.title}</Title>
      <Body>{T.line}</Body>
      <View style={{ gap: 12 }}>
        <Label>{G.equipment}</Label>
        {EQUIPMENT.map((item) => (
          <OptionCard key={item} kind="checkbox" label={EQUIPMENT_NAMES[item]} selected={picked.includes(item)} onPress={() => toggle(item)} />
        ))}
        <OptionCard kind="checkbox" label={G.nothing} selected={picked.length === 0} onPress={() => setEquipment([])} />
      </View>
      <View style={{ gap: 12 }}>
        <Label>{G.style}</Label>
        {PROGRAM_STYLES.map((s) => (
          <OptionCard key={s} label={PROGRAM_STYLE_CHOICES[s].name} detail={PROGRAM_STYLE_CHOICES[s].line} selected={pickedStyle === s}
            onPress={() => setStyle(s)} />
        ))}
      </View>
      {!fits && (
        <NightCard>
          <Small tone="chalk">{T.noRoom}</Small>
        </NightCard>
      )}
      <Small>{T.today}</Small>
      <Button label={T.save} variant="commitment" disabled={!changed || busy} onPress={() => void save()} />
    </ScreenScroll>
  );
}
