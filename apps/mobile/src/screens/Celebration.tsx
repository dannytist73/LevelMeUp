// Level-ups and achievements (spec §2.3, §2.6; M6a decision 8): shown over every screen once the server confirms them,
// one at a time, with speed lines and Continue.
import { ACHIEVEMENTS, PLAY_TEXT, fillText } from '@levelmeup/content';
import { StyleSheet, View } from 'react-native';
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
    <View
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.void, justifyContent: 'center', paddingHorizontal: space.gutter, paddingTop: insets.top, paddingBottom: insets.bottom + 24, gap: 28 },
      ]}
    >
      <SpeedLines opacity={0.18} />
      <View style={{ alignItems: 'center', gap: 16 }}>{body}</View>
      <Button label={T.continue} onPress={dismiss} />
    </View>
  );
}
