// Today's reading on Today and in the Library (M8b decision 5; Round 3, M12 boards R3-1 and R3-5): as Up next, a card
// with the screen's one bright Read button; otherwise a quiet row. The line says what reading it takes: "6 cards ·
// about 3 min" once the phone holds its Story Deck, else the article's minutes. While the day has no article yet, the
// waiting line.
import { CAMP_TEXT, CLUSTER_NAMES, PLAY_TEXT, READING_TEXT, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import type { ArticleBody, ArticleSummary, QuestView } from '../../game/types.ts';
import { asDeck, deckCards, deckMinutes, isStory } from '../../reading/deck.ts';
import { useGame } from '../../state/store.ts';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Icon } from '../../ui/icons.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Body, Heading, Label, Small, Title } from '../../ui/Text.tsx';
import { PowerChip, powerWords } from '../../ui/PowerChip.tsx';
import type { Power } from '../../ui/PowerChip.tsx';
import { QuestRow, WillSync, questXp } from '../QuestCard.tsx';

/** "about 4 min" for a story lesson, "6 cards · about 3 min" for an older deck, or "6 min read" without a deck on this phone. */
export function readingLength(article: ArticleSummary, held: ArticleBody | null): string {
  const deck = held === null ? null : asDeck(held.deck);
  if (deck === null) return fillText(READING_TEXT.minutes, { n: article.minutes });
  // A simpler day: a story lesson is one scroll, so it has minutes, not cards.
  return isStory(deck) ? fillText(CAMP_TEXT.storyLength, { n: deckMinutes(deck) })
    : fillText(READING_TEXT.deck.cards, { cards: deckCards(deck).length, minutes: deckMinutes(deck) });
}

export function useReadingLength(article: ArticleSummary): string {
  return readingLength(article, useGame((s) => s.articles[article.id] ?? null));
}

/** M17: past this many characters a reading's title takes the heading size. */
const LONG_TITLE = 28;

/** Monster Week: `power`, what the reading gives the battle. */
export type ReadingProps = { quest: QuestView; article: ArticleSummary | null; waiting: boolean; onOpen: () => void; power?: Power };

/** Up next: the reading as the thing to do now. */
export function ReadingHero({ quest, article, waiting, onOpen, label = READING_TEXT.read, lead, power }: ReadingProps & {
  article: ArticleSummary;
  label?: string;
  /** M17: Today's "Up next", leading the card's line. */
  lead?: string;
}) {
  const xp = questXp(quest);
  const length = useReadingLength(article);
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${lead === undefined ? '' : `${lead}. `}${READING_TEXT.label}, ${CLUSTER_NAMES[article.cluster]}. ${article.title}. ${length}. ${label}, +${xp} XP${power === undefined ? '' : `, ${powerWords(power)}`}`}
      onPress={onOpen} radius={radius.card}>
      <View testID="up-next" style={{ gap: 8, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, borderRadius: radius.card, borderWidth: space.heroBorder, borderColor: colors.accent, backgroundColor: colors.panel }}>
        <Label tone="accentText">{[lead, READING_TEXT.label, CLUSTER_NAMES[article.cluster]].filter((x) => x !== undefined).join(' · ')}</Label>
        {/* M17 (design critique): a long title at heading size; a short one keeps the title's. */}
        {article.title.length > LONG_TITLE ? <Heading>{article.title}</Heading> : <Title>{article.title}</Title>}
        <Body tone="ashLight" weight="medium">{`${length} · +${xp} XP`}</Body>
        {power !== undefined && <View style={{ alignSelf: 'flex-start' }}><PowerChip power={power} /></View>}
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
export function ReadingRow({ quest, article, waiting, onOpen, power }: ReadingProps) {
  if (article === null) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.control, borderWidth: space.border, borderColor: colors.divider, backgroundColor: colors.panel }}>
        <Small>{PLAY_TEXT.quest.article}</Small>
      </View>
    );
  }
  return <ReadingLine quest={quest} article={article} waiting={waiting} onOpen={onOpen} {...(power === undefined ? {} : { power })} />;
}

function ReadingLine({ quest, article, waiting, onOpen, power }: ReadingProps & { article: ArticleSummary }) {
  const length = useReadingLength(article);
  return (
    <QuestRow title={article.title} line={`${CLUSTER_NAMES[article.cluster]} · ${length}`} xp={questXp(quest)} waiting={waiting} onOpen={onOpen}
      {...(power === undefined ? {} : { power })} />
  );
}
