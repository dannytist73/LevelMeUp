// The Codex (M11 decision 7): the lessons a player kept from their Story Decks, newest first, each with the reading it
// came from. On this phone only; a lesson can be taken out here or on its deck's lesson card.
import { PLAY_TEXT, READING_TEXT, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { LinkButton } from '../ui/LinkButton.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Caption, Heading, Small, Title } from '../ui/Text.tsx';

const C = READING_TEXT.codex;

export function Codex({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const codex = useGame((s) => s.codex);
  const toggleKeep = useGame((s) => s.toggleKeep);
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <View style={{ gap: 4 }}>
        <Title>{C.title}</Title>
        <Small>{codex.length === 0 ? C.empty : `${C.line} ${fillText(C.count, { n: codex.length })}`}</Small>
      </View>
      {codex.map((entry) => (
        <NightCard key={entry.articleId}>
          <Heading>{entry.lesson}</Heading>
          <Caption>{entry.title}</Caption>
          <LinkButton label={C.remove} accessibilityLabel={fillText(C.removeLabel, { lesson: entry.lesson })} onPress={() => void toggleKeep(entry)} />
        </NightCard>
      ))}
    </ScreenScroll>
  );
}
