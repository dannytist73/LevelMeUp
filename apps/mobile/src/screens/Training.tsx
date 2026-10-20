// Settings → Training (M6c decision 12): the equipment and program the player's workouts follow. Saving sends one
// `training` event: the server re-plans today's open workout and the next days follow the new setup. M16 (plan
// 2026-10-20-m16-weekly-program.md, decisions 1 and 8): the plan, step by step or the weekly program, and its workouts a
// week; a new plan starts with tomorrow's quests.
import { ADJUST_TEXT, EQUIPMENT_NAMES, FEEDBACK_TEXT, LIBRARY, ONBOARDING_TEXT, PROGRAM_STYLE_CHOICES, fillText } from '@levelmeup/content';
import { EQUIPMENT, PROGRAM_DAYS_OPTIONS, PROGRAM_STYLES, TRAINING_PLANS, workoutsFit } from '@levelmeup/rules';
import type { Equipment, ProgramStyle, TrainingPlan } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useGame } from '../state/store.ts';
import { radius, space } from '../theme/tokens.ts';
import { BottomBarFrame } from '../ui/BottomBar.tsx';
import { Button } from '../ui/Button.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { SaveFailed } from '../ui/SaveFailed.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Bone, Skeleton } from '../ui/Skeleton.tsx';
import { Body, Label, Small } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';
import { TopBar } from '../ui/TopBar.tsx';
import { toast } from '../ui/toast.ts';

const T = ADJUST_TEXT.training;
const G = ONBOARDING_TEXT.gear;

const sameItems = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

export type TrainingProps = {
  onDone: () => void; onBack: () => void;
  /** M17: told whether there are unsaved changes, so Back can ask first (lib/leaveGuard.ts). */
  onDirty?: (changed: boolean) => void;
};

export function Training({ onDone, onBack, onDirty }: TrainingProps) {
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [equipment, setEquipment] = useState<Equipment[] | null>(null);
  const [style, setStyle] = useState<ProgramStyle | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  /** Premium pass A7: the phone couldn't save it. */
  const [failed, setFailed] = useState(false);

  if (view === null) {
    return (
      // Premium pass C3: loading looks like loading (it said "The System is preparing your trials."), under the screen's own bar.
      <ScreenScroll contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 20 }}>
        <TopBar title={T.title} onBack={onBack} />
        <Skeleton><Bone height={20} width="70%" /><Bone height={76} round={radius.card} /><Bone height={76} round={radius.card} /></Skeleton>
      </ScreenScroll>
    );
  }
  const p = view.profile;
  // A state cached before M16 has no plan: the step-by-step one.
  const currentPlan: TrainingPlan = p.trainingPlan ?? 'build';
  const currentDays = p.programDays ?? 3;
  const picked = equipment ?? p.equipment;
  const pickedStyle = style ?? p.programStyle;
  const pickedPlan = plan ?? currentPlan;
  const pickedDays = days ?? currentDays;
  const weekly = pickedPlan === 'weekly';
  // The workouts a week matter only on the weekly program (the choice is hidden otherwise).
  const sentDays = weekly ? pickedDays : currentDays;
  const changed = pickedStyle !== p.programStyle || !sameItems(picked, p.equipment) || pickedPlan !== currentPlan || sentDays !== currentDays;
  // Reported as it draws (it only sets the route's flag), so the loading screen above needs no hook of its own.
  onDirty?.(changed);
  const fits = workoutsFit(LIBRARY, {
    classId: p.classId, level: view.character.level, goals: p.goals, minutesPerDay: p.minutesPerDay, difficulty: p.difficulty,
    limitations: p.limitations, gentleStart: p.gentleStart, ownProgram: p.ownProgram, equipment: picked, programStyle: pickedStyle,
    trainingPlan: pickedPlan, programDays: pickedDays, stats: { strength: 0, vitality: 0, wisdom: 0, focus: 0 }, book: p.book,
  });
  const toggle = (item: Equipment) => setEquipment(picked.includes(item) ? picked.filter((e) => e !== item) : [...picked, item]);
  const save = async (): Promise<void> => {
    if (!changed || busy) return;
    setBusy(true);
    setFailed(false);
    leave();
    try {
      await enqueue({ type: 'training', equipment: picked, programStyle: pickedStyle, trainingPlan: pickedPlan, programDays: sentDays });
    } catch {
      stay();
      setBusy(false);
      setFailed(true);
      return;
    }
    onDone();
    // Premium pass B1: with the screen's own line on when it applies (review: it said only "Training saved.").
    toast(fillText(FEEDBACK_TEXT.training, { when: pickedPlan !== currentPlan ? T.planTomorrow : T.today }));
  };

  // M17 (UX audit O5): Save stays in a bar at the bottom, in reach under any number of options.
  return (
    <BottomBarFrame bar={<><Button label={T.save} variant="commitment" disabled={!changed || busy} onPress={() => void save()} /><SaveFailed shown={failed} /></>}>
    {(barSpace) => (
    <ScreenScroll contentContainerStyle={{ paddingBottom: barSpace + 24, paddingHorizontal: space.gutter, gap: 16 }}>
      {/* M17: the name in the bar, as on the other Settings screens (review). */}
      <TopBar title={T.title} onBack={onBack} />
      <Body>{T.line}</Body>
      <View style={{ gap: 12 }}>
        <Label>{T.plan}</Label>
        {TRAINING_PLANS.map((item) => (
          <OptionCard key={item} label={T.plans[item].name} detail={T.plans[item].line} selected={pickedPlan === item} onPress={() => setPlan(item)} />
        ))}
      </View>
      {weekly && (
        <View style={{ gap: 12 }}>
          <Label>{T.days}</Label>
          {PROGRAM_DAYS_OPTIONS.map((n) => {
            const choice = T.dayChoices[n as 2 | 3];
            return <OptionCard key={n} label={choice.name} detail={choice.line} selected={pickedDays === n} onPress={() => setDays(n)} />;
          })}
          <Small>{T.weeklyNote}</Small>
          {currentPlan === 'weekly' && pickedDays !== currentDays && <Small>{T.daysRestart}</Small>}
        </View>
      )}
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
          <Small tone="chalk">{weekly ? T.noRoomWeekly : T.noRoom}</Small>
        </NightCard>
      )}
      <Small>{pickedPlan !== currentPlan ? T.planTomorrow : T.today}</Small>
    </ScreenScroll>
    )}
    </BottomBarFrame>
  );
}
