// The frame of the onboarding questions (boards O02–O06): progress bars, the System's line, the answers, Continue.
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stepsFor } from '../../onboarding/flow.ts';
import type { Step } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ProgressSegments } from '../../ui/ProgressSegments.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';

/** Every question screen gets where to go next; the route passes router.push. */
export type StepProps = { onNavigate: (path: string) => void };

export function QuestionFrame(props: { step: Step; line: string; canContinue: boolean; onContinue: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const steps = stepsFor(useGame((s) => s.draft));
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <ProgressSegments count={steps.length} current={Math.max(0, steps.indexOf(props.step))} />
      <NarrationBox>{props.line}</NarrationBox>
      {props.children}
      <Button label="Continue" disabled={!props.canContinue} onPress={props.onContinue} />
    </ScreenScroll>
  );
}
