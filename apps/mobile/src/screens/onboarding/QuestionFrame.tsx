// The frame of the onboarding questions (boards O02–O06): the progress, the System's line, the answers, Continue.
// M12 (board R3-7; audit 7, 8): the chapter it is in, a progress bar that counts the steps this player sees, Back on
// every step after the first, and Continue fixed at the bottom, saying what's still missing.
import { ONBOARDING_TEXT, fillText } from '@levelmeup/content';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHAPTER, stepsFor } from '../../onboarding/flow.ts';
import type { Step } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ProgressSegments } from '../../ui/ProgressSegments.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { Caption, Label } from '../../ui/Text.tsx';
import { TopBar } from '../../ui/TopBar.tsx';

const C = ONBOARDING_TEXT.chapters;

/** Every question screen gets where to go next, and back; the route passes router.push and router.back. */
export type StepProps = { onNavigate: (path: string) => void; onBack?: () => void };

/** "Chapter 2 of 3 · Your body" over the bar of the steps this player sees. */
export function ChapterHead({ step }: { step: Step }) {
  const steps = stepsFor(useGame((s) => s.draft));
  const n = CHAPTER[step];
  return (
    <View style={{ gap: 10 }}>
      <Label tone="accentText" accessibilityRole="header">{fillText(C.label, { n, name: C.names[n] })}</Label>
      <ProgressSegments count={steps.length} current={Math.max(0, steps.indexOf(step))} />
    </View>
  );
}

export function QuestionFrame(props: {
  step: Step; line: string; canContinue: boolean; onContinue: () => void; onBack?: () => void;
  /** Said above Continue while it waits ("5 of 7 left"). */
  left?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <ScreenScroll contentContainerStyle={{ paddingTop: props.onBack === undefined ? insets.top + 20 : 0, paddingBottom: insets.bottom + 120, paddingHorizontal: space.gutter, gap: 24 }}>
        {props.onBack !== undefined && <TopBar onBack={props.onBack} />}
        <ChapterHead step={props.step} />
        <NarrationBox>{props.line}</NarrationBox>
        {props.children}
      </ScreenScroll>
      <View testID="continue-bar" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, gap: 6, paddingTop: 12, paddingHorizontal: space.gutter, paddingBottom: insets.bottom + 12,
        backgroundColor: colors.night, borderTopWidth: 1, borderTopColor: colors.divider,
      }}>
        {!props.canContinue && props.left !== undefined && <Caption style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">{props.left}</Caption>}
        <Button label={C.continue} disabled={!props.canContinue} onPress={props.onContinue} />
      </View>
    </View>
  );
}
