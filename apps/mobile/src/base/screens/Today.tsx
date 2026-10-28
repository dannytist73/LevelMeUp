// Today (docs/2026-10-28-base-app.md): this week's next workout, the chapter you're on, and today's food against your
// targets, one tap into each. Plain facts, no streak.
import { BASE_TEXT, baseMove, book as findBook, chapter, chapterMinutes, workoutName } from '@levelmeup/content';
import { baseMinutes } from '@levelmeup/rules';
import { router } from 'expo-router';
import { Image, View } from 'react-native';
import { STORY_ART } from '../storyArt.ts';
import { useClock } from '../clock.ts';
import { currentBook, dayKey, defaultPlace, doneThisWeek, foodTotals, place, planWeeks, plannedDay, readDaysThisWeek, restarted } from '../logic.ts';
import { useBase, useBaseApi } from '../store.ts';
import { G } from '../theme.ts';
import { Icon } from '../icons.tsx';
import { Bar, Button, Card, IconButton, Screen, T } from '../ui.tsx';

const TX = BASE_TEXT.today;

export function Today({ now: fixed }: { now?: number }) {
  const now = useClock(fixed);
  const api = useBaseApi();
  const s = useBase((x) => x);
  if (s.plan === null) return null;
  const p = place(s, now)!;
  const at = defaultPlace(s.plan);
  const day = s.active ?? null;
  const exercises = day === null ? plannedDay(s.plan, s.kept, p.day, p.blockWeek, at) : null;
  const shownWeek = day?.week ?? p.week;
  const shownBlockWeek = day?.blockWeek ?? p.blockWeek;
  const { book, next } = currentBook(s);
  const chap = next === null ? null : chapter(book.chapters[next]!);
  const today = s.food.filter((f) => f.day === dayKey(now));
  // A workout finished today: Today says so, and the next one waits quietly.
  const trainedToday = [...s.workouts].reverse().find((w) => w.finishedAt !== null && dayKey(w.finishedAt) === dayKey(now));
  const totals = foodTotals(today);
  const date = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T v="label" color={G.muted}>{date}</T>
          <T v="title" accessibilityRole="header">{BASE_TEXT.tabs.today}</T>
        </View>
        <IconButton icon="user" label={TX.me} onPress={() => router.push('/me')} filled />
      </View>

      <Card hero>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <T v="label" color={G.accentText}>{`${TX.train} · ${TX.weekOf(shownWeek, planWeeks(s.plan))}`}</T>
          {shownBlockWeek === 6 || shownBlockWeek === 1 ? <T v="label" color={G.muted}>{BASE_TEXT.train.block(shownBlockWeek)}</T> : null}
        </View>
        {p.finished && day === null ? (
          <>
            <T v="bodyStrong">{TX.planDone}</T>
            <Button label={BASE_TEXT.train.newPlan} kind="secondary" onPress={() => router.push('/start')} />
          </>
        ) : (
          <>
            {day === null && restarted(s, now) && <T v="small" color={G.accentText}>{TX.welcomeBack}</T>}
            {day === null && trainedToday !== undefined && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="check" size={18} color={G.accentText} />
                <T v="small" color={G.accentText} style={{ flex: 1 }}>{TX.doneToday(TX.workout(workoutName(trainedToday.day)), trainedToday.exercises.reduce((n, e) => n + e.sets.length, 0))}</T>
              </View>
            )}
            {day === null && trainedToday !== undefined && <T v="label" color={G.muted}>{TX.nextUp}</T>}
            <T v="heading">{TX.workout(workoutName(day?.day ?? p.day))}</T>
            {(day?.exercises ?? exercises ?? []).map((e, i) => (
              <T key={`${i}-${e.move}`} v="small" color={G.muted}>{baseMove(e.move).name}</T>
            ))}
            {exercises !== null && <T v="small" color={G.muted}>{TX.exercises(exercises.length, baseMinutes(exercises))}</T>}
            <Button label={day === null ? TX.start : TX.resume} icon="train" testID="today-start" kind={day === null && trainedToday !== undefined ? 'secondary' : 'primary'}
              onPress={() => {
                api.getState().startWorkout();
                router.push('/workout');
              }} />
            <T v="small" color={G.muted}>{TX.thisWeek(doneThisWeek(s, now), s.plan.days, p.week)}</T>
          </>
        )}
      </Card>

      <Card>
        <T v="label" color={G.accentText}>{TX.read}</T>
        <T v="heading">{findBook(book.id).title}</T>
        {chap === null || next === null ? (
          <T v="small" color={G.muted}>{TX.bookDone}</T>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {STORY_ART[book.chapters[next]!]?.cover != null && (
                <Image source={STORY_ART[book.chapters[next]!]!.cover!} accessibilityElementsHidden importantForAccessibility="no" resizeMode="cover"
                  style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: G.raised }} />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{chap.title}</T>
                <T v="small" color={G.muted}>{TX.chapter(next + 1, book.chapters.length, chapterMinutes(chap))}</T>
              </View>
            </View>
          </>
        )}
        {TX.readDays(readDaysThisWeek(s, now)) !== null && <T v="small" color={G.muted}>{TX.readDays(readDaysThisWeek(s, now))}</T>}
        <Button label={chap === null ? BASE_TEXT.read.title : TX.readNow} kind="secondary" icon="read"
          onPress={() => router.push(chap === null ? '/read' : `/chapter/${book.chapters[next!]}`)} />
      </Card>

      <Card>
        <T v="label" color={G.accentText}>{TX.eat}</T>
        {s.targets === null ? (
          <T v="small" color={G.muted}>{TX.setTargets}</T>
        ) : (
          <>
            <T v="bodyStrong">{TX.kcal(Math.round(totals.kcal), s.targets.kcal)}</T>
            <Bar value={totals.kcal} max={s.targets.kcal} />
            <T v="small" color={G.muted}>{TX.protein(Math.round(totals.protein), s.targets.protein)}</T>
            <Bar value={totals.protein} max={s.targets.protein} />
          </>
        )}
        <Button label={s.targets === null ? BASE_TEXT.eat.targets.title : TX.logFood} kind="secondary" icon={s.targets === null ? 'eat' : 'plus'}
          onPress={() => router.push(s.targets === null ? '/food-targets' : '/food-add')} />
      </Card>
    </Screen>
  );
}
