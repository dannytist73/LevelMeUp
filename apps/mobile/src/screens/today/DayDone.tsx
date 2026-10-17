// The day done (Round 3, M12 board R3-4; plan decisions 2 and 9): what the day earned, the level it brought, when the
// next day starts, and once, the first time, the offer of a morning briefing.
import { CLASS_NAMES, TODAY_TEXT, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import type { Shown } from '../../game/project.ts';
import { shownStreak, xpToday } from '../../game/today.ts';
import type { TodayView } from '../../game/types.ts';
import { clockLabel, clockTime } from '../../lib/dates.ts';
import type { CodexEntry } from '../../reading/codex.ts';
import { useGame } from '../../state/store.ts';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Icon } from '../../ui/icons.tsx';
import { Panel } from '../../ui/Panel.tsx';
import { Body, Caption, Heading, Label, Small, Title } from '../../ui/Text.tsx';
import { XpBar } from '../../ui/XpBar.tsx';

/** The lessons kept from the Codex during today. */
export function keptToday(codex: readonly CodexEntry[], today: TodayView): number {
  const from = Date.parse(today.startsAt!);
  const to = Date.parse(today.endsAt!);
  return codex.filter((e) => e.keptAt >= from && e.keptAt < to).length;
}

export function DayDonePanel({ view, today }: { view: Shown; today: TodayView }) {
  const codex = useGame((s) => s.codex);
  const kept = keptToday(codex, today);
  const { level, xpIntoLevel, xpForLevel } = view.character;
  const facts = [fillText(TODAY_TEXT.earned, { xp: xpToday(today) }), ...(kept === 0 ? [] : [kept === 1 ? TODAY_TEXT.dayDone.kept : fillText(TODAY_TEXT.dayDone.keptMany, { n: kept })])];
  return (
    <View accessible accessibilityRole="summary" testID="day-done">
      <Panel outlined contentStyle={{ paddingHorizontal: 18, paddingVertical: 18, gap: 8 }}>
        <Title tone="ink">{fillText(TODAY_TEXT.dayCleared, { day: today.dayNumber })}</Title>
        <Body tone="inkSoft" weight="medium">{shownStreak(view).counts ? TODAY_TEXT.dayDone.holds : TODAY_TEXT.dayDone.rest}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}>
          {facts.map((fact) => <Body key={fact} tone="accentInk" weight="bold">{fact}</Body>)}
        </View>
        <View style={{ gap: 6, paddingTop: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
            <Label tone="inkSoft">{`Lv ${level} ${CLASS_NAMES[view.profile.classId]}`}</Label>
            <Caption tone="inkMuted">{`${xpIntoLevel} / ${xpForLevel} XP`}</Caption>
          </View>
          <XpBar on="paper" value={xpIntoLevel} max={xpForLevel} level={level} label={`Level ${level} progress`} />
        </View>
        <Small tone="inkSoft">{fillText(TODAY_TEXT.nextDay, { time: clockTime(today.endsAt!, today.timeZone) })}</Small>
      </Panel>
    </View>
  );
}

/**
 * M12 decision 9 (audit 17): on the first day done, one offer of the morning briefing, at its usual time. Remind me asks
 * Android first (the phone's own prompt); either answer is final here, and Settings → Notifications keeps the switch.
 * Not offered when the briefing is already on or the phone refused notifications for good.
 */
export function ReminderOffer() {
  const notify = useGame((s) => s.notify);
  const permission = useGame((s) => s.permission);
  const offers = useGame((s) => s.offers);
  const markOffer = useGame((s) => s.markOffer);
  const setNotify = useGame((s) => s.setNotify);
  const allowNotify = useGame((s) => s.allowNotify);
  const on = notify.optedIn && notify.briefing.on;
  if (offers.includes('reminder') || on || permission === 'denied' || permission === 'unknown') return null;
  const time = clockLabel(notify.briefing.minutes);
  const yes = async (): Promise<void> => {
    await markOffer('reminder');
    const allowed = permission === 'granted' ? 'granted' : await allowNotify();
    if (allowed === 'granted') await setNotify({ ...notify, briefing: { ...notify.briefing, on: true }, optedIn: true });
  };
  return (
    <View testID="reminder-offer" style={{ gap: 12, padding: 16, borderRadius: radius.card, borderWidth: space.border, borderColor: colors.lineStrong, backgroundColor: colors.panel }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Icon name="bell" size={22} color={colors.accentText} />
        <View style={{ flex: 1, gap: 4 }}>
          <Heading>{TODAY_TEXT.reminder.title}</Heading>
          <Small>{fillText(TODAY_TEXT.reminder.line, { time })}</Small>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Button label={TODAY_TEXT.reminder.yes} onPress={() => void yes()} style={{ flexGrow: 1 }} />
        <Button label={TODAY_TEXT.reminder.no} variant="secondary" onPress={() => void markOffer('reminder')} style={{ flexGrow: 1 }} />
      </View>
    </View>
  );
}
