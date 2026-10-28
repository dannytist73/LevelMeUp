// Train (docs/2026-10-28-base-app.md): your plan (week N, the block's six weeks), this week's workouts, history and each
// exercise's best set.
import { BASE_TEXT, baseMove, formatSet, workoutName } from '@levelmeup/content';
import { volume } from '@levelmeup/rules';
import { router } from 'expo-router';
import { View } from 'react-native';
import { best, doneThisWeek, place, planWeeks } from '../logic.ts';
import { useBase } from '../store.ts';
import { G } from '../theme.ts';
import { Button, Card, Screen, T } from '../ui.tsx';

const TX = BASE_TEXT.train;

export function Train({ now = Date.now() }: { now?: number }) {
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
        <T v="heading">{BASE_TEXT.today.weekOf(p.week, planWeeks(s.plan))}</T>
        <T v="small" color={G.muted}>{`${TX.block(p.blockWeek)} · ${TX.days(s.plan.days)}`}</T>
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
            return (
              <View key={i} accessibilityLabel={`${BASE_TEXT.today.workout(workoutName(i))}: ${isDone ? TX.done : isNext ? TX.next : ''}`}
                style={{ minWidth: 64, flexGrow: 1, minHeight: 56, borderRadius: 12, borderWidth: isNext ? 2 : 1.5, borderColor: isNext ? G.accent : G.line,
                  backgroundColor: isDone ? G.doneBg : 'transparent', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                <T v="bodyStrong" color={isDone ? G.accentText : G.text}>{workoutName(i)}</T>
                <T v="label" color={G.muted}>{isDone ? TX.done : isNext ? TX.next : ' '}</T>
              </View>
            );
          })}
        </View>
        <Button label={s.active === null ? BASE_TEXT.today.start : BASE_TEXT.today.resume} icon="train" onPress={() => router.push('/workout')} disabled={p.finished && s.active === null} />
        <Button label={TX.change} kind="quiet" onPress={() => router.push('/me')} />
      </Card>

      <T v="heading" accessibilityRole="header">{TX.history}</T>
      {history.length === 0 ? <T color={G.muted}>{TX.noHistory}</T> : history.map((w) => {
        const sets = w.exercises.flatMap((e) => e.sets);
        const kg = volume(sets);
        return (
          <Card key={w.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <T v="bodyStrong">{BASE_TEXT.today.workout(workoutName(w.day))}</T>
              <T v="small" color={G.muted}>{new Date(w.finishedAt ?? w.startedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</T>
            </View>
            <T v="small" color={G.muted}>{`${BASE_TEXT.today.weekOf(w.week, null)} · ${TX.sets(sets.length)}${kg > 0 ? ` · ${Math.round(kg).toLocaleString('en-US')} ${s.units}` : ''}`}</T>
            {w.exercises.map((e) => (
              <T key={`${w.id}-${e.slot}`} v="small">{`${baseMove(e.move).name}: ${e.sets.map((x) => formatSet(x.weight, x.reps ?? 0, s.units, e.target.kind === 'range' ? e.target.unit : 'reps')).join(', ')}`}</T>
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
              <View key={m} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <T v="small" style={{ flexShrink: 1 }}>{baseMove(m).name}</T>
                <T v="small" color={G.accentText}>{formatSet(b.weight, b.reps ?? 0, s.units, unit)}</T>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
