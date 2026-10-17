// Today's reading on Today and in the Library (M8b decision 5; Round 3, M12 boards R3-1 and R3-5): as Up next, a card
// with the screen's one bright Read button; otherwise a quiet row. The line says what reading it takes: "6 cards ·
// about 3 min" once the phone holds its Story Deck, else the article's minutes. While the day has no article yet, the
// waiting line.
import { CLUSTER_NAMES, PLAY_TEXT, READING_TEXT, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import type { ArticleBody, ArticleSummary, QuestView } from '../../game/types.ts';
import { asDeck, deckCards, deckMinutes } from '../../reading/deck.ts';
import { useGame } from '../../state/store.ts';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Icon } from '../../ui/icons.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Body, Heading, Label, Small, Title } from '../../ui/Text.tsx';
import { QuestRow, WillSync, questXp } from '../QuestCard.tsx';

/** "6 cards · about 3 min", or "6 min read" for an article without a deck on this phone. */
export function readingLength(article: ArticleSummary, held: ArticleBody | null): string {
  const deck = held === null ? null : asDeck(held.deck);
  return deck === null
    ? fillText(READING_TEXT.minutes, { n: article.minutes })
    : fillText(READING_TEXT.deck.cards, { cards: deckCards(deck).length, minutes: deckMinutes(deck) });
}

export function useReadingLength(article: ArticleSummary): string {
  return readingLength(article, useGame((s) => s.articles[article.id] ?? null));
}

export type ReadingProps = { quest: QuestView; article: ArticleSummary | null; waiting: boolean; onOpen: () => void };

/** Up next: the reading as the thing to do now. */
export function ReadingHero({ quest, article, waiting, onOpen, label = READING_TEXT.read }: ReadingProps & { article: ArticleSummary; label?: string }) {
  const xp = questXp(quest);
  const length = useReadingLength(article);
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${READING_TEXT.label}, ${CLUSTER_NAMES[article.cluster]}. ${article.title}. ${length}. ${label}, +${xp} XP`}
      onPress={onOpen} radius={radius.card}>
      <View testID="up-next" style={{ gap: 8, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, borderRadius: radius.card, borderWidth: space.heroBorder, borderColor: colors.accent, backgroundColor: colors.panel }}>
        <Label tone="accentText">{`${READING_TEXT.label} · ${CLUSTER_NAMES[article.cluster]}`}</Label>
        <Title>{article.title}</Title>
        <Body tone="ashLight" weight="medium">{`${length} · +${xp} XP`}</Body>
        {waiting && <WillSync />}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 54, marginTop: 4, borderRadius: radius.pill, backgroundColor: colors.commit }}>
          <Heading tone="onAccent">{label}</Heading>
          <Icon name="chevronRight" size={22} color={colors.onAccent} />
        </View>
      </View>
    </Tap>
  );
}

/** Then: the reading as a quiet row; the waiting line while the day has no article. */
export function ReadingRow({ quest, article, waiting, onOpen }: ReadingProps) {
  if (article === null) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.control, borderWidth: space.border, borderColor: colors.divider, backgroundColor: colors.panel }}>
        <Small>{PLAY_TEXT.quest.article}</Small>
      </View>
    );
  }
  return <ReadingLine quest={quest} article={article} waiting={waiting} onOpen={onOpen} />;
}

function ReadingLine({ quest, article, waiting, onOpen }: ReadingProps & { article: ArticleSummary }) {
  const length = useReadingLength(article);
  return <QuestRow title={article.title} line={`${CLUSTER_NAMES[article.cluster]} · ${length}`} xp={questXp(quest)} waiting={waiting} onOpen={onOpen} />;
}
