// Settings → Notifications (spec §4.4; M7d decisions 4–5; S1 board's section): the morning briefing, the evening reminder
// and timer alerts. A switch is on only while the phone allows notifications and the player has turned one on here;
// turning one on asks first (the System's card, then the phone's own prompt). Once the phone refuses for good, only its settings can change that: this screen
// says so and never asks again. The Shadow's reminder has no switch: it belongs to the Pact (decision 4).
import { NOTIFY_TEXT, fillText } from '@levelmeup/content';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clockLabel } from '../lib/dates.ts';
import { shadowClock } from '../notify/plan.ts';
import type { NotifySettings } from '../notify/types.ts';
import { useGame } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label, Meta, Small, Title } from '../ui/Text.tsx';
import { TimeStepper } from '../ui/TimeStepper.tsx';
import { Toggle } from '../ui/Toggle.tsx';

const T = NOTIFY_TEXT;
type Kind = 'briefing' | 'evening' | 'timers';

/** Turning one on is the player's choice of notifications (`optedIn`); turning one off leaves the others as they are. */
function turned(s: NotifySettings, kind: Kind, on: boolean): NotifySettings {
  const next = kind === 'timers' ? { ...s, timers: on } : { ...s, [kind]: { ...s[kind], on } };
  return on ? { ...next, optedIn: true } : next;
}

export type NotificationsProps = { onBack: () => void; onOpenSettings: () => void };

export function Notifications({ onBack, onOpenSettings }: NotificationsProps) {
  const insets = useSafeAreaInsets();
  const notify = useGame((s) => s.notify);
  const permission = useGame((s) => s.permission);
  const level = useGame((s) => s.view?.profile.accountabilityLevel ?? 0);
  const boundary = useGame((s) => s.view?.profile.boundaryMinutes ?? 0);
  const setNotify = useGame((s) => s.setNotify);
  const allowNotify = useGame((s) => s.allowNotify);
  const [asking, setAsking] = useState<Kind | null>(null);
  const allowed = permission === 'granted';
  const denied = permission === 'denied';
  const isOn = (kind: Kind): boolean => allowed && notify.optedIn && (kind === 'timers' ? notify.timers : notify[kind].on);

  const change = (kind: Kind, on: boolean): void => {
    if (!on || allowed) {
      void setNotify(turned(notify, kind, on));
      return;
    }
    if (denied) return; // refused for good: the card above says where to change it
    setAsking(kind);
    // The card shows at the top of the screen, away from the switch: a screen reader hears it (review).
    AccessibilityInfo.announceForAccessibility(`${T.ask.title} ${T.ask.line}`);
  };
  const allow = async (): Promise<void> => {
    const kind = asking;
    setAsking(null);
    if (kind !== null && (await allowNotify()) === 'granted') await setNotify(turned(notify, kind, true));
  };
  const time = (kind: 'briefing' | 'evening', label: string) =>
    isOn(kind) && (
      <TimeStepper label={label} minutes={notify[kind].minutes} onChange={(minutes) => void setNotify({ ...notify, [kind]: { ...notify[kind], minutes } })} />
    );

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 20 }}>
      {/* Wraps, so at the largest text the title moves under Back instead of breaking inside the word (emulator). */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: space.border, borderColor: colors.line }}
        >
          <Label tone="chalk">Back</Label>
        </Pressable>
        <Title style={{ flexShrink: 1 }}>{T.title}</Title>
      </View>
      <Small>{T.lead}</Small>

      {denied && (
        <NightCard>
          <Body>{T.denied.line}</Body>
          <Button label={T.denied.open} variant="secondary" onPress={onOpenSettings} />
        </NightCard>
      )}
      {asking !== null && (
        <NightCard>
          <Body weight="bold">{T.ask.title}</Body>
          <Small>{T.ask.line}</Small>
          <Button label={T.ask.allow} onPress={() => void allow()} />
          <Button label={T.ask.notNow} variant="secondary" onPress={() => setAsking(null)} />
        </NightCard>
      )}

      <Toggle label={T.briefing} line={T.briefingLine} value={isOn('briefing')} disabled={denied} onChange={(on) => change('briefing', on)} />
      {time('briefing', T.briefingAt)}
      <Toggle label={T.evening} line={T.eveningLine} value={isOn('evening')} disabled={denied} onChange={(on) => change('evening', on)} />
      {time('evening', T.eveningAt)}
      <Toggle label={T.timers} line={T.timersLine} value={isOn('timers')} disabled={denied} onChange={(on) => change('timers', on)} />

      {level === 2 && allowed && notify.optedIn && (
        <NightCard>
          <Body weight="bold" tone="shadow">{T.shadowTitle}</Body>
          <Small>{fillText(T.shadowNote, { time: clockLabel(shadowClock(notify.evening.minutes, boundary)) })}</Small>
        </NightCard>
      )}
      <Meta>{T.late}</Meta>
    </ScreenScroll>
  );
}
