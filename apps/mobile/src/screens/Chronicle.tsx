// Chronicle (spec §1.3–1.4, board D5; M6d): the streak, best and shields as tiles; the month calendar of real dates
// (decisions 3–4); growth since day 1 (decision 5). M8b: the past readings (decision 7). M10c: the tiles count today once
// it counts (as Today does); growth leads with its line and shows only the stats that grew. M12: the past readings moved
// to the Library tab (plan decision 1).
import { CHRONICLE_TEXT, STAT_NAMES, fillText, growthLine } from '@levelmeup/content';
import { MAX_SHIELDS, STATS } from '@levelmeup/rules';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shownStreak } from '../game/today.ts';
import type { ServerState } from '../game/types.ts';
import { todayMark } from '../lib/calendar.ts';
import { dateKeyLabel } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { ScreenHeader } from '../ui/ScreenHeader.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Caption, Heading, Label, Small, Title } from '../ui/Text.tsx';
import { Bone, Skeleton } from '../ui/Skeleton.tsx';
import { TabTop } from '../ui/TabTop.tsx';
import { Calendar } from './chronicle/Calendar.tsx';
import { StatChart } from './chronicle/StatChart.tsx';
import { lastSynced, staleSince } from './syncLine.ts';

const C = CHRONICLE_TEXT;

function Tile({ value, label, of }: { value: number; label: string; of?: string }) {
  return (
    <View
      accessible
      accessibilityLabel={[label, String(value), of].filter((part) => part !== undefined).join(' ')}
      style={{ flex: 1, minWidth: 88, padding: 12, gap: 2, borderRadius: radius.control, backgroundColor: colors.panel }}
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
  const grew = STATS.filter((s) => growth.stats[s] > 0);
  return (
    <NightCard>
      <Heading>{growth.since === null ? C.growthTitle : fillText(C.since, { date: dateKeyLabel(growth.since) })}</Heading>
      <Small>{growthLine({ levels: growth.levels, quests: growth.questsCleared, rungs: growth.newRungs })}</Small>
      {grew.length > 0 && (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {grew.map((s) => (
          <View
            key={s}
            accessible
            accessibilityLabel={fillText(C.statGain, { stat: STAT_NAMES[s], n: growth.stats[s] })}
            style={{ flex: 1, minWidth: 52, alignItems: 'center', gap: 2 }}
          >
            <Heading tone="accentText">{`+${growth.stats[s]}`}</Heading>
            <Label>{C.statShort[s]}</Label>
          </View>
        ))}
      </View>
      )}
    </NightCard>
  );
}

/** M13: the all-time chart's way to the Plus offer. */
export type ChronicleProps = { onPlus?: () => void; onSettings?: () => void };

export function Chronicle({ onPlus = () => {}, onSettings }: ChronicleProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const lastSyncedAt = useGame(staleSince);
  const stale = lastSyncedAt !== undefined;
  const streak = view?.character.streak;
  const shown = view == null ? null : shownStreak(view);
  const today = view?.calendar.find((d) => d.mark === 'open')?.date ?? null;

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }}>
      <ScreenHeader style={{ paddingTop: insets.top + 12 }}>
        <TabTop onSettings={onSettings}><Label accessibilityRole="header">{C.label}</Label></TabTop>
        {streak !== undefined && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Tile value={shown!.current} label={C.streak} />
            <Tile value={shown!.best} label={C.best} />
            <Tile value={streak.shields} label={C.shields} of={fillText(C.shieldsOf, { max: MAX_SHIELDS })} />
          </View>
        )}
      </ScreenHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        {/* M17 (UX audit O8): loading looks like loading, not like an empty chronicle. */}
        {view === null ? (
          <Skeleton><Bone height={48} /><Bone height={280} round={radius.card} /></Skeleton>
        ) : view.calendar.length === 0 ? (
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
            <StatChart weeks={view.statWeeks ?? null} onPlus={onPlus} />
          </>
        )}
        {stale && <Caption>{lastSynced(lastSyncedAt ?? null, view?.profile.timeZone ?? 'UTC')}</Caption>}
      </View>
    </ScreenScroll>
  );
}
