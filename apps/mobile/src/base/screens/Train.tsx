// Train (docs/2026-10-28-base-app.md): your plan (week N, the block's six weeks), this week's workouts, history and each
// exercise's best set.
import { BASE_TEXT, baseMove, formatSet, workoutName } from '@levelmeup/content';
import { volume } from '@levelmeup/rules';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useState } from 'react';
import { best, defaultPlace, doneThisWeek, place, planWeeks, plannedDay, restarted } from '../logic.ts';
import { useBase, useBaseApi } from '../store.ts';
import { G } from '../theme.ts';
import { toast } from '../../ui/toast.ts';
import { Icon } from '../icons.tsx';
import { Button, Card, Press, Screen, T } from '../ui.tsx';

const TX = BASE_TEXT.train;

export function Train({ now = Date.now() }: { now?: number }) {
  const api = useBaseApi();
  const [peek, setPeek] = useState<number | null>(null);
  const s = useBase((x) => x);
  if (s.plan === null) return null;
  const p = place(s, now)!;
  const done = doneThisWeek(s, now);
  const moves = [...new Set(s.workouts.flatMap((w) => w.exercises.map((e) => e.move)))];
  const history = [...s.workouts].reverse().slice(0, 12);
  return (
    <Screen>
      <T v="title" accessibilityRole="header">{TX.title}</T>
      <Card hero>
        <T v="label" color={G.accentText}>{TX.plan}</T>
        {!p.finished && <T v="heading">{BASE_TEXT.today.weekOf(p.week, planWeeks(s.plan))}</T>}
        {!p.finished && <T v="small" color={G.muted}>{`${TX.block(p.blockWeek)} · ${TX.days(s.plan.days)}`}</T>}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 40 }}>
          {[1, 2, 3, 4, 5, 6].map((w) => (
            <View key={w} style={{ flex: 1, height: w === 1 || w === 6 ? 18 : w < 4 ? 28 : 38, borderRadius: 4,
              backgroundColor: w < p.blockWeek ? G.accent : w === p.blockWeek ? G.accentText : G.raised }} />
          ))}
        </View>
        <T v="bodyStrong">{TX.workouts}</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: s.plan.days }, (_, i) => {
            const isDone = i < done;
            const isNext = i === done;
            const name = BASE_TEXT.today.workout(workoutName(i));
            // A tap shows what that workout holds this week (and hides it again).
            return (
              <Press key={i} label={`${name}${isDone ? `, ${TX.done}` : isNext ? `, ${TX.next}` : ''}. ${TX.showPreview(name)}`} selected={peek === i}
                onPress={() => setPeek(peek === i ? null : i)}
                style={{ minWidth: 64, flexGrow: 1, minHeight: 56, borderRadius: 12, borderWidth: isNext || peek === i ? 2 : 1.5, borderColor: isNext || peek === i ? G.accent : G.line,
                  backgroundColor: isDone ? G.doneBg : 'transparent', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                <T v="bodyStrong" color={isDone ? G.accentText : G.text}>{workoutName(i)}</T>
                <T v="label" color={G.muted}>{isDone ? TX.done : isNext ? TX.next : ' '}</T>
              </Press>
            );
          })}
        </View>
        {peek !== null && !p.finished && (
          <View accessibilityLiveRegion="polite" style={{ gap: 4 }}>
            <T v="label" color={G.muted}>{TX.preview(BASE_TEXT.today.workout(workoutName(peek)))}</T>
            {plannedDay(s.plan, s.kept, peek, p.blockWeek, defaultPlace(s.plan)).map((e, i) => (
              <T key={`${i}-${e.move}`} v="small">{`${baseMove(e.move).name} · ${TX.sets(e.sets)}`}</T>
            ))}
          </View>
        )}
        {p.finished && s.active === null ? (
          <>
            <T v="bodyStrong">{BASE_TEXT.today.planDone}</T>
            <Button label={TX.newPlan} onPress={() => router.push('/start')} />
          </>
        ) : (
          <Button label={s.active === null ? BASE_TEXT.today.start : BASE_TEXT.today.resume} icon="train" onPress={() => {
            api.getState().startWorkout();
            router.push('/workout');
          }} />
        )}
        <Button label={TX.change} kind="quiet" onPress={() => router.push('/start')} />
      </Card>

      <T v="heading" accessibilityRole="header">{TX.history}</T>
      {history.length === 0 ? <T color={G.muted}>{TX.noHistory}</T> : history.map((w) => {
        const sets = w.exercises.flatMap((e) => e.sets);
        const kg = volume(sets);
        return (
          <Card key={w.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <T v="bodyStrong" style={{ flex: 1 }}>{BASE_TEXT.today.workout(workoutName(w.day))}</T>
              <T v="small" color={G.muted}>{new Date(w.finishedAt ?? w.startedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</T>
              <Press label={TX.remove(BASE_TEXT.today.workout(workoutName(w.day)), new Date(w.finishedAt ?? w.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }))}
                onPress={() => {
                  const was = restarted(api.getState(), Date.now());
                  const gone = api.getState().removeWorkout(w.id);
                  const name = BASE_TEXT.today.workout(workoutName(w.day));
                  // A removal that leaves a gap of over 14 days restarts the plan: the note says so.
                  const now = !was && restarted(api.getState(), Date.now());
                  if (gone !== null) toast(now ? TX.removedRestart(name) : TX.removed(name), { label: TX.undo, onPress: () => api.getState().restoreWorkout(gone) });
                }}
                style={{ width: 44, height: 44, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trash" size={18} color={G.muted} />
              </Press>
            </View>
            <T v="small" color={G.muted}>{`${BASE_TEXT.today.weekOf(w.week, null)} · ${TX.sets(sets.length)}${kg > 0 ? ` · ${Math.round(kg).toLocaleString('en-US')} ${s.units}` : ''}`}</T>
            {w.exercises.map((e) => (
              <Press key={`${w.id}-${e.slot}-${e.move}`} label={BASE_TEXT.exercise.open(baseMove(e.move).name)} onPress={() => router.push(`/exercise/${e.move}`)}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <T v="small">{`${baseMove(e.move).name}: ${e.sets.map((x) => formatSet(x.weight, x.reps ?? 0, s.units, e.target.kind === 'range' ? e.target.unit : 'reps')).join(', ')}`}</T>
              </Press>
            ))}
          </Card>
        );
      })}

      {moves.length > 0 && <T v="heading" accessibilityRole="header">{TX.bests}</T>}
      {moves.length > 0 && (
        <Card>
          {moves.map((m) => {
            const b = best(s, m);
            const unit = baseMove(m).unit;
            return b === null ? null : (
              <Press key={m} label={BASE_TEXT.exercise.open(baseMove(m).name)} onPress={() => router.push(`/exercise/${m}`)}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <T v="small" style={{ flexShrink: 1 }}>{baseMove(m).name}</T>
                <T v="small" color={G.accentText}>{formatSet(b.weight, b.reps ?? 0, s.units, unit)}</T>
              </Press>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
