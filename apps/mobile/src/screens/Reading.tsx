// A reading read again (M8b decision 7): the article with the takeaway written that day; an article this phone doesn't
// hold is asked for and arrives with the next sync. M11: it opens on its Story Deck when it has one, with the line written
// that day on the Your turn card; the full article stays one tap away. One held from before its deck existed is asked
// for again (once a launch), so it gets its cards (review).
import { READING_TEXT, fillText } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dateKeyLabel } from '../lib/dates.ts';
import { isKept } from '../reading/codex.ts';
import { asDeck, hasCurrentDeck } from '../reading/deck.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label } from '../ui/Text.tsx';
import { Deck } from './reading/Deck.tsx';
import { Reader } from './reading/Reader.tsx';
import { openSource } from './reading/openSource.ts';
import { TopBar } from '../ui/TopBar.tsx';

const R = READING_TEXT;

export function Reading({ articleId, dayNumber = null, onBack, now = Date.now }: { articleId: string; dayNumber?: number | null; onBack: () => void; now?: () => number }) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const article = useGame((s) => s.articles[articleId] ?? null);
  const fetchArticle = useGame((s) => s.fetchArticle);
  const codex = useGame((s) => s.codex);
  const toggleKeep = useGame((s) => s.toggleKeep);
  const [fullArticle, setFullArticle] = useState(false);
  /** M11: the card the deck was left on, for "Back to the cards" (review). */
  const [deckStep, setDeckStep] = useState(0);
  // The day it was read on: the one named, else today's when it is today's reading (Read again).
  const todayNumber = view?.today?.article?.id === articleId ? view.today.dayNumber : null;
  const day = dayNumber ?? todayNumber;
  const reading = view?.readings.find((r) => r.id === articleId && (day === null || r.dayNumber === day)) ?? null;
  // M12: a lesson kept in the Codex opens its reading, however old (review): the phone asks for it.
  const known = reading !== null || todayNumber !== null || codex.some((e) => e.articleId === articleId);
  const deck = article === null ? null : asDeck(article.deck);
  const hasDeck = deck !== null;
  // Held without its story lesson as the server now makes it (its cards' pictures, 2026-10-26): asked for once more.
  const current = article !== null && hasCurrentDeck(article.deck);

  useEffect(() => {
    if (known && !current) fetchArticle(articleId);
  }, [current, known, articleId, fetchArticle]);

  const isToday = day !== null && day === todayNumber;
  const label = isToday || reading === null ? R.label : fillText(R.past.label, { date: dateKeyLabel(reading.date) });
  const takeaway = (
    <View style={{ gap: 6 }}>
      <Label>{hasDeck ? R.deck.yourLine : R.yourTakeaway}</Label>
      <Body weight="medium">{reading?.takeaway ?? R.noTakeaway}</Body>
    </View>
  );
  if (article !== null && deck !== null && !fullArticle) {
    return (
      <Deck
        article={{ ...article, deck }}
        label={label}
        xp={null}
        turn={(
          <View style={{ gap: 16 }}>
            {takeaway}
            <Button label={R.deck.done} variant="secondary" onPress={onBack} />
          </View>
        )}
        onClose={onBack}
        onFullArticle={() => setFullArticle(true)}
        initialStep={deckStep}
        buddy={view === null ? undefined : { classId: view.profile.classId, level: view.character.level }}
        onStep={setDeckStep}
        kept={isKept(codex, article.id)}
        onKeep={() => void toggleKeep({ articleId: article.id, title: article.title, lesson: deck.lesson, keptAt: now() })}
      />
    );
  }
  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <TopBar onBack={onBack} />
      {deck !== null
        ? <Button label={R.deck.backToCards} variant="secondary" onPress={() => setFullArticle(false)} style={{ alignSelf: 'flex-start' }} />
        : null}
      {article === null ? (
        <NarrationBox>{known ? R.missing : R.gone}</NarrationBox>
      ) : (
        <Reader article={article} label={label} xp={null} onOpenSource={openSource} footer={takeaway} />
      )}
    </ScreenScroll>
  );
}
