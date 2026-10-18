// Settings → Your data and privacy (M9b decision 6): what LevelMeUp keeps, where, and who sees it, in PRIVACY_TEXT's
// words (packages/content), each line checked against what the app and the server do.
import { PRIVACY_TEXT } from '@levelmeup/content';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../theme/tokens.ts';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';

export function Privacy({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <TopBar title={PRIVACY_TEXT.title} onBack={onBack} />
      <Body>{PRIVACY_TEXT.intro}</Body>
      {PRIVACY_TEXT.sections.map((section) => (
        <View key={section.title} style={{ gap: 8 }}>
          <SectionTitle title={section.title} />
          {section.lines.map((line) => <Body key={line}>{line}</Body>)}
        </View>
      ))}
    </ScreenScroll>
  );
}
