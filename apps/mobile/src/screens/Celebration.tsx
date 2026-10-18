// Level-ups and achievements (spec §2.3, §2.6; M6a decision 8): shown over every screen once the server confirms them,
// one at a time, with speed lines and Continue. A modal, so the screen behind can't be tapped or reached by TalkBack, and
// Back dismisses it (emulator check: a plain overlay let taps through to "Quest cleared"). M9a: at levels 5 and 10 the new
// portrait (decision 8). M10a: each moves (spec decision 4) and is keyed, so the next one plays afresh (plan decision 6).
// M10b: the double click as "LV n" lands, the firm click as an achievement's name lands.
import { ACHIEVEMENTS, CHARACTER_TEXT, CLASS_NAMES, PLAY_TEXT, fillText } from '@levelmeup/content';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { figureFor, portraitChanges } from '../art/portraits.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { FadeIn } from '../ui/FadeIn.tsx';
import { InkBurst } from '../ui/InkBurst.tsx';
import { MOMENTS } from '../ui/motion.ts';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { Portrait } from '../ui/Portrait.tsx';
import { SlamIn } from '../ui/SlamIn.tsx';
import { SpeedLines } from '../ui/SpeedLines.tsx';
import { Body, Display, Label, Small, Title } from '../ui/Text.tsx';
import { Thud } from '../ui/Thud.tsx';

const T = PLAY_TEXT.celebration;

export function Celebration() {
  const insets = useSafeAreaInsets();
  const next = useGame((s) => s.celebrations[0] ?? null);
  const dismiss = useGame((s) => s.dismissCelebration);
  const view = useGame((s) => s.view);
  const chosen = useGame((s) => s.portrait);
  if (next === null) return null;

  let body;
  if (next.kind === 'level') {
    const shown = view !== null && portraitChanges(next.from, next.level) ? view.profile : null;
    const M = MOMENTS.level;
    body = (
      <>
        <SlamIn delay={M.label}><Label tone="accentText">{T.levelLabel}</Label></SlamIn>
        <InkBurst count={16} radius={120} delay={M.number}>
          <Thud delay={M.number} haptic="level" sound="level" testID="level-thud"><Display>{`Lv ${next.level}`}</Display></Thud>
        </InkBurst>
        {shown !== null && (
          <FadeIn rise delay={M.portrait}>
            <Portrait classId={shown.classId} level={next.level} figure={figureFor(chosen, shown.programStyle)}
              label={fillText(CHARACTER_TEXT.portrait, { className: CLASS_NAMES[shown.classId], level: next.level })} />
          </FadeIn>
        )}
        <SlamIn delay={M.line}><NarrationBox>{fillText(T.level, { level: next.level })}</NarrationBox></SlamIn>
        {shown !== null && <FadeIn delay={M.line}><Small>{T.portrait}</Small></FadeIn>}
      </>
    );
  } else {
    const achievement = ACHIEVEMENTS.find((a) => a.id === next.id);
    const M = MOMENTS.achievement;
    body = (
      <>
        <SlamIn><Label tone="accentText">{T.achievementLabel}</Label></SlamIn>
        <Thud delay={M.name} haptic="stamp" sound="achievement" testID="achievement-thud"><Title style={{ textAlign: 'center' }}>{achievement?.name ?? next.id}</Title></Thud>
        {achievement !== undefined && <FadeIn delay={M.rest}><Body style={{ textAlign: 'center' }}>{achievement.description}</Body></FadeIn>}
        {achievement !== undefined && achievement.title !== null && <FadeIn delay={M.rest}><Small>{fillText(T.titleEarned, { title: achievement.title })}</Small></FadeIn>}
      </>
    );
  }
  return (
    <Modal testID="celebration" visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}>
      <View key={next.kind === 'level' ? `level-${next.level}` : `achievement-${next.id}`} style={{ flex: 1, backgroundColor: colors.void }}>
        <SpeedLines opacity={0.18} burst={next.kind === 'level'} />
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
