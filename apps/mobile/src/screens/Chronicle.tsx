// Chronicle (spec §1.3–1.4, board D5; M6d): the streak, best and shields as tiles; the month calendar of real dates
// (decisions 3–4); growth since day 1 (decision 5). M8b: the past readings (decision 7).
import { CHRONICLE_TEXT, STAT_NAMES, fillText, growthLine } from '@levelmeup/content';
import { MAX_SHIELDS, STATS } from '@levelmeup/rules';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServerState } from '../game/types.ts';
import { todayMark } from '../lib/calendar.ts';
import { dateKeyLabel } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { HalftoneHeader } from '../ui/HalftoneHeader.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Caption, Heading, Label, Small, Title } from '../ui/Text.tsx';
import { Calendar } from './chronicle/Calendar.tsx';
import { PastReadings } from './reading/PastReadings.tsx';
import { lastSynced } from './syncLine.ts';

const C = CHRONICLE_TEXT;

function Tile({ value, label, of }: { value: number; label: string; of?: string }) {
  return (
    <View
      accessible
      accessibilityLabel={[label, String(value), of].filter((part) => part !== undefined).join(' ')}
      style={{ flex: 1, minWidth: 88, padding: 12, gap: 2, borderWidth: 2, borderColor: colors.line }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
        <Title>{String(value)}</Title>
        {of !== undefined && <Small>{of}</Small>}
      </View>
      <Label>{label}</Label>
    </View>
  );
}

function Growth({ growth }: { growth: ServerState['growth'] }) {
  return (
    <NightCard>
      <Heading>{growth.since === null ? C.growthTitle : fillText(C.since, { date: dateKeyLabel(growth.since) })}</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {STATS.map((s) => (
          <View
            key={s}
            accessible
            accessibilityLabel={fillText(C.statGain, { stat: STAT_NAMES[s], n: growth.stats[s] })}
            style={{ flex: 1, minWidth: 52, alignItems: 'center', gap: 2 }}
          >
            <Heading tone="ember">{`+${growth.stats[s]}`}</Heading>
            <Label>{C.statShort[s]}</Label>
          </View>
        ))}
      </View>
      <Small>{growthLine({ levels: growth.levels, quests: growth.questsCleared, rungs: growth.newRungs })}</Small>
    </NightCard>
  );
}

export function Chronicle({ onOpenReading = () => {} }: { onOpenReading?: (id: string) => void } = {}) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const status = useGame((s) => s.status);
  const lastSyncedAt = useGame((s) => s.lastSyncedAt);
  const stale = status === 'offline' || status === 'retrying';
  const streak = view?.character.streak;
  const today = view?.calendar.find((d) => d.mark === 'open')?.date ?? null;

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
        <Label>{C.label}</Label>
        {streak !== undefined && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Tile value={streak.current} label={C.streak} />
            <Tile value={streak.best} label={C.best} />
            <Tile value={streak.shields} label={C.shields} of={fillText(C.shieldsOf, { max: MAX_SHIELDS })} />
          </View>
        )}
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        {view === null || view.calendar.length === 0 ? (
          <NarrationBox>{C.empty}</NarrationBox>
        ) : (
          <>
            <Calendar
              // A new month remounts it, so the calendar follows today into it (review).
              key={(today ?? view.calendar[0]!.date).slice(0, 7)}
              days={view.calendar}
              today={today}
              todayLook={view.today === null ? 'none' : todayMark(view.today)}
            />
            <Growth growth={view.growth} />
            <PastReadings readings={view.readings.filter((r) => r.dayNumber !== view.today?.dayNumber)} onOpen={onOpenReading} />
          </>
        )}
        {stale && <Caption>{lastSynced(lastSyncedAt, view?.profile.timeZone ?? 'UTC')}</Caption>}
      </View>
    </ScreenScroll>
  );
}
