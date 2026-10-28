// Me (docs/2026-10-28-base-app.md): units, the plan (set it up again), home equipment, areas that hurt, and starting
// over. Everything is on this phone.
import { BASE_TEXT } from '@levelmeup/content';
import type { Equipment, Limitation } from '@levelmeup/rules';
import { router } from 'expo-router';
import { useState } from 'react';
import { APP_VERSION } from '../../appVersion.ts';
import { expoNotes } from '../../notify/os.ts';
import type { Reminder } from '../logic.ts';
import { useBase, useBaseApi } from '../store.ts';
import { G } from '../theme.ts';
import { Button, Card, Checks, Header, Options, Screen, T } from '../ui.tsx';

const TX = BASE_TEXT.me;

export function Me() {
  const api = useBaseApi();
  const units = useBase((s) => s.units);
  const plan = useBase((s) => s.plan);
  const reminder = useBase((s) => s.reminder);
  const look = useBase((s) => s.look);
  const restAlerts = useBase((s) => s.restAlerts);
  const pickRestAlerts = async (on: boolean) => {
    if (on && (await expoNotes.ask()) !== 'granted') {
      setDenied(true);
      return;
    }
    setDenied(false);
    api.getState().setRestAlerts(on);
  };
  const [confirm, setConfirm] = useState(false);
  const [denied, setDenied] = useState(false);
  const pickReminder = async (r: Reminder) => {
    if (r !== 'off' && (await expoNotes.ask()) !== 'granted') {
      setDenied(true);
      return;
    }
    setDenied(false);
    api.getState().setReminder(r);
  };
  const edit = (patch: { home?: Equipment[]; limitations?: Limitation[] }) => {
    const p = api.getState().plan;
    if (p !== null) api.getState().setPlan({ ...p, ...patch });
  };
  return (
    <Screen>
      <Header onBack={() => router.back()} title={TX.title} />
      <T v="bodyStrong">{TX.look}</T>
      <Options label={TX.look} columns={3} value={look} onChange={(l) => api.getState().setLook(l)}
        options={(['system', 'dark', 'light'] as const).map((k) => ({ key: k, label: TX.looks[k] }))} />
      <T v="bodyStrong">{TX.units}</T>
      <Options label={TX.units} value={units} onChange={(u) => api.getState().setUnits(u)} options={[{ key: 'kg', label: TX.kg }, { key: 'lb', label: TX.lb }]} />
      <T v="bodyStrong">{TX.reminder.title}</T>
      <Options label={TX.reminder.title} columns={1} value={reminder} onChange={(r) => void pickReminder(r)}
        options={[{ key: 'off', label: TX.reminder.off }, { key: 'morning', label: TX.reminder.morning }, { key: 'evening', label: TX.reminder.evening }]} />
      <T v="small" color={G.muted}>{TX.reminder.help}</T>
      <Checks value={restAlerts ? ['on'] : []} onChange={(v) => void pickRestAlerts(v.includes('on'))} options={[{ key: 'on', label: TX.restAlert.title }]} />
      <T v="small" color={G.muted}>{TX.restAlert.text}</T>
      {denied && (
        <Card>
          <T v="small">{TX.reminder.denied}</T>
          <Button label={TX.reminder.open} kind="secondary" onPress={() => void expoNotes.openSettings()} />
        </Card>
      )}
      <T v="bodyStrong">{TX.plan}</T>
      <Button label={BASE_TEXT.train.change} kind="secondary" onPress={() => router.push('/start')} />
      {plan !== null && (
        <>
          <T v="bodyStrong">{TX.equipment}</T>
          <Checks value={plan.home} onChange={(home) => edit({ home })}
            options={(['dumbbells', 'bench', 'bands', 'pullup_bar'] as const).map((k) => ({ key: k, label: BASE_TEXT.setup.equipment.items[k] }))} />
          <T v="bodyStrong">{TX.pain}</T>
          <Checks value={plan.limitations} onChange={(limitations) => edit({ limitations })}
            options={(['knee', 'back', 'shoulder', 'wrist'] as const).map((k) => ({ key: k, label: BASE_TEXT.setup.safety.items[k] }))} />
        </>
      )}
      <Card>
        <T v="small" color={G.muted}>{TX.about}</T>
        <T v="small" color={G.muted}>{TX.version(APP_VERSION ?? '')}</T>
      </Card>
      {confirm ? (
        <Card hero>
          <T v="bodyStrong">{TX.resetBody}</T>
          <Button label={TX.resetYes} onPress={() => {
            api.getState().resetAll();
            router.dismissAll();
          }} />
          <Button label={TX.resetNo} kind="secondary" onPress={() => setConfirm(false)} />
        </Card>
      ) : (
        <Button label={TX.reset} kind="quiet" onPress={() => setConfirm(true)} />
      )}
    </Screen>
  );
}
