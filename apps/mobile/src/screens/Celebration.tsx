// Level-ups and achievements (spec §2.3, §2.6; M6a decision 8): shown over every screen once the server confirms them,
// one at a time, with speed lines and Continue. A modal, so the screen behind can't be tapped or reached by TalkBack, and
// Back dismisses it (emulator check: a plain overlay let taps through to "Quest cleared"). M9a's new portrait at levels 5
// and 10 went with its paintings (Monster Week). M10a: each moves (spec decision 4) and is keyed, so the next one plays
// afresh (plan decision 6). Monster Buddy: at levels 5 and 10 your buddy grows here, cheering.
// M10b: the double click as "LV n" lands, the firm click as an achievement's name lands.
import { ABILITY_LINES, ABILITY_NAMES, ACHIEVEMENTS, BUDDIES, BUDDY_TEXT, CLASS_NAMES, PLAY_TEXT, fillText } from '@levelmeup/content';
import { ABILITIES, ABILITY_IDS } from '@levelmeup/rules';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buddyGrows, buddySizeName } from '../game/buddy.ts';
import { useGame } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { BuddyArt } from '../ui/BuddyArt.tsx';
import { Button } from '../ui/Button.tsx';
import { FadeIn } from '../ui/FadeIn.tsx';
import { InkBurst } from '../ui/InkBurst.tsx';
import { MOMENTS } from '../ui/motion.ts';
import { NarrationBox } from '../ui/NarrationBox.tsx';
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
  if (next === null) return null;

  let body;
  if (next.kind === 'level') {
    // M17: the class abilities this level brings (levels 5 and 10), named with what they do: the reward to use.
    const unlocked = view === null ? [] : ABILITY_IDS.filter((a) =>
      ABILITIES[a].classId === view.profile.classId && ABILITIES[a].level > next.from && ABILITIES[a].level <= next.level);
    const M = MOMENTS.level;
    const classId = view?.profile.classId;
    const buddy = classId === undefined ? undefined : BUDDIES[classId];
    const size = buddySizeName(next.level);
    body = (
      <>
        <SlamIn delay={M.label}><Label tone="accentText">{T.levelLabel}</Label></SlamIn>
        <InkBurst count={16} radius={120} delay={M.number}>
          <Thud delay={M.number} haptic="level" sound="level" testID="level-thud"><Display>{`Lv ${next.level}`}</Display></Thud>
        </InkBurst>
        {classId !== undefined && buddy !== undefined && buddyGrows(next.from, next.level) && (
          <FadeIn rise delay={M.line}>
            <View testID="buddy-grew" style={{ alignItems: 'center', gap: 6 }}>
              <BuddyArt classId={classId} level={next.level} size={200} pose="happy"
                accessibilityLabel={fillText(BUDDY_TEXT.label, { name: buddy.name, className: CLASS_NAMES[classId], size, level: next.level })} />
              <Title style={{ textAlign: 'center' }}>{fillText(BUDDY_TEXT.grew, buddy)}</Title>
              <Body style={{ textAlign: 'center' }}>{fillText(BUDDY_TEXT.grewLine, { level: next.level, name: buddy.name, size })}</Body>
            </View>
          </FadeIn>
        )}
        <SlamIn delay={M.line} style={{ alignSelf: 'stretch' }}><NarrationBox>{fillText(T.level, { level: next.level })}</NarrationBox></SlamIn>
        {unlocked.map((a) => (
          <FadeIn key={a} rise delay={M.line}>
            <View accessible style={{ gap: 4, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.control, borderWidth: space.border, borderColor: colors.line, backgroundColor: colors.panel }}>
              <Label tone="accentText">{fillText(T.ability, { name: ABILITY_NAMES[a] })}</Label>
              <Small tone="chalk">{ABILITY_LINES[a]}</Small>
            </View>
          </FadeIn>
        ))}
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
