// Today's reading on Today (board D1; M8b decision 5): the article's title, "6 min · Wisdom +10 XP · one takeaway" and
// Read; "Cleared +10" once claimed; the waiting line while the day has no article. M10c: once claimed it is a slim, quiet
// card, with Read again as a link (cleared things stay quiet).
import { PLAY_TEXT, READING_TEXT, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import type { ArticleSummary, QuestView } from '../../game/types.ts';
import { Button } from '../../ui/Button.tsx';
import { LinkButton } from '../../ui/LinkButton.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { Body, Caption, Heading, Label, Small } from '../../ui/Text.tsx';
import { questXp } from '../QuestCard.tsx';

export function ReadingCard({ quest, article, waiting, onOpen }: { quest: QuestView; article: ArticleSummary | null; waiting: boolean; onOpen: () => void }) {
  const xp = questXp(quest);
  if (article === null) {
    return (
      <NightCard quiet>
        <Small>{PLAY_TEXT.quest.article}</Small>
      </NightCard>
    );
  }
  const cleared = quest.completedAt !== null;
  if (cleared) {
    return (
      <NightCard quiet>
        <View style={{ gap: 4 }}>
          <Body weight="bold" tone="ashLight">{article.title}</Body>
          <Label tone="ember">{fillText(READING_TEXT.cleared, { xp })}</Label>
          {waiting && <Caption>{PLAY_TEXT.quest.willSync}</Caption>}
        </View>
        <LinkButton label={READING_TEXT.readAgain} onPress={onOpen} />
      </NightCard>
    );
  }
  return (
    <NightCard>
      <View style={{ gap: 6 }}>
        <Heading>{article.title}</Heading>
        <Small>{fillText(READING_TEXT.cardMeta, { minutes: article.minutes, xp })}</Small>
        {waiting && <Caption>{PLAY_TEXT.quest.willSync}</Caption>}
      </View>
      <Button label={READING_TEXT.read} onPress={onOpen} />
    </NightCard>
  );
}
