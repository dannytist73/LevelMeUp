// O08 Character reveal (spec §1.1 beat 9, §4.2): the rules' character in the System's words, the stats labelled game
// estimates. "Change class" and "Fix an assumption" run the analysis again (the server allows it until the first
// action); the class portrait waits for M9's art (M5 plan, decision 15).
import {
  CLASS_DAYS, CLASS_NAMES, ONBOARDING_TEXT, SLIP_SUGGESTIONS, STAT_NAMES, classStats, routineLine,
} from '@levelmeup/content';
import { CLASSES, STATS } from '@levelmeup/rules';
import type { ClassId } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STEP_PATH, asksMind } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { HalftoneHeader } from '../../ui/HalftoneHeader.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { Body, Caption, Display, Heading, Label, Small, Title } from '../../ui/Text.tsx';

const T = ONBOARDING_TEXT.reveal;
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export function Reveal({ onAccept, onFix }: { onAccept: () => void; onFix: (path: string) => void }) {
  const insets = useSafeAreaInsets();
  const reveal = useGame((s) => s.reveal);
  const view = useGame((s) => s.view);
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const startCharacter = useGame((s) => s.startCharacter);
  const [mode, setMode] = useState<'reveal' | 'class' | 'fix'>('reveal');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (reveal === null || view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 24 }}>
        <NarrationBox>{T.missing}</NarrationBox>
        <Button label={T.accept} variant="commitment" onPress={onAccept} />
      </ScreenScroll>
    );
  }
  const { profile, character } = view;

  const changeClass = async (classId: ClassId) => {
    setMode('reveal');
    if (classId === profile.classId) return;
    editDraft({ classId });
    setBusy(true);
    setFailure(null);
    const result = await startCharacter();
    setBusy(false);
    if (!result.ok) setFailure(result.code);
  };

  const fixes: (readonly [string, string])[] = [
    [T.fixGoals, STEP_PATH.goals],
    [T.fixBody, STEP_PATH.body],
    ...(asksMind(draft) ? [[T.fixMind, STEP_PATH.mind] as const] : []),
    [T.fixRhythm, STEP_PATH.rhythm],
    [T.fixSlip, STEP_PATH.slip],
  ];

  let body;
  if (mode === 'class') {
    body = (
      <View style={{ gap: 12 }}>
        <Heading>{T.pickClass}</Heading>
        {CLASS_IDS.map((c) => (
          <OptionCard key={c} label={CLASS_NAMES[c]} detail={`${classStats(c)}. ${CLASS_DAYS[c]}`} selected={c === profile.classId}
            onPress={() => void changeClass(c)} />
        ))}
        <Button label={T.back} variant="secondary" onPress={() => setMode('reveal')} />
      </View>
    );
  } else if (mode === 'fix') {
    body = (
      <View style={{ gap: 12 }}>
        <Heading>{T.fixWhat}</Heading>
        {fixes.map(([label, path]) => <Button key={path} label={label} variant="secondary" onPress={() => onFix(path)} />)}
        <Button label={T.back} variant="secondary" onPress={() => setMode('reveal')} />
      </View>
    );
  } else {
    body = (
      <>
        <View style={{ gap: 4 }}>
          <Label>{T.classLabel}</Label>
          <Display>{CLASS_NAMES[profile.classId].toUpperCase()}</Display>
          <Label tone="chalk">{classStats(profile.classId)}</Label>
        </View>
        <NarrationBox>{busy ? T.rewriting : reveal.narrative}</NarrationBox>
        {failure !== null && (
          <Small tone="chalk">{failure === 'network' ? ONBOARDING_TEXT.analysis.offline : ONBOARDING_TEXT.analysis.failed}</Small>
        )}
        <NightCard>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
            <Label tone="chalk">{T.stats}</Label>
            <Caption>{T.estimates}</Caption>
          </View>
          {STATS.map((stat) => (
            <View key={stat} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Label tone="chalk" style={{ flex: 1 }}>{STAT_NAMES[stat]}</Label>
              <Heading>{String(character.stats[stat].points)}</Heading>
              <Label tone="ember">{character.stats[stat].rank}</Label>
            </View>
          ))}
          <Small>{T.statsNote}</Small>
        </NightCard>
        <View style={{ gap: 6 }}>
          <Label>{T.strength}</Label>
          {reveal.strengths.map((line, i) => <Body key={i}>{line}</Body>)}
        </View>
        <View style={{ gap: 6 }}>
          <Label>{T.growth}</Label>
          {reveal.growth.map((line, i) => <Body key={i}>{line}</Body>)}
        </View>
        <View style={{ gap: 6 }}>
          <Label>{T.routine}</Label>
          <Body>{routineLine({ classId: profile.classId, minutesPerDay: profile.minutesPerDay, difficulty: profile.difficulty, gentleStart: profile.gentleStart })}</Body>
        </View>
        {draft.slip !== null && (
          <NightCard>
            <Small tone="chalk">{SLIP_SUGGESTIONS[draft.slip]}</Small>
          </NightCard>
        )}
        <Button label={T.accept} variant="commitment" disabled={busy} onPress={onAccept} />
        <Button label={T.change} variant="secondary" disabled={busy} onPress={() => setMode('class')} />
        <Button label={T.fix} variant="secondary" disabled={busy} onPress={() => setMode('fix')} />
      </>
    );
  }

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
        <SpeedLines />
        <Label tone="ember">{T.title}</Label>
        <Title>{profile.name}</Title>
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>{body}</View>
    </ScreenScroll>
  );
}
