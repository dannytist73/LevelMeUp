// Class change (spec §2.5; M6b decision 9): the four classes with their typical day, stats and abilities; at most one
// change every 14 days. Level, XP, stats and achievements stay; abilities follow the class at the player's level.
import { ABILITY_LINES, ABILITY_NAMES, ADJUST_TEXT, CLASS_DAYS, CLASS_NAMES, PLAY_TEXT, classStats, fillText } from '@levelmeup/content';
import { ABILITIES, ABILITY_IDS, CLASSES, classChangeOpensAt } from '@levelmeup/rules';
import type { AbilityId, ClassId } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dateLine } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Small, Title } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';

const T = ADJUST_TEXT.classChange;
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

/** A class's abilities, the level 5 one first. */
export const abilitiesOf = (classId: ClassId): AbilityId[] =>
  ABILITY_IDS.filter((a) => ABILITIES[a].classId === classId).sort((a, b) => ABILITIES[a].level - ABILITIES[b].level);

/** When the player's next class change opens, or null; a change still on its way counts as made. */
export function classLock(view: { profile: { classChangedAt: string | null }; changingClass: boolean }, now: number): number | 'pending' | null {
  if (view.changingClass) return 'pending';
  return classChangeOpensAt(view.profile.classChangedAt === null ? null : Date.parse(view.profile.classChangedAt), now);
}

/** The words for a locked class change. */
export function lockLine(lock: number | 'pending', timeZone: string): string {
  return lock === 'pending' ? T.willSync : fillText(T.locked, { date: dateLine(lock, timeZone) });
}

export type ClassChangeProps = { onDone: () => void; onBack: () => void; now?: () => number };

export function ClassChange({ onDone, onBack, now = Date.now }: ClassChangeProps) {
  const insets = useSafeAreaInsets();
  const [view, leave] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [picked, setPicked] = useState<ClassId | null>(null);
  const [busy, setBusy] = useState(false);

  if (view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 20 }}>
        <NarrationBox>The System is preparing your trials.</NarrationBox>
        <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }
  const current = view.profile.classId;
  const lock = classLock(view, now());
  const choose = async (): Promise<void> => {
    if (picked === null || picked === current || lock !== null || busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'class_change', classId: picked });
    } catch {
      setBusy(false);
      return;
    }
    onDone();
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Title>{T.title}</Title>
      <Body>{T.keeps}</Body>
      {lock !== null ? <NarrationBox>{lockLine(lock, view.profile.timeZone)}</NarrationBox> : <Small tone="chalk">{T.once}</Small>}
      <View style={{ gap: 10 }}>
        {CLASS_IDS.map((c) => {
          const [five, ten] = abilitiesOf(c);
          return (
            <OptionCard
              key={c}
              label={c === current ? fillText(T.current, { class: CLASS_NAMES[c] }) : CLASS_NAMES[c]}
              detail={`${classStats(CLASSES[c])}. ${CLASS_DAYS[c]} ${fillText(T.levels, { five: ABILITY_NAMES[five!], ten: ABILITY_NAMES[ten!] })}`}
              selected={picked === c}
              disabled={lock !== null || c === current}
              onPress={() => setPicked(c)}
            />
          );
        })}
      </View>
      {picked !== null && abilitiesOf(picked).map((a) => <Small key={a}>{`${ABILITY_NAMES[a]}: ${ABILITY_LINES[a]}`}</Small>)}
      <Button
        label={picked === null ? T.title : fillText(T.confirm, { class: CLASS_NAMES[picked] })}
        variant="commitment"
        disabled={picked === null || lock !== null || busy}
        onPress={() => void choose()}
      />
    </ScreenScroll>
  );
}
