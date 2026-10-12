// A reading read again (M8b decision 7): the article with the takeaway written that day; an article this phone doesn't
// hold is asked for and arrives with the next sync.
import { PLAY_TEXT, READING_TEXT, fillText } from '@levelmeup/content';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dateKeyLabel } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label } from '../ui/Text.tsx';
import { Reader } from './reading/Reader.tsx';
import { openSource } from './reading/openSource.ts';

const R = READING_TEXT;

export function Reading({ articleId, onBack }: { articleId: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const article = useGame((s) => s.articles[articleId] ?? null);
  const fetchArticle = useGame((s) => s.fetchArticle);
  const reading = view?.readings.find((r) => r.id === articleId) ?? null;
  const known = reading !== null || view?.today?.article?.id === articleId;

  useEffect(() => {
    if (article === null && known) fetchArticle(articleId);
  }, [article, known, articleId, fetchArticle]);

  const isToday = view?.today?.article?.id === articleId;
  const label = isToday || reading === null ? R.label : fillText(R.past.label, { date: dateKeyLabel(reading.date) });
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      {article === null ? (
        <NarrationBox>{known ? R.missing : R.gone}</NarrationBox>
      ) : (
        <Reader
          article={article}
          label={label}
          xp={null}
          onOpenSource={openSource}
          footer={(
            <View style={{ gap: 6 }}>
              <Label>{R.yourTakeaway}</Label>
              <Body weight="medium">{reading?.takeaway ?? R.noTakeaway}</Body>
            </View>
          )}
        />
      )}
    </ScreenScroll>
  );
}
