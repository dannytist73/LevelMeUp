// The plan setup (docs/2026-10-28-base-app.md, "Onboarding"): one question a screen, every answer changeable later.
// Welcome, plan (Men's or Women's), where you are now, the plan's length, days and place, home equipment (only when
// you train at home), what hurts, the summary, then the first book.
import { BASE_TEXT, BOOKS } from '@levelmeup/content';
import { baseMinutes, clampWeeks, planEnd } from '@levelmeup/rules';
import type { BaseDays, BaseStyle, Equipment, Experience, Limitation, Where } from '@levelmeup/rules';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { moveName, plannedDay } from '../logic.ts';
import type { PlanSetup } from '../logic.ts';
import { useBaseApi } from '../store.ts';
import { G } from '../theme.ts';
import { Button, Card, Checks, Header, IconButton, Options, Screen, T } from '../ui.tsx';

const TX = BASE_TEXT.setup;
type LengthPick = 'six' | 'twelve' | 'custom' | 'open';
type Step = 'welcome' | 'builder' | 'experience' | 'plan' | 'equipment' | 'safety' | 'summary' | 'book';

const formatDate = (ms: number): string => new Date(ms).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export function Setup({ now = Date.now }: { now?: () => number }) {
  const api = useBaseApi();
  const [step, setStep] = useState<Step>('welcome');
  const [style, setStyle] = useState<BaseStyle | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [lengthPick, setLengthPick] = useState<LengthPick>('six');
  const [custom, setCustom] = useState(10);
  const [days, setDays] = useState<BaseDays>(3);
  const [where, setWhere] = useState<Where>('gym');
  const [home, setHome] = useState<Equipment[]>([]);
  const [hurts, setHurts] = useState<Limitation[]>([]);
  const [book, setBook] = useState<string>(BOOKS[0]!.id);

  const steps: Step[] = ['welcome', 'builder', 'experience', 'plan', ...(where === 'gym' ? [] : ['equipment' as const]), 'safety', 'summary', 'book'];
  const index = steps.indexOf(step);
  const go = (delta: number) => setStep(steps[Math.max(0, Math.min(steps.length - 1, index + delta))]!);
  const weeks = lengthPick === 'six' ? 6 : lengthPick === 'twelve' ? 12 : lengthPick === 'custom' ? custom : null;
  const plan = (): PlanSetup => ({
    style: style ?? 'men', experience: experience ?? 'new', days, where, home: where === 'gym' ? [] : home, limitations: hurts,
    length: weeks === null ? { kind: 'open' } : { kind: 'weeks', weeks }, startedAt: now(),
  });

  const header = index > 0 ? (
    <View style={{ gap: 8 }}>
      <Header onBack={() => go(-1)} right={<T v="label" color={G.muted}>{TX.step(index, steps.length - 1)}</T>} />
    </View>
  ) : null;

  const next = (enabled: boolean, onPress = () => go(1), label: string = TX.next) => <Button label={label} onPress={onPress} disabled={!enabled} testID="setup-next" />;

  switch (step) {
    case 'welcome':
      return (
        <Screen footer={next(true, () => go(1), TX.welcome.start)}>
          <T v="title" accessibilityRole="header" style={{ marginTop: 24 }}>{TX.welcome.title}</T>
          <T color={G.muted}>{TX.welcome.body}</T>
          {TX.welcome.points.map((p) => (
            <Card key={p.title}>
              <T v="bodyStrong">{p.title}</T>
              <T v="small" color={G.muted}>{p.text}</T>
            </Card>
          ))}
        </Screen>
      );
    case 'builder':
      return (
        <Screen footer={next(style !== null)}>
          {header}
          <T v="title" accessibilityRole="header">{TX.builder.title}</T>
          <T color={G.muted}>{TX.builder.body}</T>
          <Options label={TX.builder.title} columns={1} value={style} onChange={setStyle}
            options={[{ key: 'men', ...TX.builder.men }, { key: 'women', ...TX.builder.women }]} />
        </Screen>
      );
    case 'experience':
      return (
        <Screen footer={next(experience !== null)}>
          {header}
          <T v="title" accessibilityRole="header">{TX.experience.title}</T>
          <T color={G.muted}>{TX.experience.body}</T>
          <Options label={TX.experience.title} columns={1} value={experience} onChange={setExperience}
            options={[{ key: 'new', ...TX.experience.new }, { key: 'returning', ...TX.experience.returning }, { key: 'regular', ...TX.experience.regular }]} />
        </Screen>
      );
    case 'plan':
      return (
        <Screen footer={next(true)}>
          {header}
          <T v="title" accessibilityRole="header">{TX.plan.title}</T>
          <T color={G.muted}>{TX.plan.body}</T>
          <T v="bodyStrong">{TX.plan.length}</T>
          <Options label={TX.plan.length} value={lengthPick} onChange={setLengthPick}
            options={[{ key: 'six', label: TX.plan.lengths.six }, { key: 'twelve', label: TX.plan.lengths.twelve }, { key: 'custom', label: TX.plan.lengths.custom }, { key: 'open', label: TX.plan.lengths.open }]} />
          {lengthPick === 'custom' && (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" testID="custom-weeks">{TX.plan.weeks(custom)}</T>
                <T v="small" color={G.muted}>{TX.plan.ends(formatDate(planEnd(now(), custom)))}</T>
              </View>
              <IconButton icon="minus" label={TX.plan.fewer} onPress={() => setCustom(clampWeeks(custom - 1))} />
              <IconButton icon="plus" label={TX.plan.more} onPress={() => setCustom(clampWeeks(custom + 1))} />
            </Card>
          )}
          <T v="small" color={G.muted}>{TX.plan.lengthHelp}</T>
          <T v="bodyStrong">{TX.plan.days}</T>
          <Options label={TX.plan.days} columns={4} value={days} onChange={setDays}
            options={([2, 3, 4, 5] as const).map((d) => ({ key: d, label: String(d) }))} />
          <T v="small" color={G.muted}>{TX.plan.daysHelp}</T>
          <T v="bodyStrong">{TX.plan.where}</T>
          <Options label={TX.plan.where} columns={3} value={where} onChange={setWhere}
            options={(['gym', 'home', 'both'] as const).map((w) => ({ key: w, label: TX.plan.places[w] }))} />
          <Card style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            <T v="small" color={G.muted} style={{ flex: 1 }}>{TX.plan.block}</T>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 36 }}>
              {[16, 24, 24, 32, 32, 16].map((h, i) => (
                <View key={i} style={{ width: 10, height: h, borderRadius: 3, backgroundColor: i === 0 || i === 5 ? G.edge : G.accent }} />
              ))}
            </View>
          </Card>
        </Screen>
      );
    case 'equipment':
      return (
        <Screen footer={next(true)}>
          {header}
          <T v="title" accessibilityRole="header">{TX.equipment.title}</T>
          <T color={G.muted}>{TX.equipment.body}</T>
          <Checks value={home} onChange={setHome}
            options={(['dumbbells', 'bench', 'bands', 'pullup_bar'] as const).map((k) => ({ key: k, label: TX.equipment.items[k] }))} />
        </Screen>
      );
    case 'safety':
      return (
        <Screen footer={next(true, () => go(1), hurts.length === 0 ? TX.safety.none : TX.next)}>
          {header}
          <T v="title" accessibilityRole="header">{TX.safety.title}</T>
          <T color={G.muted}>{TX.safety.body}</T>
          <Checks value={hurts} onChange={setHurts}
            options={(['knee', 'back', 'shoulder', 'wrist'] as const).map((k) => ({ key: k, label: TX.safety.items[k] }))} />
          <T v="small" color={G.muted}>{TX.safety.doctor}</T>
        </Screen>
      );
    case 'summary': {
      const p = plan();
      const first = plannedDay(p, {}, 0, 1, where === 'home' ? 'home' : 'gym');
      const lengthLabel = weeks === null ? TX.plan.lengths.open.toLowerCase() : TX.plan.weeks(weeks);
      return (
        <Screen footer={next(true, () => go(1), TX.summary.next)}>
          {header}
          <T v="title" accessibilityRole="header">{TX.summary.title}</T>
          {TX.summary.lines(days, lengthLabel).map((line) => <T key={line} color={G.muted}>{line}</T>)}
          <Card>
            <T v="bodyStrong">{TX.summary.first('A', baseMinutes(first))}</T>
            {first.map((e) => (
              <T key={e.slot} v="small" color={G.muted}>{`${moveName(e.move)} · ${BASE_TEXT.train.sets(e.sets)}`}</T>
            ))}
          </Card>
        </Screen>
      );
    }
    case 'book':
      return (
        <Screen footer={next(true, () => {
          api.getState().setPlan(plan());
          api.getState().chooseBook(book);
          router.replace('/');
        }, TX.book.done)}>
          {header}
          <T v="title" accessibilityRole="header">{TX.book.title}</T>
          <T color={G.muted}>{TX.book.body}</T>
          <Options label={TX.book.title} columns={1} value={book} onChange={setBook}
            options={BOOKS.map((b) => ({ key: b.id, label: b.title, text: b.blurb }))} />
        </Screen>
      );
  }
}
