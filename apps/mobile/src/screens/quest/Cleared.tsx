// "Quest cleared" (board D2; spec §2, §3.3; M6a decisions 5–7): the XP stamp, what went up, what today now counts for,
// the XP bar, an optional rating, Continue, and Undo while the day is open. M6b: after "Too hard", the offer to step the
// exercise down a rung; "I felt pain" stays reachable. M10a: the moment moves (spec decision 4): the lines burst, the title
// slams in, the XP stamp thuds in a splash of ink, the panel slams in and its rank stamps thud, then the bar fills from
// where it was while the level line counts up. Reopened later (no before), it shows still (the owner, 2026-10-14).
// M10b: a firm click as the XP stamp lands, one tick for the rank stamps (spec decision 2).
import { ADJUST_TEXT, PLAY_TEXT, READING_TEXT, STAT_NAMES, fillText } from '@levelmeup/content';
import { DISCIPLINE_PER_CORE_DAY } from '@levelmeup/rules';
import type { Rating } from '@levelmeup/rules';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ClearedNumbers } from '../../quest/cleared.ts';
import { colors, fonts, radius, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { InkBurst } from '../../ui/InkBurst.tsx';
import { LinkButton } from '../../ui/LinkButton.tsx';
import { MOMENTS, countPlan } from '../../ui/motion.ts';
import type { BarPoint } from '../../ui/motion.ts';
import { OutlinedTitle } from '../../ui/OutlinedTitle.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SlamIn } from '../../ui/SlamIn.tsx';
import { Panel } from '../../ui/Panel.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { XpStamp } from '../../ui/Stamp.tsx';
import { Body, Caption, Heading, Label, Small } from '../../ui/Text.tsx';
import { Thud } from '../../ui/Thud.tsx';
import { useCountUp } from '../../ui/useMotion.ts';
import { XpBar } from '../../ui/XpBar.tsx';

const C = PLAY_TEXT.cleared;
const RATINGS: readonly (readonly [Rating, string])[] = [['easy', C.easy], ['right', C.right], ['too_hard', C.tooHard]];
const M = MOMENTS.cleared;
const point = (l: ClearedNumbers['level']): BarPoint => ({ level: l.level, value: l.xpIntoLevel, max: l.xpForLevel });

export type ClearedProps = {
  /** "CORE QUEST · KNEE PUSH-UPS" */
  heading: string;
  /** The quest's target, e.g. "3 sets of 8". */
  line: string;
  numbers: ClearedNumbers;
  rating: Rating | null;
  /** Undo and the rating are offered only while the day is open: the server refuses both after (review). */
  dayOpen: boolean;
  waiting: boolean;
  onRate: (rating: Rating) => void;
  onUndo: () => void;
  onContinue: () => void;
  /** "Too hard" can step this quest's ladder down (spec §3.3: offered at once). */
  canStepDown: boolean;
  onStepDown: () => void;
  /** An exercise quest: "I felt pain" stays reachable after clearing it. */
  onPain: (() => void) | null;
  /** M8b: false for the reading quest: it has no rung, so nothing to rate. */
  rateable?: boolean;
  /** M8b: the reading quest's "Read again". */
  onReadAgain?: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <Body tone="ink" weight="medium">{label}</Body>
      <Heading tone="ink">{value}</Heading>
    </View>
  );
}

/** The level line counts up with the bar (M10a), in its own component so each number re-renders only this line (review). */
function LevelLine({ numbers }: { numbers: ClearedNumbers }) {
  const { level, xpIntoLevel, xpForLevel } = numbers.level;
  const before = numbers.levelBefore === null ? null : point(numbers.levelBefore);
  const into = useCountUp(countPlan(before, point(numbers.level), M.bar), xpIntoLevel);
  return (
    <Caption tone="inkMuted" accessibilityLabel={fillText(C.levelLine, { level, into: xpIntoLevel, for: xpForLevel })}>
      {fillText(C.levelLine, { level, into, for: xpForLevel })}
    </Caption>
  );
}

function RateButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexGrow: 1, flexBasis: 90, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
        borderRadius: radius.pill, borderWidth: space.border, borderColor: selected ? colors.paper : colors.line, backgroundColor: selected ? colors.paper : 'transparent',
      }}
    >
      <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: selected ? colors.ink : colors.chalk, textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Cleared({
  heading, line, numbers, rating, dayOpen, waiting, onRate, onUndo, onContinue, canStepDown, onStepDown, onPain, rateable, onReadAgain,
}: ClearedProps) {
  const insets = useSafeAreaInsets();
  /** The step down was just sent: say so, rather than "if it stays too hard" (the offer itself is gone). */
  const [eased, setEased] = useState(false);
  const { level, xpIntoLevel, xpForLevel } = numbers.level;
  const shown: Rating = rating ?? 'right';
  const before = numbers.levelBefore === null ? null : point(numbers.levelBefore);
  /** Just cleared on this screen: the moment plays. Reopened later, it shows still. */
  const fresh = before !== null;
  /** M10b: the rank stamp that ticks, chosen once, so a sync that changes the stat-ups never moves the tick (review). */
  const [ticking] = useState(() => numbers.statUps[0]?.stat ?? null);
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: space.gutter, gap: 22 }}>
      {/* The board's outlined title, shrunk to fit, and the stamp below the line rather than over the words: at the
          largest text size the stamp covered the heading and the title broke mid-word (emulator check, M6a). */}
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 18 }}>
        <SpeedLines burst={fresh} />
        <Label style={{ textAlign: 'center' }}>{heading}</Label>
        <SlamIn still={!fresh} style={{ alignSelf: 'stretch' }}>
          <View style={{ transform: [{ rotate: '-4deg' }] }}>
            <OutlinedTitle text={C.title} align="center" />
          </View>
        </SlamIn>
        <Small style={{ textAlign: 'center' }}>{line}</Small>
        <InkBurst delay={M.stamp} still={!fresh}>
          <Thud delay={M.stamp} still={!fresh} haptic="stamp" testID="xp-stamp-thud">
            <XpStamp xp={numbers.xp} size={86} rotate={12} />
          </Thud>
        </InkBurst>
      </View>

      <SlamIn delay={M.panel} still={!fresh}>
        <Panel contentStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
          {numbers.statUps.map((up) => (
            <View key={up.stat} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.trackOnPaper }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Label tone="accentInk">{C.statUp}</Label>
                <Heading tone="ink">{`${STAT_NAMES[up.stat]} ${up.from} → ${up.to}`}</Heading>
              </View>
              {/* M10b: the rank stamps land together, so only the first one ticks. */}
              <Thud delay={M.rank} still={!fresh} haptic={up.stat === ticking ? 'tick' : undefined} testID="rank-thud">
                <View
                  accessible
                  accessibilityLabel={`Rank ${up.rank}`}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentInk, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Heading tone="white">{up.rank}</Heading>
                </View>
              </Thud>
            </View>
          ))}
          {numbers.discipline && <Row label={C.discipline} value={`+${DISCIPLINE_PER_CORE_DAY}`} />}
          {numbers.streak !== null && <Row label={C.streak} value={fillText(C.streakDays, numbers.streak)} />}
          {numbers.recovered && <Body tone="ink">{C.recovered}</Body>}
          <View style={{ gap: 6 }}>
            <XpBar on="paper" value={xpIntoLevel} max={xpForLevel} level={level} from={before} delay={M.bar} label={`Level ${level} progress`} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
              <LevelLine numbers={numbers} />
              <Caption tone="inkMuted">{fillText(C.toNext, { xp: xpForLevel - xpIntoLevel, next: level + 1 })}</Caption>
            </View>
          </View>
        </Panel>
      </SlamIn>

      {dayOpen && rateable !== false && (
        <View style={{ gap: 8 }}>
          <Small>{C.rateLabel}</Small>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RATINGS.map(([value, label]) => (
              <RateButton key={value} label={label} selected={shown === value} onPress={() => { if (value !== shown) onRate(value); }} />
            ))}
          </View>
          {rating === 'too_hard' &&
            (eased ? (
              <Small>{ADJUST_TEXT.stepDown.done}</Small>
            ) : canStepDown ? (
              <View style={{ gap: 8 }}>
                <Body>{ADJUST_TEXT.stepDown.offer}</Body>
                <Button
                  label={ADJUST_TEXT.stepDown.accept}
                  variant="secondary"
                  onPress={() => {
                    setEased(true);
                    onStepDown();
                  }}
                />
              </View>
            ) : (
              <Small>{C.tooHardNote}</Small>
            ))}
        </View>
      )}

      <Button label={C.continue} onPress={onContinue} />
      {onReadAgain !== undefined && <Button label={READING_TEXT.readAgain} variant="secondary" onPress={onReadAgain} />}
      {/* M10c: a quiet link, so it never competes with Continue. */}
      {dayOpen && <LinkButton label={C.undo} onPress={onUndo} />}
      {dayOpen && onPain !== null && <Button label={ADJUST_TEXT.pain.open} variant="secondary" onPress={onPain} />}
      {waiting && <Caption>{PLAY_TEXT.quest.willSync}</Caption>}
    </ScreenScroll>
  );
}
