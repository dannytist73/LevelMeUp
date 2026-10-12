// Developer screen: the reader with a sample article (M8b decision 10), so the layout and the fonts can be checked before
// the owner publishes real articles. Its claim does nothing.
import { READING_TEXT, fillText } from '@levelmeup/content';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SAMPLE_ARTICLE } from '../../src/dev/sampleArticle.ts';
import { SentenceLog } from '../../src/screens/quest/SentenceLog.tsx';
import { Reader } from '../../src/screens/reading/Reader.tsx';
import { openSource } from '../../src/screens/reading/openSource.ts';
import { space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { ScreenScroll } from '../../src/ui/ScreenScroll.tsx';

export default function ReaderSample() {
  const insets = useSafeAreaInsets();
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
      <Reader
        article={SAMPLE_ARTICLE}
        label={READING_TEXT.label}
        xp={10}
        onOpenSource={openSource}
        footer={<SentenceLog disabled={false} label={READING_TEXT.takeawayLabel} note={READING_TEXT.takeawayNote} claimLabel={fillText(READING_TEXT.claim, { xp: 10 })} onClaim={() => {}} />}
      />
    </ScreenScroll>
  );
}
