// The workout log (docs/2026-10-28-base-app.md, "Train"): weight × reps per set, prefilled from last time so a tick
// logs it; ticking starts the rest (−15 s, +15 s, Skip); Gym or Home re-picks what isn't started; Swap and Pain on every
// exercise; next week's weight as a tip; a finish summary with new bests. The screen stays awake while it's open.
import { BASE_TEXT, baseMove, formatClock, formatSet, formatWeight, workoutName } from '@levelmeup/content';
import { advise, bestSet, volume, weightStep } from '@levelmeup/rules';
import type { LoggedSet } from '@levelmeup/rules';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View, useWindowDimensions } from 'react-native';
import { buzz } from '../../ui/haptics.ts';
import { toast } from '../../ui/toast.ts';
import { Icon } from '../icons.tsx';
import { best, lastSets, planWeeks, warmupSets } from '../logic.ts';
import type { Workout as WorkoutData, WorkoutExercise } from '../logic.ts';
import { useBase, useBaseApi } from '../store.ts';
import { F, G, S } from '../theme.ts';
import { Bar, Button, Card, DoneFill, Header, IconButton, Options, Press, Screen, T } from '../ui.tsx';

const TX = BASE_TEXT.workout;

/** Ticks once a second while mounted. */
function useNow(): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** The workout's clock: only this line redraws each second, not the whole log. */
function Elapsed({ week, of, since }: { week: number; of: number | null; since: number }) {
  const now = useNow();
  return <T v="small" color={G.muted}>{TX.elapsed(week, of, formatClock(now - since))}</T>;
}

function KeepAwake() {
  useKeepAwake();
  return null;
}

function NumberCell({ value, onChange, label, decimal, testID }: { value: number | null; onChange: (n: number | null) => void; label: string; decimal: boolean; testID?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [, redraw] = useState(0);
  const shown = draft ?? (value === null ? '' : String(value));
  return (
    <TextInput
      accessibilityLabel={label} value={shown} testID={testID} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} selectTextOnFocus maxFontSizeMultiplier={1.6}
      onChangeText={(t) => {
        // Only a number is kept (a comma counts as the decimal point): anything else, like "..", is refused.
        const clean = t.replace(',', '.');
        if (clean !== '' && !(decimal ? /^\d{0,4}(\.\d{0,2})?$/ : /^\d{0,4}$/).test(clean)) {
          redraw((n) => n + 1); // the field shows its kept value again
          return;
        }
        setDraft(clean);
        if (clean === '' || clean === '.') onChange(null);
        else onChange(Number(clean));
      }}
      onBlur={() => setDraft(null)}
      style={{ flex: 1, minWidth: 0, minHeight: 48, borderRadius: 10, backgroundColor: G.raised, color: G.text, textAlign: 'center', fontFamily: F.semibold, fontSize: 17, paddingHorizontal: 4 }}
    />
  );
}

function tipFor(ex: WorkoutExercise, last: LoggedSet[], blockWeek: number, units: string): string {
  if (blockWeek === 6) return TX.tips.easy;
  const a = advise(baseMove(ex.move), ex.target, last, units === 'lb' ? 'lb' : 'kg');
  switch (a.kind) {
    case 'up': return TX.tips.up(formatWeight(a.weight, units));
    case 'down': return TX.tips.down(formatWeight(a.weight, units));
    case 'same': return TX.tips.same(formatWeight(a.weight, units));
    default: return TX.tips[a.kind];
  }
}

function ExerciseCard({ ex, index, workout }: { ex: WorkoutExercise; index: number; workout: WorkoutData }) {
  const api = useBaseApi();
  const units = useBase((s) => s.units);
  const workouts = useBase((s) => s.workouts);
  // The set column grows with the phone's text size, so "Set" never breaks (seen at 2x, 2026-10-28).
  const setCol = Math.max(34, Math.round(30 * Math.min(2, useWindowDimensions().fontScale)));
  const last = lastSets({ workouts }, ex.move);
  const lastHard = lastSets({ workouts }, ex.move, true);
  const before = best({ workouts }, ex.move);
  const move = baseMove(ex.move);
  const seconds = ex.target.kind === 'range' && ex.target.unit === 'seconds';
  const weighted = move.needs.some((n) => n === 'gym' || n === 'dumbbells');
  const step = weightStep(move, units === 'lb' ? 'lb' : 'kg');
  const target = ex.target.kind === 'fixed' ? TX.fixed(ex.target.reps) : TX.range(ex.target.min, ex.target.max, ex.target.unit);
  // Ramp-up sets for the big lifts (2 to 3 minutes' rest), from the first set's weight.
  const first = ex.sets[0]?.weight ?? null;
  const warm = ex.restSeconds >= 150 && weighted && first !== null && !ex.sets[0]!.done ? warmupSets(first, units === 'lb' ? 'lb' : 'kg') : [];
  const tick = (i: number) => {
    const done = api.getState().toggleSet(index, i);
    if (!done) return;
    buzz('stamp');
    const set = api.getState().active?.exercises[index]?.sets[i];
    if (set !== undefined && before !== null && set.weight !== null && before.weight !== null && bestSet([before, set]) === set && (set.weight > before.weight || (set.reps ?? 0) > (before.reps ?? 0))) {
      toast(TX.best(move.name, formatSet(set.weight, set.reps ?? 0, units)));
    }
    api.getState().startRest(ex.restSeconds);
  };
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Press label={BASE_TEXT.exercise.open(move.name)} onPress={() => router.push(`/exercise/${ex.move}`)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <T v="heading" color={G.text} style={{ textDecorationLine: 'underline', textDecorationColor: G.edge }}>{move.name}</T>
          </Press>
          <T v="small" color={G.muted}>{TX.target(target, TX.rest(ex.restSeconds))}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label={TX.swap} icon="swap" kind="secondary" style={{ flex: 1, minHeight: 48 }} onPress={() => router.push({ pathname: '/exercise-swap', params: { ex: String(index) } })} />
        <Button label={TX.pain} icon="alert" kind="secondary" style={{ flex: 1, minHeight: 48 }} onPress={() => router.push({ pathname: '/exercise-pain', params: { ex: String(index) } })} />
      </View>
      <T v="small" color={G.accentText}>{tipFor(ex, lastHard, workout.blockWeek, units)}</T>
      {warm.length > 0 && <T v="small" color={G.muted}>{BASE_TEXT.exercise.warmup(warm.map((w) => formatSet(w.weight, w.reps, units)).join(', '))}</T>}
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <T v="label" color={G.muted} style={{ width: setCol }}>{TX.set}</T>
        <T v="label" color={G.muted} style={{ flex: 1.3 }}>{TX.last}</T>
        {weighted && <T v="label" color={G.muted} style={{ flex: 1, textAlign: 'center' }}>{TX.weight(units)}</T>}
        <T v="label" color={G.muted} style={{ flex: 1, textAlign: 'center' }}>{seconds ? TX.seconds : TX.reps}</T>
        <View style={{ width: 48 }} />
      </View>
      {ex.sets.map((set, i) => {
        const prev = last[Math.min(i, last.length - 1)];
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 10, backgroundColor: set.done ? G.doneBg : 'transparent', paddingVertical: 2 }}>
            <T v="bodyStrong" style={{ width: setCol, textAlign: 'center' }}>{String(i + 1)}</T>
            <T v="small" color={G.muted} style={{ flex: 1.3 }}>{prev === undefined ? '-' : formatSet(prev.weight, prev.reps ?? 0, units, seconds ? 'seconds' : 'reps')}</T>
            {weighted && (
              <NumberCell value={set.weight} decimal label={`${TX.set} ${i + 1} ${TX.weight(units)}`} testID={`w-${index}-${i}`}
                onChange={(n) => api.getState().setSet(index, i, { weight: n })} />
            )}
            <NumberCell value={set.reps} decimal={false} label={`${TX.set} ${i + 1} ${seconds ? TX.seconds : TX.reps}`} testID={`r-${index}-${i}`}
              onChange={(n) => api.getState().setSet(index, i, { reps: n })} />
            <Press label={set.done ? TX.setDone(i + 1) : TX.setNotDone(i + 1)} selected={set.done} onPress={() => tick(i)} testID={`done-${index}-${i}`}
              style={{ width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: G.raised }}>
              <DoneFill done={set.done} radius={10} />
              <Icon name="check" size={22} color={set.done ? G.onAccent : G.muted} />
            </Press>
          </View>
        );
      })}
      {/* Shown once there is a weight to move (a first time starts empty). */}
      {weighted && ex.sets.some((x) => !x.done && x.weight !== null) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T v="small" color={G.muted} style={{ flex: 1 }}>{TX.allSets}</T>
          <IconButton icon="minus" size={44} label={TX.lighter(formatWeight(step, units))} onPress={() => {
            buzz('tick');
            api.getState().shiftWeight(index, -step);
          }} />
          <T v="bodyStrong" style={{ minWidth: 72, textAlign: 'center' }}>{formatWeight(ex.sets.find((x) => !x.done && x.weight !== null)?.weight ?? 0, units)}</T>
          <IconButton icon="plus" size={44} label={TX.heavier(formatWeight(step, units))} onPress={() => {
            buzz('tick');
            api.getState().shiftWeight(index, step);
          }} />
        </View>
      )}
      <Button label={TX.addSet} icon="plus" kind="quiet" onPress={() => api.getState().addSet(index)} />
    </Card>
  );
}

function RestBar() {
  const now = useNow();
  const api = useBaseApi();
  const until = useBase((s) => s.restUntil);
  const total = useBase((s) => s.restTotal);
  const ended = useRef<number | null>(null);
  useEffect(() => {
    if (until !== null && now >= until && ended.current !== until) {
      ended.current = until;
      buzz('level');
      api.getState().endRest();
      toast(TX.restDone);
    }
  }, [api, now, until]);
  if (until === null || now >= until) return null;
  const left = until - now;
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Icon name="clock" size={20} color={G.accentText} />
        <T v="heading" style={{ flexGrow: 1, minWidth: 120 }}>{`${TX.resting} ${formatClock(left)}`}</T>
        <Button label={TX.less} kind="secondary" style={{ minHeight: 48, paddingHorizontal: 10 }} onPress={() => api.getState().moveRest(-15)} />
        <Button label={TX.more} kind="secondary" style={{ minHeight: 48, paddingHorizontal: 10 }} onPress={() => api.getState().moveRest(15)} />
        <Button label={TX.skip} kind="quiet" style={{ minHeight: 48, paddingHorizontal: 10 }} onPress={() => api.getState().endRest()} />
      </View>
      <Bar value={total * 1000 - left} max={total * 1000} height={6} />
    </View>
  );
}

function Summary({ w, onClose }: { w: WorkoutData; onClose: () => void }) {
  const units = useBase((s) => s.units);
  const workouts = useBase((s) => s.workouts);
  const sets = w.exercises.flatMap((e) => e.sets);
  const minutes = Math.max(1, Math.round(((w.finishedAt ?? w.startedAt) - w.startedAt) / 60000));
  const kg = volume(sets);
  // New bests: this workout's best set beats every earlier one (a first time is not a best yet).
  const earlier = { workouts: workouts.filter((x) => x.id !== w.id) };
  const bests = w.exercises.flatMap((e) => {
    const now = bestSet(e.sets);
    const before = best(earlier, e.move);
    return now !== null && before !== null && bestSet([before, now]) === now && (now.weight !== before.weight || now.reps !== before.reps)
      ? [TX.best(baseMove(e.move).name, formatSet(now.weight, now.reps ?? 0, units))] : [];
  });
  return (
    <Screen footer={<Button label={TX.close} onPress={onClose} />}>
      <T v="title" accessibilityRole="header" style={{ marginTop: 24 }}>{TX.finishTitle}</T>
      <T v="bodyStrong">{TX.finishLines(sets.length, minutes)}</T>
      {kg > 0 && <T color={G.muted}>{TX.volume(`${Math.round(kg).toLocaleString('en-US')} ${units}`)}</T>}
      {bests.map((b) => <T key={b} v="bodyStrong" color={G.accentText}>{b}</T>)}
      {w.exercises.map((e, i) => {
        const a = advise(baseMove(e.move), e.target, e.sets, units);
        const tip = a.kind === 'up' || a.kind === 'down' || a.kind === 'same' ? TX.nextTips[a.kind](formatWeight(a.weight, units)) : TX.nextTips[a.kind];
        return (
          <Card key={`${i}-${e.move}`}>
            <T v="bodyStrong">{baseMove(e.move).name}</T>
            <T v="small" color={G.muted}>{e.sets.map((x) => formatSet(x.weight, x.reps ?? 0, units, e.target.kind === 'range' ? e.target.unit : 'reps')).join(', ')}</T>
            {w.blockWeek !== 6 && <T v="small" color={G.accentText}>{TX.nextTime(tip)}</T>}
          </Card>
        );
      })}
    </Screen>
  );
}

export function Workout() {
  const api = useBaseApi();
  const active = useBase((s) => s.active);
  const plan = useBase((s) => s.plan);
  const resting = useBase((s) => s.restUntil !== null);
  const [finished, setFinished] = useState<WorkoutData | null>(null);
  const [confirm, setConfirm] = useState(false);

  // The workout is started by the Start buttons, never by this screen (review: a redraw after finishing started a new
  // one).
  if (finished !== null) return <Summary w={finished} onClose={() => router.back()} />;
  if (active === null || plan === null) {
    return (
      <Screen>
        <Header onBack={() => router.back()} backIcon="close" />
        <T color={G.muted}>{TX.noneOpen}</T>
      </Screen>
    );
  }

  const undone = active.exercises.some((e) => e.sets.some((x) => !x.done));
  const finish = () => {
    const w = api.getState().finishWorkout();
    buzz('stamp');
    if (w === null) router.back();
    else setFinished(w);
  };

  return (
    <Screen footer={resting ? <RestBar /> : undefined}>
      <KeepAwake />
      <Header onBack={() => router.back()} backIcon="close" title={BASE_TEXT.today.workout(workoutName(active.day))}
        right={<Button label={TX.finish} onPress={() => (undone ? setConfirm(true) : finish())} style={{ minHeight: 48 }} testID="finish" />} />
      <Elapsed week={active.week} of={planWeeks(plan)} since={active.startedAt} />
      {confirm && (
        <Card hero>
          <T v="bodyStrong">{TX.leaveTitle}</T>
          <T v="small" color={G.muted}>{TX.leaveBody}</T>
          <Button label={TX.leaveYes} onPress={finish} testID="finish-yes" />
          <Button label={TX.leaveNo} kind="secondary" onPress={() => setConfirm(false)} />
          <Button label={TX.discard} kind="quiet" onPress={() => {
            api.getState().discardWorkout();
            router.back();
          }} />
        </Card>
      )}
      <Options label={TX.places.gym} columns={2} value={active.place} onChange={(p) => api.getState().switchPlace(p)}
        options={[{ key: 'gym', label: TX.places.gym }, { key: 'home', label: TX.places.home }]} />
      {active.exercises.length === 0 && <T color={G.muted}>{TX.empty}</T>}
      {active.exercises.map((ex, i) => (ex.skipped && ex.sets.length === 0 ? null : <ExerciseCard key={`${i}-${ex.move}`} ex={ex} index={i} workout={active} />))}
      <View style={{ height: S.gap }} />
    </Screen>
  );
}
