// Settings → Your data and privacy (M9b decision 6): what LevelMeUp keeps, where, and who sees it, in PRIVACY_TEXT's
// words (packages/content), each line checked against what the app and the server do.
import { PRIVACY_TEXT } from '@levelmeup/content';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme/tokens.ts';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Label, Title } from '../ui/Text.tsx';

export function Privacy({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 2, borderColor: colors.chalk }}
        >
          <Label tone="chalk">Back</Label>
        </Pressable>
        <Title>{PRIVACY_TEXT.title}</Title>
      </View>
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
