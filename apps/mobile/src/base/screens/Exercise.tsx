// An exercise (docs/2026-10-28-base-app.md, "History and bests"): how to do it and its form cue (our exercise library),
// your best set, a simple chart of your top set each workout, and the past workouts with it.
import { BASE_TEXT, baseMove, formatSet } from '@levelmeup/content';
import { bestSet } from '@levelmeup/rules';
import { router } from 'expo-router';
import { View } from 'react-native';
import { best } from '../logic.ts';
import { useBase } from '../store.ts';
import { G } from '../theme.ts';
import { Card, Header, Screen, T } from '../ui.tsx';

const TX = BASE_TEXT.exercise;

export function Exercise({ id }: { id: string }) {
  const workouts = useBase((s) => s.workouts);
  const units = useBase((s) => s.units);
  let move;
  try {
    move = baseMove(id);
  } catch {
    return <Screen><Header onBack={() => router.back()} /></Screen>;
  }
  const unit = move.unit;
  const sessions = workouts
    .map((w) => ({ w, ex: w.exercises.find((e) => e.move === id) }))
    .filter((x): x is { w: typeof x.w; ex: NonNullable<typeof x.ex> } => x.ex !== undefined && x.ex.sets.length > 0);
  const tops = sessions.slice(-10).map(({ ex }) => bestSet(ex.sets)).filter((s) => s !== null);
  const score = (s: { weight: number | null; reps: number | null }) => (s.weight !== null && s.weight > 0 ? s.weight : s.reps ?? 0);
  const max = Math.max(1, ...tops.map(score));
  const b = best({ workouts }, id);
  return (
    <Screen>
      <Header onBack={() => router.back()} />
      <T v="title" accessibilityRole="header">{move.name}</T>
      <Card>
        <T v="label" color={G.accentText}>{TX.how}</T>
        {move.steps.map((step, i) => <T key={i}>{`${i + 1}. ${step}`}</T>)}
        <T v="label" color={G.accentText}>{TX.cue}</T>
        <T color={G.muted}>{move.cue}</T>
      </Card>
      {b === null ? <T color={G.muted}>{TX.none}</T> : (
        <>
          <T v="bodyStrong">{TX.best(formatSet(b.weight, b.reps ?? 0, units, unit))}</T>
          {tops.length > 1 && (
            <Card>
              <T v="label" color={G.muted}>{TX.chart}</T>
              <View accessible accessibilityLabel={TX.chartLabel(tops.length, formatSet(b.weight, b.reps ?? 0, units, unit))}
                style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 }}>
                {tops.map((s, i) => (
                  <View key={i} style={{ flex: 1, height: Math.max(6, (score(s) / max) * 120), borderRadius: 4, backgroundColor: i === tops.length - 1 ? G.accentText : G.accent }} />
                ))}
              </View>
            </Card>
          )}
          <T v="heading" accessibilityRole="header">{TX.sessions}</T>
          {[...sessions].reverse().slice(0, 12).map(({ w, ex }) => (
            <View key={w.id} style={{ gap: 2 }}>
              <T v="label" color={G.muted}>{new Date(w.finishedAt ?? w.startedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</T>
              <T v="small">{ex.sets.map((x) => formatSet(x.weight, x.reps ?? 0, units, unit)).join(', ')}</T>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
