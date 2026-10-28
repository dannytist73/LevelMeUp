// Swap one exercise and Pain (docs/2026-10-28-base-app.md, "Train"): the same slot's exercises that fit where you are,
// each with its last numbers, "Just today" or "Keep it for this block"; and pain, which always offers rest, a gentler
// swap or stopping, with nothing lost.
import { BASE_MOVES, BASE_TEXT, baseMove, formatSet } from '@levelmeup/content';
import { FALLBACK, slotChoices } from '@levelmeup/rules';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { lastSets } from '../logic.ts';
import { useBase, useBaseApi } from '../store.ts';
import { G } from '../theme.ts';
import { Button, Card, Checks, Header, Options, Screen, T } from '../ui.tsx';

/** The moves that can stand in for an exercise at its place, easiest last; none already in the workout. */
function useChoices(ex: number, gentler = false) {
  const s = useBase((x) => x);
  const w = s.active;
  const current = w?.exercises[ex];
  if (w === null || current === undefined || s.plan === null) return { current: null, choices: [] as string[] };
  const inWorkout = new Set(w.exercises.map((e) => e.move));
  const level = baseMove(current.move).level;
  if (gentler) {
    // Pain: only the same movement, an easier version (closest first), never a neighbouring slot's move.
    const easier = slotChoices(BASE_MOVES, current.slot, w.place, s.plan.home, s.plan.limitations, 'regular')
      .filter((m) => m.level < level && !inWorkout.has(m.id)).map((m) => m.id);
    return { current, choices: easier };
  }
  const slots = [current.slot, ...(FALLBACK[current.slot] ?? [])];
  const all = slots.flatMap((slot) => slotChoices(BASE_MOVES, slot, w.place, s.plan!.home, s.plan!.limitations, 'regular'));
  return { current, choices: [...new Set(all.map((m) => m.id))].filter((id) => !inWorkout.has(id)) };
}

export function SwapExercise({ ex }: { ex: number }) {
  const api = useBaseApi();
  const units = useBase((s) => s.units);
  const data = useBase((s) => s);
  const { current, choices } = useChoices(ex);
  const [pick, setPick] = useState<string | null>(null);
  const TX = BASE_TEXT.swap;
  if (current === null) return <Screen><Header onBack={() => router.back()} backIcon="close" /></Screen>;
  const place = BASE_TEXT.workout.places[data.active!.place].toLowerCase();
  const apply = (keep: boolean) => {
    if (pick === null) return;
    api.getState().swap(ex, pick, keep);
    router.back();
  };
  return (
    <Screen footer={
      <View style={{ gap: 8 }}>
        <Button label={TX.today} onPress={() => apply(false)} disabled={pick === null} testID="swap-today" />
        <Button label={TX.keep} kind="secondary" onPress={() => apply(true)} disabled={pick === null} />
      </View>
    }>
      <Header onBack={() => router.back()} backIcon="close" title={TX.title} />
      <T color={G.muted}>{TX.body(place)}</T>
      <Card>
        <T v="label" color={G.muted}>{TX.current}</T>
        <T v="bodyStrong">{baseMove(current.move).name}</T>
      </Card>
      <Options label={TX.title} columns={1} value={pick} onChange={setPick}
        options={choices.map((id) => {
          const last = lastSets(data, id);
          const l = last[last.length - 1];
          return { key: id, label: baseMove(id).name, text: l === undefined ? TX.never : TX.last(formatSet(l.weight, l.reps ?? 0, units, baseMove(id).unit)) };
        })} />
    </Screen>
  );
}

const NONE: readonly never[] = [];

export function ExercisePain({ ex }: { ex: number }) {
  const api = useBaseApi();
  const { current, choices } = useChoices(ex, true);
  const hurts = useBase((s) => s.plan?.limitations ?? NONE);
  const TX = BASE_TEXT.pain;
  if (current === null) return <Screen><Header onBack={() => router.back()} backIcon="close" /></Screen>;
  return (
    <Screen>
      <Header onBack={() => router.back()} backIcon="close" title={TX.title} />
      <T v="bodyStrong">{baseMove(current.move).name}</T>
      <T color={G.muted}>{TX.body}</T>
      <Button label={TX.skip} testID="pain-skip" onPress={() => {
        api.getState().skipExercise(ex);
        api.getState().endRest();
        router.back();
      }} />
      {choices.length > 0 && (
        <Button label={TX.gentler} kind="secondary" onPress={() => {
          api.getState().swap(ex, choices[0]!, false);
          router.back();
        }} />
      )}
      <Button label={TX.stop} kind="secondary" onPress={() => {
        api.getState().skipExercise(ex);
        api.getState().finishWorkout();
        router.dismissAll();
      }} />
      <Button label={TX.cancel} kind="quiet" onPress={() => router.back()} />
      <T v="bodyStrong">{TX.area}</T>
      <Checks value={hurts} onChange={(limitations) => {
        const p = api.getState().plan;
        if (p !== null) api.getState().setPlan({ ...p, limitations });
      }} options={(['knee', 'back', 'shoulder', 'wrist'] as const).map((k) => ({ key: k, label: BASE_TEXT.setup.safety.items[k] }))} />
      <T v="small" color={G.muted}>{TX.areaHelp}</T>
      <T v="small" color={G.warn}>{TX.help}</T>
    </Screen>
  );
}
