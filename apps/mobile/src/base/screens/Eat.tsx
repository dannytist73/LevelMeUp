// Eat (docs/2026-10-28-base-app.md, "Eat"): today's totals against your targets, the day's foods by meal, one-tap
// "again" for recent foods, and the log form. Free: by hand. Plus (later): a photo, a voice note or a sentence.
import { BASE_TEXT } from '@levelmeup/content';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { buzz } from '../../ui/haptics.ts';
import { toast } from '../../ui/toast.ts';
import { Icon } from '../icons.tsx';
import { dayKey, foodTotals, recentFoods, suggestTargets } from '../logic.ts';
import type { FoodEntry, Meal, Targets } from '../logic.ts';
import { useBase, useBaseApi } from '../store.ts';
import { G } from '../theme.ts';
import { Bar, Button, Card, Field, Header, IconButton, Options, Press, Screen, T } from '../ui.tsx';

const TX = BASE_TEXT.eat;
const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** The meal for now: breakfast before 11, lunch before 15, a snack before 18, then dinner. */
export function mealNow(ms: number): Meal {
  const h = new Date(ms).getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
}

function Total({ label, eaten, target, unit }: { label: string; eaten: number; target: number | null; unit: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <T v="small">{label}</T>
        <T v="small" color={G.muted}>{target === null ? `${Math.round(eaten)} ${unit}` : `${Math.round(eaten)} / ${target} ${unit}`}</T>
      </View>
      {target !== null && <Bar value={eaten} max={target} height={6} />}
    </View>
  );
}

export function Eat({ now: clock = Date.now() }: { now?: number }) {
  const api = useBaseApi();
  const food = useBase((s) => s.food);
  const targets = useBase((s) => s.targets);
  // Any earlier day can be opened and added to (research 2026-10-28 #11), with no "missed" mark.
  const [back, setBack] = useState(0);
  const shown = new Date(clock);
  shown.setDate(shown.getDate() - back);
  const now = shown.getTime();
  const shownDay = dayKey(now);
  const dayLabel = back === 0 ? TX.today : back === 1 ? TX.yesterday : new Date(now).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const today = food.filter((f) => f.day === shownDay);
  const t = foodTotals(today);
  const recent = recentFoods(food);
  const before = new Date(now);
  before.setDate(before.getDate() - 1);
  const yesterday = food.filter((f) => f.day === dayKey(before.getTime()));
  const copyMeal = (m: Meal) => {
    for (const f of yesterday.filter((x) => x.meal === m)) {
      api.getState().addFood({ meal: m, name: f.name, amount: f.amount, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, day: shownDay });
    }
    buzz('stamp');
    toast(TX.form.saved(TX.meals[m]));
  };
  const copyable = MEALS.filter((m) => yesterday.some((f) => f.meal === m) && !today.some((f) => f.meal === m));
  const again = (f: FoodEntry) => {
    api.getState().addFood({ meal: back === 0 ? mealNow(Date.now()) : f.meal, name: f.name, amount: f.amount, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, day: shownDay });
    buzz('stamp');
    toast(TX.form.saved(f.name));
  };
  const remove = (f: FoodEntry) => {
    const gone = api.getState().removeFood(f.id);
    if (gone !== null) toast(TX.removed(f.name), { label: TX.undo, onPress: () => api.getState().restoreFood(gone) });
  };
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <T v="title" accessibilityRole="header" style={{ flex: 1 }}>{TX.title}</T>
        <Button label={TX.targets.edit} kind="quiet" onPress={() => router.push('/food-targets')} />
      </View>
      <Card hero>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconButton icon="back" label={TX.earlier} onPress={() => setBack(back + 1)} size={44} />
          <T v="label" color={G.accentText} style={{ flex: 1, textAlign: 'center' }}>{dayLabel}</T>
          {back > 0 ? <IconButton icon="next" label={TX.later} onPress={() => setBack(back - 1)} size={44} /> : <View style={{ width: 44 }} />}
        </View>
        <T v="big">{`${Math.round(t.kcal).toLocaleString('en-US')} ${TX.kcal}`}</T>
        {targets !== null && <T v="small" color={G.muted}>{t.kcal <= targets.kcal ? TX.left(targets.kcal - Math.round(t.kcal)) : TX.over(Math.round(t.kcal) - targets.kcal)}</T>}
        {targets !== null && <Bar value={t.kcal} max={targets.kcal} />}
        <Total label={TX.protein} eaten={t.protein} target={targets?.protein ?? null} unit="g" />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <T v="small" color={G.muted}>{`${TX.carbs} ${Math.round(t.carbs)} g`}</T>
          <T v="small" color={G.muted}>{`${TX.fat} ${Math.round(t.fat)} g`}</T>
        </View>
        <Button label={TX.add} icon="plus" onPress={() => router.push(back === 0 ? '/food-add' : { pathname: '/food-add', params: { day: shownDay } })} testID="eat-add" />
        {targets === null && <Button label={BASE_TEXT.today.setTargets} kind="quiet" onPress={() => router.push('/food-targets')} />}
      </Card>

      {recent.length > 0 && (
        <View style={{ gap: 8 }}>
          <T v="label" color={G.muted}>{TX.recent}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recent.map((f) => (
              <Press key={f.id} label={`${TX.recent}: ${f.name}`} onPress={() => again(f)}
                style={{ borderRadius: 999, borderWidth: 1.5, borderColor: G.edge, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="plus" size={16} color={G.accentText} />
                <T v="small">{`${f.name} · ${f.kcal}`}</T>
              </Press>
            ))}
          </View>
        </View>
      )}

      {copyable.map((m) => (
        <Button key={m} label={TX.sameAs(TX.meals[m])} icon="plus" kind="secondary" onPress={() => copyMeal(m)} />
      ))}
      {today.length === 0 && <T color={G.muted}>{TX.empty}</T>}
      {MEALS.map((m) => {
        const items = today.filter((f) => f.meal === m);
        if (items.length === 0) return null;
        const mt = foodTotals(items);
        return (
          <Card key={m}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T v="bodyStrong">{TX.meals[m]}</T>
              <T v="small" color={G.muted}>{`${Math.round(mt.kcal).toLocaleString('en-US')} ${TX.kcal}`}</T>
            </View>
            {items.map((f) => (
              <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <T v="small">{f.amount === '' ? f.name : `${f.name}, ${f.amount}`}</T>
                  <T v="label" color={G.muted}>{`${f.kcal} ${TX.kcal} · ${f.protein} g ${TX.protein.toLowerCase()}`}</T>
                </View>
                <Press label={TX.remove(f.name)} onPress={() => remove(f)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 }}>
                  <Icon name="trash" size={20} color={G.muted} />
                </Press>
              </View>
            ))}
          </Card>
        );
      })}

      <Card style={{ borderWidth: 1.5, borderColor: G.line, backgroundColor: 'transparent' }}>
        <T v="bodyStrong">{TX.plus.title}</T>
        <T v="small" color={G.muted}>{TX.plus.text}</T>
      </Card>
    </Screen>
  );
}

const toNumber = (s: string): number | null => {
  const n = Number(s.replace(',', '.'));
  return s.trim() === '' || Number.isNaN(n) || n < 0 ? null : n;
};

export function FoodAdd({ day }: { day?: string }) {
  const api = useBaseApi();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [meal, setMeal] = useState<Meal>(mealNow(Date.now()));
  const [tried, setTried] = useState(false);
  const F = TX.form;
  const numberError = tried && toNumber(kcal) === null && toNumber(protein) === null ? F.needNumber : null;
  const save = () => {
    setTried(true);
    if (toNumber(kcal) === null && toNumber(protein) === null) return;
    const label = name.trim() === '' ? F.quickName : name.trim();
    api.getState().addFood({ meal, name: label, amount: amount.trim(), kcal: Math.round(toNumber(kcal) ?? 0), protein: Math.round(toNumber(protein) ?? 0), carbs: toNumber(carbs), fat: toNumber(fat), ...(day !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(day) ? { day } : {}) });
    buzz('stamp');
    toast(F.saved(label));
    router.back();
  };
  return (
    <Screen footer={<Button label={F.save} onPress={save} testID="food-save" />}>
      <Header onBack={() => router.back()} backIcon="close" title={F.title} />
      <Field label={F.name} value={name} onChange={setName} placeholder={F.namePlaceholder} testID="food-name" />
      <Field label={F.amount} value={amount} onChange={setAmount} placeholder={F.amountPlaceholder} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label={F.kcal} value={kcal} onChange={setKcal} keyboard="number-pad" testID="food-kcal" /></View>
        <View style={{ flex: 1 }}><Field label={F.protein} value={protein} onChange={setProtein} keyboard="number-pad" testID="food-protein" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label={F.carbs} value={carbs} onChange={setCarbs} keyboard="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label={F.fat} value={fat} onChange={setFat} keyboard="number-pad" /></View>
      </View>
      {numberError !== null && <T v="small" color={G.warn}>{numberError}</T>}
      <T v="label" color={G.muted}>{F.meal}</T>
      <Options label={F.meal} value={meal} onChange={setMeal} options={MEALS.map((m) => ({ key: m, label: TX.meals[m] }))} />
    </Screen>
  );
}

export function FoodTargets() {
  const api = useBaseApi();
  const units = useBase((s) => s.units);
  const saved = useBase((s) => s.targets);
  const [weight, setWeight] = useState(saved === null ? '' : String(saved.weight));
  const [goal, setGoal] = useState<Targets['goal']>(saved?.goal ?? 'keep');
  const [kcal, setKcal] = useState(saved === null ? '' : String(saved.kcal));
  const [protein, setProtein] = useState(saved === null ? '' : String(saved.protein));
  const TT = TX.targets;
  const suggest = (w: string, g: Targets['goal']) => {
    const n = toNumber(w);
    if (n === null || n < 30) return;
    const s = suggestTargets(n, units, g);
    setKcal(String(s.kcal));
    setProtein(String(s.protein));
  };
  const ok = toNumber(kcal) !== null && toNumber(protein) !== null && toNumber(weight) !== null;
  return (
    <Screen footer={<Button label={TT.save} disabled={!ok} testID="targets-save" onPress={() => {
      api.getState().setTargets({ kcal: Math.round(toNumber(kcal)!), protein: Math.round(toNumber(protein)!), weight: toNumber(weight)!, goal });
      router.back();
    }} />}>
      <Header onBack={() => router.back()} backIcon="close" title={TT.title} />
      <T color={G.muted}>{TT.body}</T>
      <Field label={TT.weight(units)} value={weight} keyboard="decimal-pad" testID="targets-weight" onChange={(w) => {
        setWeight(w);
        suggest(w, goal);
      }} />
      <T v="label" color={G.muted}>{TT.goal}</T>
      <Options label={TT.goal} columns={1} value={goal} onChange={(g) => {
        setGoal(g);
        suggest(weight, g);
      }} options={(['lose', 'keep', 'gain'] as const).map((g) => ({ key: g, label: TT.goals[g] }))} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label={TT.kcal} value={kcal} onChange={setKcal} keyboard="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label={TT.protein} value={protein} onChange={setProtein} keyboard="number-pad" /></View>
      </View>
    </Screen>
  );
}
