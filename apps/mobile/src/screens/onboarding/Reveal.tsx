// O08 Character reveal (spec §1.1 beat 9, §4.2): the rules' character in the System's words, the stats labelled game
// estimates. "Change class" and "Fix an assumption" run the analysis again (the server allows it until the first
// action). M9a: the class portrait (Monster Week: its emblem alone; the paintings and Switch portrait are gone). M10a:
// the lines burst once and the class panel slams in. M12 (plan decision 7): the slip question and the Pact moved to day
// 2's card; Accept ends the onboarding. Monster Buddy: the class hatches its buddy here, in the portrait, named under it,
// and each class to choose from says which buddy it brings.
// M17 (UX audit 2026-10-20, O2): Accept stays in a bar at the bottom (it sat about 1,400 dp down, under the stats and the
// routine); Change class and Fix an assumption sit together under the System's words; the portrait is a little smaller.
import { BUDDIES, BUDDY_TEXT, CLASS_DAYS, CLASS_NAMES, ONBOARDING_TEXT, STAT_NAMES, classStats, fillText, routineLine } from '@levelmeup/content';
import { CLASSES, STATS } from '@levelmeup/rules';
import type { ClassId } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buddySizeName } from '../../game/buddy.ts';
import { STEP_PATH, asksMind } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { BottomBarFrame } from '../../ui/BottomBar.tsx';
import { Button } from '../../ui/Button.tsx';
import { ScreenHeader } from '../../ui/ScreenHeader.tsx';
import { MOMENTS } from '../../ui/motion.ts';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Portrait } from '../../ui/Portrait.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SlamIn } from '../../ui/SlamIn.tsx';
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
  const className = CLASS_NAMES[profile.classId];
  const buddy = BUDDIES[profile.classId];

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
  ];

  let body;
  if (mode === 'class') {
    body = (
      <View style={{ gap: 12 }}>
        <Heading>{T.pickClass}</Heading>
        {CLASS_IDS.map((c) => (
          <OptionCard key={c} label={CLASS_NAMES[c]} selected={c === profile.classId}
            detail={`${classStats(CLASSES[c])}. ${CLASS_DAYS[c]} ${fillText(BUDDY_TEXT.becomes, BUDDIES[c])}.`}
            onPress={() => void changeClass(c)} />
        ))}
        <Button label={T.back} variant="secondary" onPress={() => setMode('reveal')} />
      </View>
    );
  } else if (mode === 'fix') {
    body = (
      <View style={{ gap: 12 }}>
        <Heading>{T.fixWhat}</Heading>
        {fixes.map(([label, path]) => (
          <Button
            key={path}
            label={label}
            variant="secondary"
            onPress={() => {
              setMode('reveal'); // the analysis returns to this same screen, to show the new reveal (emulator, M5)
              onFix(path);
            }}
          />
        ))}
        <Button label={T.back} variant="secondary" onPress={() => setMode('reveal')} />
      </View>
    );
  } else {
    body = (
      <>
        <SlamIn delay={MOMENTS.reveal.panel}>
          <View style={{ gap: 4 }}>
            <Label>{T.classLabel}</Label>
            <Display>{CLASS_NAMES[profile.classId]}</Display>
            <Label tone="chalk">{classStats(CLASSES[profile.classId])}</Label>
          </View>
        </SlamIn>
        <Portrait classId={profile.classId} level={character.level} maxWidth={210}
          label={fillText(BUDDY_TEXT.label, { name: buddy.name, className, size: buddySizeName(character.level), level: character.level })} />
        <View style={{ gap: 4, alignItems: 'center' }}>
          <Title style={{ textAlign: 'center' }}>{fillText(BUDDY_TEXT.hatched, buddy)}</Title>
          <Body style={{ textAlign: 'center' }}>{fillText(BUDDY_TEXT.hatchedLine, { className, kind: buddy.kind })}</Body>
        </View>
        <NarrationBox>{busy ? T.rewriting : reveal.narrative}</NarrationBox>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button label={T.change} variant="secondary" disabled={busy} onPress={() => setMode('class')} style={{ flexGrow: 1 }} />
          <Button label={T.fix} variant="secondary" disabled={busy} onPress={() => setMode('fix')} style={{ flexGrow: 1 }} />
        </View>
        {failure !== null && (
          <View accessibilityLiveRegion="polite">
            <Small tone="chalk">
              {failure === 'network' ? ONBOARDING_TEXT.analysis.offline : failure === 'update_required' ? ONBOARDING_TEXT.analysis.update
                : failure === 'locked' ? ONBOARDING_TEXT.analysis.locked : ONBOARDING_TEXT.analysis.failed}
            </Small>
          </View>
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
              <Label tone="accentText">{character.stats[stat].rank}</Label>
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
          <Body>{routineLine({ stats: CLASSES[profile.classId], minutesPerDay: profile.minutesPerDay, difficulty: profile.difficulty, gentleStart: profile.gentleStart })}</Body>
        </View>
      </>
    );
  }

  const accepting = mode === 'reveal';
  const page = (barSpace: number) => (
    <ScreenScroll contentContainerStyle={{ paddingBottom: accepting ? barSpace + 24 : insets.bottom + 32 }}>
      <ScreenHeader style={{ paddingTop: insets.top + 22 }}>
        <SpeedLines burst />
        <Label tone="accentText">{T.title}</Label>
        <Title accessibilityRole="header">{profile.name}</Title>
      </ScreenHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>{body}</View>
    </ScreenScroll>
  );
  return accepting
    ? <BottomBarFrame testID="accept-bar" bar={<Button label={T.accept} variant="commitment" disabled={busy} onPress={onAccept} />}>{page}</BottomBarFrame>
    : page(0);
}
