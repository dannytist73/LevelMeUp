// Class change (spec §2.5; M6b decision 9): the four classes with their typical day, stats and abilities; at most one
// change every 14 days. Level, XP, stats and achievements stay; abilities follow the class at the player's level.
// Monster Buddy: so does the buddy, and each class names the one it brings.
import { ABILITY_LINES, ABILITY_NAMES, ADJUST_TEXT, BUDDIES, BUDDY_TEXT, CLASS_DAYS, CLASS_NAMES, FEEDBACK_TEXT, classStats, fillText } from '@levelmeup/content';
import { ABILITIES, ABILITY_IDS, CLASSES, classChangeOpensAt } from '@levelmeup/rules';
import type { AbilityId, ClassId } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dateLine } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { radius, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { SaveFailed } from '../ui/SaveFailed.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Bone, Skeleton } from '../ui/Skeleton.tsx';
import { Body, Small } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';
import { TopBar } from '../ui/TopBar.tsx';
import { toast } from '../ui/toast.ts';

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
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [picked, setPicked] = useState<ClassId | null>(null);
  const [busy, setBusy] = useState(false);
  /** Premium pass A7: the phone couldn't save it. */
  const [failed, setFailed] = useState(false);
  /** Premium pass B2: a change that locks for 14 days asks once more. */
  const [sure, setSure] = useState(false);

  if (view === null) {
    return (
      // Premium pass C3: loading looks like loading (it said "The System is preparing your trials."), under the screen's own bar.
      <ScreenScroll contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 20 }}>
        <TopBar title={T.title} onBack={onBack} />
        <Skeleton><Bone height={20} width="70%" /><Bone height={76} round={radius.card} /><Bone height={76} round={radius.card} /></Skeleton>
      </ScreenScroll>
    );
  }
  const current = view.profile.classId;
  const lock = classLock(view, now());
  const choose = async (): Promise<void> => {
    if (picked === null || picked === current || lock !== null || busy) return;
    setBusy(true);
    setFailed(false);
    leave();
    try {
      await enqueue({ type: 'class_change', classId: picked });
    } catch {
      stay();
      setBusy(false);
      setFailed(true);
      return;
    }
    onDone();
    toast(fillText(FEEDBACK_TEXT.classChanged, { class: CLASS_NAMES[picked] })); // premium pass B2
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <TopBar title={T.title} onBack={onBack} />
      <Body>{T.keeps}</Body>
      {lock !== null ? <NarrationBox>{lockLine(lock, view.profile.timeZone)}</NarrationBox> : <Small tone="chalk">{T.once}</Small>}
      <View style={{ gap: 10 }}>
        {CLASS_IDS.map((c) => {
          const [five, ten] = abilitiesOf(c);
          return (
            <OptionCard
              key={c}
              label={c === current ? fillText(T.current, { class: CLASS_NAMES[c] }) : CLASS_NAMES[c]}
              detail={`${classStats(CLASSES[c])}. ${CLASS_DAYS[c]} ${fillText(T.levels, { five: ABILITY_NAMES[five!], ten: ABILITY_NAMES[ten!] })} ${fillText(BUDDY_TEXT.becomes, BUDDIES[c])}.`}
              selected={picked === c}
              disabled={lock !== null || c === current}
              // M17 (UX audit O11): every class stays readable, the current one and while changes are locked too.
              dim={false}
              onPress={() => { setPicked(c); setSure(false); }}
            />
          );
        })}
      </View>
      {picked !== null && abilitiesOf(picked).map((a) => <Small key={a}>{`${ABILITY_NAMES[a]}: ${ABILITY_LINES[a]}`}</Small>)}
      {picked !== null && sure && lock === null ? (
        <View style={{ gap: 10 }}>
          <Small tone="chalk">{fillText(T.sure, { class: CLASS_NAMES[picked], date: dateLine(classChangeOpensAt(now(), now()) ?? now(), view.profile.timeZone) })}</Small>
          <Button label={fillText(T.yes, { class: CLASS_NAMES[picked] })} variant="commitment" disabled={busy} onPress={() => void choose()} />
          <Button label={T.notNow} variant="secondary" disabled={busy} onPress={() => setSure(false)} />
        </View>
      ) : (
        <Button
          label={picked === null ? T.title : fillText(T.confirm, { class: CLASS_NAMES[picked] })}
          variant="commitment"
          disabled={picked === null || lock !== null || busy}
          onPress={() => setSure(true)}
        />
      )}
      <SaveFailed shown={failed} />
    </ScreenScroll>
  );
}
