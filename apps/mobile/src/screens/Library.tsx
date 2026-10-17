// The Library (M12, plan decision 1, board R3-5; audit 18): reading gets a home of its own. Today's reading, the lessons
// kept from the Story Decks (each opens its reading) and the past readings, in one tab, where they used to be spread over
// Character (the Codex) and the Chronicle (past readings).
import { CLUSTER_NAMES, READING_TEXT, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReadingView } from '../game/types.ts';
import { dateKeyLabel } from '../lib/dates.ts';
import type { CodexEntry } from '../reading/codex.ts';
import { asDeck } from '../reading/deck.ts';
import { useGame } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { Icon } from '../ui/icons.tsx';
import { LinkButton } from '../ui/LinkButton.tsx';
import { ScreenHeader } from '../ui/ScreenHeader.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { StateNote } from '../ui/StateNote.tsx';
import { Tap } from '../ui/Tap.tsx';
import { Body, Caption, Heading, Label, Small, Title } from '../ui/Text.tsx';
import { ClearedRow, questXp } from './QuestCard.tsx';
import { ReadingHero, ReadingRow } from './reading/ReadingCard.tsx';
import { lastSynced } from './syncLine.ts';

const L = READING_TEXT.library;
/** Kept lessons shown here; See all opens the Codex. */
export const LIBRARY_LESSONS = 3;

export type LibraryProps = {
  /** Today's reading quest, to read and claim. */
  onOpenQuest: (questId: number) => void;
  /** A reading again: a past day's, or a kept lesson's (no day). */
  onOpenReading: (articleId: string, dayNumber: number | null) => void;
  onOpenCodex: () => void;
};

/** A kept lesson: its words, the reading it came from; it opens that reading. */
export function LessonCard({ entry, onOpen }: { entry: CodexEntry; onOpen: () => void }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${entry.lesson} ${fillText(READING_TEXT.codex.openLabel, { title: entry.title })}`}
      onPress={onOpen} on="paper" radius={radius.card}>
      <View style={{ gap: 8, padding: 16, borderRadius: radius.card, backgroundColor: colors.paper }}>
        <Icon name="bookmark" size={18} color={colors.accentInk} />
        <Heading tone="ink">{entry.lesson}</Heading>
        <Caption tone="inkMuted">{entry.title}</Caption>
      </View>
    </Tap>
  );
}

function PastRow({ reading, onOpen }: { reading: ReadingView; onOpen: () => void }) {
  const date = dateKeyLabel(reading.date);
  const line = [fillText(L.pastLine, { date, topic: CLUSTER_NAMES[reading.cluster] }), ...(reading.takeaway === null ? [] : [L.lineSaved])].join(' · ');
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${reading.title}. ${line}`} onPress={onOpen} radius={radius.control}
      style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.control, backgroundColor: colors.panel }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="bold">{reading.title}</Body>
        <Small>{line}</Small>
      </View>
      <Icon name="chevronRight" size={20} color={colors.ashLight} />
    </Tap>
  );
}

export function Library({ onOpenQuest, onOpenReading, onOpenCodex }: LibraryProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const codex = useGame((s) => s.codex);
  const articles = useGame((s) => s.articles);
  const status = useGame((s) => s.status);
  const lastSyncedAt = useGame((s) => s.lastSyncedAt);
  const stale = status === 'offline' || status === 'retrying';
  const today = view?.today ?? null;
  const quest = today?.quests.find((q) => q.slot === 'article') ?? null;
  const article = today?.article ?? null;
  const open = today !== null && Date.parse(today.endsAt!) > Date.now();
  const past = view?.readings.filter((r) => r.dayNumber !== today?.dayNumber) ?? [];
  const held = article === null ? null : (articles[article.id] ?? null);
  const hasDeck = held !== null && asDeck(held.deck) !== null;

  let todays = null;
  if (quest !== null && open) {
    if (article === null) todays = <ReadingRow quest={quest} article={null} waiting={false} onOpen={() => {}} />;
    else if (quest.completedAt === null) {
      todays = <ReadingHero quest={quest} article={article} waiting={view!.waiting.has(quest.id)} onOpen={() => onOpenQuest(quest.id)} label={hasDeck ? L.openCards : READING_TEXT.read} />;
    } else {
      todays = (
        <ClearedRow title={article.title} stat={CLUSTER_NAMES[article.cluster]} time={L.readAgain} xp={questXp(quest)} waiting={view!.waiting.has(quest.id)}
          onOpen={() => onOpenReading(article.id, null)} />
      );
    }
  }

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }}>
      <ScreenHeader style={{ paddingTop: insets.top + 22, gap: 4 }}>
        <Title accessibilityRole="header">{L.title}</Title>
        <Small>{L.line}</Small>
      </ScreenHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 26 }}>
        {todays !== null && (
          <View style={{ gap: 10 }}>
            <SectionTitle title={L.today} />
            {todays}
          </View>
        )}

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12 }}>
            <SectionTitle title={fillText(L.kept, { n: codex.length })} />
            {codex.length > LIBRARY_LESSONS && <LinkButton label={L.seeAll} tone="accentText" onPress={onOpenCodex} />}
          </View>
          {codex.length === 0 ? (
            <StateNote kind="empty" title={L.noKept} line={L.noKeptLine}
              action={quest !== null && article !== null && open && quest.completedAt === null ? { label: L.openToday, onPress: () => onOpenQuest(quest.id) } : undefined} />
          ) : (
            codex.slice(0, LIBRARY_LESSONS).map((entry) => <LessonCard key={entry.articleId} entry={entry} onOpen={() => onOpenReading(entry.articleId, null)} />)
          )}
          {codex.length > 0 && codex.length <= LIBRARY_LESSONS && <LinkButton label={L.seeAll} tone="accentText" onPress={onOpenCodex} />}
        </View>

        <View style={{ gap: 10 }}>
          <SectionTitle title={READING_TEXT.past.title} />
          {past.length === 0
            ? <Small>{READING_TEXT.past.empty}</Small>
            : past.map((r) => <PastRow key={`${r.dayNumber}-${r.id}`} reading={r} onOpen={() => onOpenReading(r.id, r.dayNumber)} />)}
        </View>
        {stale && <Caption>{lastSynced(lastSyncedAt, view?.profile.timeZone ?? 'UTC')}</Caption>}
      </View>
    </ScreenScroll>
  );
}
