// Chronicle (spec §1.3, D5 board), M4's version: the streak and the recent days as a list. The calendar, growth since
// day 1 and past readings arrive in M6.
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServerState } from '../game/types.ts';
import { dayLabel } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { HalftoneHeader } from '../ui/HalftoneHeader.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Caption, Label, Meta, Small, Title } from '../ui/Text.tsx';
import { lastSynced } from './syncLine.ts';

type RecentDay = ServerState['recentDays'][number];

export function dayOutcome(day: RecentDay): string {
  if (day.status === 'open') return 'In progress';
  if (day.resolution === 'protected') return 'Protected';
  if (day.resolution === 'awaiting_checkin') return 'Check-in due';
  return `Cleared ${day.cleared}`;
}

export function Chronicle() {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const status = useGame((s) => s.status);
  const lastSyncedAt = useGame((s) => s.lastSyncedAt);
  const stale = status === 'offline' || status === 'retrying';
  const streak = view?.character.streak;

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
        <Label>Chronicle</Label>
        {streak !== undefined && (
          <>
            <Title>{`${streak.current}-day streak`}</Title>
            <Small>{`Best ${streak.best} · ${streak.shields} of 2 shields`}</Small>
          </>
        )}
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 12 }}>
        <SectionTitle title="Recent days" />
        {view === null || view.recentDays.length === 0 ? (
          <NarrationBox>Your chronicle begins today.</NarrationBox>
        ) : (
          view.recentDays.map((day) => (
            <NightCard key={day.dayNumber} quiet>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ gap: 2 }}>
                  <Body weight="bold">{`Day ${day.dayNumber}`}</Body>
                  <Meta>{dayLabel(day.startsAt!, view.profile.timeZone)}</Meta>
                </View>
                <Body tone="ashLight">{dayOutcome(day)}</Body>
              </View>
            </NightCard>
          ))
        )}
        {stale && <Caption>{lastSynced(lastSyncedAt, view?.profile.timeZone ?? 'UTC')}</Caption>}
      </View>
    </ScreenScroll>
  );
}
