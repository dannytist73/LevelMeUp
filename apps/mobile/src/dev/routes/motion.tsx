// Developer screen (development builds only; M10a plan decision 7): the motion bench. Every piece replays on demand,
// with a switch that forces reduced motion on the pieces. The moments open as the player sees them: Quest cleared here,
// the level-up and the achievement in the real modal. Those follow the phone's own "Remove animations"; restart the app
// after changing it, since Reanimated reads it at launch. M10b: a Haptics section (each feel, a hold button) and a way to the
// living Shadow.
import { ACHIEVEMENTS } from '@levelmeup/content';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ClearedNumbers } from '../../quest/cleared.ts';
import { Cleared } from '../../screens/quest/Cleared.tsx';
import { useGame, useGameStore } from '../../state/store.ts';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { FadeIn } from '../../ui/FadeIn.tsx';
import { FEELS, buzz } from '../../ui/haptics.ts';
import type { Feel } from '../../ui/haptics.ts';
import { HoldButton } from '../../ui/HoldButton.tsx';
import { InkBurst } from '../../ui/InkBurst.tsx';
import { countPlan } from '../../ui/motion.ts';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SectionTitle } from '../../ui/SectionTitle.tsx';
import { SlamIn } from '../../ui/SlamIn.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { MarkStamp, XpStamp } from '../../ui/Stamp.tsx';
import { Body, Caption, Heading, Small, Title } from '../../ui/Text.tsx';
import { Thud } from '../../ui/Thud.tsx';
import { useCountUp } from '../../ui/useMotion.ts';
import { XpBar } from '../../ui/XpBar.tsx';

const SAMPLE: ClearedNumbers = {
  xp: 20, statUps: [{ stat: 'strength', from: 11, to: 12, rank: 'D' }], discipline: true, streak: { from: 9, to: 10 },
  level: { level: 6, xpIntoLevel: 87, xpForLevel: 130 }, levelBefore: { level: 6, xpIntoLevel: 67, xpForLevel: 130 }, recovered: false,
};
const LEVELLED: ClearedNumbers = {
  ...SAMPLE, level: { level: 7, xpIntoLevel: 7, xpForLevel: 150 }, levelBefore: { level: 6, xpIntoLevel: 117, xpForLevel: 130 },
};

function Counted({ reduce }: { reduce: boolean }) {
  const n = useCountUp(countPlan({ level: 6, value: 40, max: 130 }, { level: 6, value: 87, max: 130 }, 0), 87, reduce);
  return <Caption>{`${n} / 130 XP`}</Caption>;
}

export default function MotionBench() {
  const insets = useSafeAreaInsets();
  const store = useGameStore();
  const haptics = useGame((s) => s.haptics);
  const [replay, setReplay] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [cleared, setCleared] = useState<ClearedNumbers | null>(null);
  const again = () => setReplay((n) => n + 1);

  if (cleared !== null) {
    return (
      <View key={replay} style={{ flex: 1, backgroundColor: colors.night }}>
        <Cleared heading="CORE QUEST · KNEE PUSH-UPS" line="3 sets of 8" numbers={cleared} rating={null} dayOpen waiting={false}
          onRate={() => {}} onUndo={again} onContinue={() => setCleared(null)} canStepDown={false} onStepDown={() => {}} onPain={null} />
      </View>
    );
  }
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
      <Title>Motion</Title>
      <Small>Motion bench: replay each piece and moment. In Quest cleared, Undo replays it and Continue comes back here.</Small>
      <Button label="Replay" onPress={again} />
      <Button
        label={reduce ? 'Reduced motion: on (the pieces)' : 'Reduced motion: off'}
        variant="secondary"
        onPress={() => {
          setReduce(!reduce);
          again();
        }}
      />

      <SectionTitle title="Pieces" />
      <View key={replay} style={{ gap: 28 }}>
        <SlamIn reduceMotion={reduce}><NarrationBox>SlamIn: 180 ms.</NarrationBox></SlamIn>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', minHeight: 130 }}>
          <Thud reduceMotion={reduce}><XpStamp xp={20} /></Thud>
          <InkBurst reduceMotion={reduce}>
            <Thud reduceMotion={reduce}><XpStamp xp={30} size={86} rotate={12} /></Thud>
          </InkBurst>
          <Thud reduceMotion={reduce}><MarkStamp text="Sworn" /></Thud>
        </View>
        <View style={{ height: 160, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.line }}>
          <SpeedLines burst opacity={0.18} reduceMotion={reduce} />
          <Heading>Speed lines</Heading>
        </View>
        <View style={{ gap: 8 }}>
          <XpBar value={87} max={130} level={6} from={{ level: 6, value: 40, max: 130 }} reduceMotion={reduce} label="Fill" />
          <Counted reduce={reduce} />
          <XpBar value={30} max={150} level={7} from={{ level: 6, value: 117, max: 130 }} reduceMotion={reduce} label="Wrap" />
        </View>
        <FadeIn rise reduceMotion={reduce}><Body>FadeIn, rising 12 px.</Body></FadeIn>
      </View>

      <SectionTitle title="Moments" />
      <Button label="Quest cleared" variant="secondary" onPress={() => setCleared(SAMPLE)} />
      <Button label="Quest cleared, with a level-up" variant="secondary" onPress={() => setCleared(LEVELLED)} />
      <Button label="Level up to 5" variant="secondary" onPress={() => store.setState({ celebrations: [{ kind: 'level', level: 5, from: 4 }] })} />
      <Button label="An achievement" variant="secondary" onPress={() => store.setState({ celebrations: [{ kind: 'achievement', id: ACHIEVEMENTS[0]!.id }] })} />

      <SectionTitle title="Haptics" />
      <Small>
        {haptics
          ? 'Each button plays its feel; a development build logs it as [haptic] and the feel (adb logcat -s ReactNativeJS).'
          : 'Haptics are off in Settings → Game, so these stay quiet.'}
      </Small>
      {(Object.keys(FEELS) as Feel[]).map((feel) => (
        <Button key={feel} label={`Feel: ${feel}`} variant="secondary" onPress={() => buzz(feel)} />
      ))}
      <HoldButton label="Hold to feel" tapLabel="Tap to feel" confirmLabel="Feel the sworn click" onDone={() => {}} />
      <Button label="The living Shadow (Shadow preview)" variant="secondary" onPress={() => router.push('/dev/shadow')} />
    </ScreenScroll>
  );
}
