// O05 Rhythm and effort (spec §1.1 beats 5–6, merged on the board): wake and sleep set the day boundary; minutes and
// difficulty set the days. An own-program player at 10 or 15 minutes is told strength quests won't fit (M2 review).
// M6c: and a player at 10 or 15 minutes that workouts need 25.
import { DIFFICULTY_CHOICES, LIBRARY, ONBOARDING_TEXT, boundaryLine } from '@levelmeup/content';
import { MINUTES_OPTIONS, strengthClosed, workoutsFit } from '@levelmeup/rules';
import type { Difficulty } from '@levelmeup/rules';
import { View } from 'react-native';
import { clockLabel } from '../../lib/dates.ts';
import { boundaryOf, complete, draftProfile, gentleStart, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { NightCard } from '../../ui/NightCard.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Label, Small } from '../../ui/Text.tsx';
import { TimeStepper } from '../../ui/TimeStepper.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.rhythm;
const DIFFICULTIES: readonly Difficulty[] = ['gentle', 'steady', 'hard'];

export function RhythmStep({ onNavigate, onBack }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const noStrength = draft.training === 'own' && !gentleStart(draft) && strengthClosed(LIBRARY, draftProfile(draft));
  const noWorkouts = draft.training !== 'own' && !gentleStart(draft) && !workoutsFit(LIBRARY, draftProfile(draft));
  return (
    <QuestionFrame step="rhythm" line={T.line} canContinue={complete(draft, 'rhythm')} onContinue={() => onNavigate(nextPath(draft, 'rhythm'))} onBack={onBack}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <TimeStepper label={T.wake} minutes={draft.wake} onChange={(wake) => editDraft({ wake })} />
        <TimeStepper label={T.sleep} minutes={draft.sleep} onChange={(sleep) => editDraft({ sleep })} />
      </View>
      {draft.sleep !== draft.wake && <Small>{boundaryLine(clockLabel(boundaryOf(draft)))}</Small>}
      <View style={{ gap: 12 }}>
        <Label>{T.minutes}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {MINUTES_OPTIONS.map((minutes) => (
            <View key={minutes} style={{ flexGrow: 1, flexBasis: 64 }}>
              <OptionCard label={String(minutes)} accessibilityLabel={`${minutes} minutes a day`} selected={draft.minutesPerDay === minutes}
                onPress={() => editDraft({ minutesPerDay: minutes })} />
            </View>
          ))}
        </View>
        {noStrength && (
          <NightCard>
            <Small tone="chalk">{T.ownProgram}</Small>
          </NightCard>
        )}
        {noWorkouts && (
          <NightCard>
            <Small tone="chalk">{T.workouts}</Small>
          </NightCard>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.difficulty}</Label>
        {DIFFICULTIES.map((d) => (
          <OptionCard key={d} label={DIFFICULTY_CHOICES[d].name} detail={DIFFICULTY_CHOICES[d].line} selected={draft.difficulty === d}
            onPress={() => editDraft({ difficulty: d })} />
        ))}
      </View>
      <Small>{T.note}</Small>
    </QuestionFrame>
  );
}
