// Level-ups and achievements (spec §2.3, §2.6; M6a decision 8): shown over every screen once the server confirms them,
// one at a time, with speed lines and Continue. A modal, so the screen behind can't be tapped or reached by TalkBack, and
// Back dismisses it (emulator check: a plain overlay let taps through to "Quest cleared").
import { ACHIEVEMENTS, PLAY_TEXT, fillText } from '@levelmeup/content';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { SpeedLines } from '../ui/SpeedLines.tsx';
import { Body, Display, Label, Small, Title } from '../ui/Text.tsx';

const T = PLAY_TEXT.celebration;

export function Celebration() {
  const insets = useSafeAreaInsets();
  const next = useGame((s) => s.celebrations[0] ?? null);
  const dismiss = useGame((s) => s.dismissCelebration);
  if (next === null) return null;

  let body;
  if (next.kind === 'level') {
    body = (
      <>
        <Label tone="ember">{T.levelLabel}</Label>
        <Display>{`LV ${next.level}`}</Display>
        <NarrationBox>{fillText(T.level, { level: next.level })}</NarrationBox>
      </>
    );
  } else {
    const achievement = ACHIEVEMENTS.find((a) => a.id === next.id);
    body = (
      <>
        <Label tone="ember">{T.achievementLabel}</Label>
        <Title style={{ textAlign: 'center' }}>{achievement?.name ?? next.id}</Title>
        {achievement !== undefined && <Body style={{ textAlign: 'center' }}>{achievement.description}</Body>}
        {achievement !== undefined && achievement.title !== null && <Small>{fillText(T.titleEarned, { title: achievement.title })}</Small>}
      </>
    );
  }
  return (
    <Modal testID="celebration" visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.void }}>
        <SpeedLines opacity={0.18} />
        {/* Scrolls, so a long achievement at the largest text size is never cut off (review). */}
        <ScrollView
          testID="celebration-scroll"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.gutter, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, gap: 28 }}
        >
          <View style={{ alignItems: 'center', gap: 16 }}>{body}</View>
          <Button label={T.continue} onPress={dismiss} />
        </ScrollView>
      </View>
    </Modal>
  );
}
