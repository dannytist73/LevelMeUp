// The quests on Today (D1 board; Lantern, M11; Round 3, M12 boards R3-1 and R3-4). Words come from the content package
// in the player's voice; numbers from the quest's stored snapshot. M12 (plan decision 3, audit 1): one quest is "Up
// next", a card holding the screen's only bright button (the core quest keeps its picture); the others are quiet rows
// that open their quest, and a check-off quest's row has a check circle that clears it (Today offers Undo). A cleared
// quest is a slim row with its XP.
import {
  ADJUST_TEXT, BOOK_TEXT, EXERCISE_SAFETY_LINE, PLAY_TEXT, SHADOW_TEXT, STAT_NAMES, TODAY_TEXT, authoredTemplate, fillText, programBlockLabel,
  questSummary,
} from '@levelmeup/content';
import type { Voice } from '@levelmeup/content';
import { View } from 'react-native';
import type { QuestView } from '../game/types.ts';
import { clockTime } from '../lib/dates.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { Chip } from '../ui/Chip.tsx';
import { Icon } from '../ui/icons.tsx';
import { QuestArt } from '../ui/QuestArt.tsx';
import { SlamIn } from '../ui/SlamIn.tsx';
import { Tap } from '../ui/Tap.tsx';
import { Body, Caption, Heading, Label, Meta, Small, Title } from '../ui/Text.tsx';

export const COMPLETION_NAMES = { tap: 'Check off', timer: 'Timer', reps: 'Rep log', text: 'One sentence' } as const;

/** M10c: the core card's picture is a wider crop than the quest screen's 16:9 (emulator: Begin fell below the fold). */
export const TODAY_ART_RATIO = 2;

export const questXp = (quest: QuestView): number => Object.values(quest.xp).reduce((sum, x) => sum + (x ?? 0), 0);

const SLOT_NAMES: Readonly<Record<QuestView['slot'], string>> = {
  core: PLAY_TEXT.quest.slots.core, side1: PLAY_TEXT.quest.slots.side, side2: PLAY_TEXT.quest.slots.side,
  article: PLAY_TEXT.quest.slots.article, recovery: PLAY_TEXT.quest.slots.recovery,
};

export function WillSync({ on = 'night' }: { on?: 'paper' | 'night' }) {
  return <Caption tone={on === 'paper' ? 'inkMuted' : 'ash'}>{PLAY_TEXT.quest.willSync}</Caption>;
}

/** The tags a quest can carry today: a hard day's lighter version, an exercise resting after pain. */
function Tags({ quest, resting }: { quest: QuestView; resting: boolean }) {
  if (!quest.hardDay && !resting) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {quest.hardDay && <Chip label={ADJUST_TEXT.hardDay.tag} kind="outline" />}
      {resting && <Chip label={ADJUST_TEXT.paused.tag} kind="outline" />}
    </View>
  );
}

/** The bright bar at the foot of Up next: the only accent button on Today (audit 1). */
function GoBar({ label, xp }: { label: string; xp: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 8, minHeight: 54, marginTop: 4, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.commit }}>
      <Heading tone="onAccent">{label}</Heading>
      <Label tone="onAccent">{`· +${xp} XP`}</Label>
      <Icon name="chevronRight" size={22} color={colors.onAccent} />
    </View>
  );
}

export type UpNextProps = {
  quest: QuestView;
  voice: Voice;
  waiting: boolean;
  /** Opens the quest screen; for a check-off side quest, clears it instead (Today offers Undo). */
  onGo: () => void;
  /** The core quest's picture, or null for the ink fallback (M6a decision 10). */
  artUri: string | null;
  /** An open exercise core quest: "I felt pain" under the card (board D1). */
  onPain?: () => void;
  resting?: boolean;
};

/** Up next (board R3-1): the quest to do now. The whole card is one button; "I felt pain" sits beside it, never inside. */
export function UpNextCard({ quest, voice, waiting, onGo, artUri, onPain, resting = false }: UpNextProps) {
  const template = authoredTemplate(quest.templateId);
  const words = template.voice[voice];
  const xp = questXp(quest);
  const stat = STAT_NAMES[quest.stat];
  const core = quest.slot === 'core';
  const clears = quest.completion === 'tap' && !core;
  return (
    <View style={{ gap: 10 }}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`${SLOT_NAMES[quest.slot]}, ${stat}. ${words.title}. ${questSummary(quest)}. ${clears ? fillText(TODAY_TEXT.markDone, { title: words.title }) : TODAY_TEXT.begin}, +${xp} XP`}
        accessibilityHint={clears ? undefined : PLAY_TEXT.quest.open}
        onPress={onGo}
        radius={radius.card}
      >
        <SlamIn>
          {/* The card you act on now is outlined in the accent; the core quest's picture runs across its top. */}
          <View testID="up-next" style={{ borderRadius: radius.card, borderWidth: space.heroBorder, borderColor: colors.accent, backgroundColor: colors.panel, overflow: 'hidden' }}>
            {core && <QuestArt uri={artUri} label={fillText(PLAY_TEXT.quest.picture, { stat })} fallback={stat} decorative ratio={TODAY_ART_RATIO} rounded={false} />}
            <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, gap: 8 }}>
              <Label tone="accentText">{`${SLOT_NAMES[quest.slot]} · ${stat}`}</Label>
              <Title>{words.title}</Title>
              <Body tone="ashLight" weight="medium">{questSummary(quest)}</Body>
              {quest.book !== null && <Small>{fillText(BOOK_TEXT.questLine, { title: quest.book })}</Small>}
              {/* M15: a weekly workout's week and day. */}
              {quest.condition.kind === 'session' && quest.condition.block !== undefined && (
                <Small>{programBlockLabel(quest.condition.block)}</Small>
              )}
              <Tags quest={quest} resting={resting} />
              {template.exercise !== null && <Meta>{EXERCISE_SAFETY_LINE}</Meta>}
              {waiting && <WillSync />}
              <GoBar label={clears ? PLAY_TEXT.claim.tap : TODAY_TEXT.begin} xp={xp} />
            </View>
          </View>
        </SlamIn>
      </Tap>
      {onPain !== undefined && <Button label={ADJUST_TEXT.pain.open} variant="secondary" onPress={onPain} style={{ alignSelf: 'flex-start' }} />}
    </View>
  );
}

/** A check-off quest's check circle (M12 decision 3): 48 dp, beside its row, never inside it. */
function CheckCircle({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Tap accessibilityRole="checkbox" accessibilityLabel={fillText(TODAY_TEXT.markDone, { title })} accessibilityState={{ checked: false }}
      onPress={onPress} radius={radius.pill} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.lineStrong }} />
    </Tap>
  );
}

export type QuestRowProps = {
  title: string;
  /** "Vitality · 10 minutes". */
  line: string;
  xp: number;
  onOpen: () => void;
  /** A check-off quest: its circle clears it. */
  onCheck?: () => void;
  /** A tag at the end instead of the XP ("Sealed"). */
  tag?: string;
  /** A second line ("Reading: Dune"). */
  note?: string;
  waiting?: boolean;
  /** What a screen reader hears for the row, when the title and line don't say it all. */
  accessibilityLabel?: string;
};

/** An open quest that isn't Up next (board R3-1's "Then"): quiet, one line of detail, its XP at the end. */
export function QuestRow({ title, line, xp, onOpen, onCheck, tag, note, waiting = false, accessibilityLabel }: QuestRowProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.control, borderWidth: space.border, borderColor: colors.divider, backgroundColor: colors.panel }}>
      {onCheck !== undefined && <CheckCircle title={title} onPress={onCheck} />}
      <Tap
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${title}. ${line}. ${tag ?? `+${xp} XP`}`}
        accessibilityHint={PLAY_TEXT.quest.open}
        onPress={onOpen}
        radius={radius.control}
        style={{ flex: 1, minHeight: 60, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4, paddingLeft: onCheck === undefined ? 16 : 0, paddingRight: 14, paddingVertical: 10 }}
      >
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: 2 }}>
          <Body weight="bold">{title}</Body>
          <Meta>{line}</Meta>
          {note !== undefined && <Small>{note}</Small>}
          {waiting && <WillSync />}
        </View>
        {tag !== undefined ? <Chip label={tag} kind="outline" /> : <Label tone="accentText">{`+${xp}`}</Label>}
      </Tap>
    </View>
  );
}

/** A Then row for a quest: its words, its stat and target, a check circle when a tap clears it. */
export function questRowProps(quest: QuestView, voice: Voice, extra: { resting: boolean; sealed: boolean; onCheck?: () => void }): Omit<QuestRowProps, 'onOpen'> {
  const title = authoredTemplate(quest.templateId).voice[voice].title;
  const stat = STAT_NAMES[quest.stat];
  const parts = [stat, extra.onCheck !== undefined ? TODAY_TEXT.tapHint : questSummary(quest)];
  if (quest.hardDay) parts.push(ADJUST_TEXT.hardDay.tag);
  if (extra.resting) parts.push(ADJUST_TEXT.paused.tag);
  return {
    title,
    line: parts.join(' · '),
    xp: questXp(quest),
    ...(quest.book === null ? {} : { note: fillText(BOOK_TEXT.questLine, { title: quest.book }) }),
    ...(extra.onCheck === undefined ? {} : { onCheck: extra.onCheck }),
    ...(extra.sealed ? { tag: SHADOW_TEXT.trial.sealed, accessibilityLabel: `${title}. ${SHADOW_TEXT.trial.sealed}. ${SHADOW_TEXT.trial.sealedHint}` } : {}),
  };
}

/** M10c: a cleared quest, quiet: its title, when it was cleared, and its XP. */
export function ClearedRow({ title, stat, time, xp, waiting, onOpen }: {
  title: string; stat: string; time: string; xp: number; waiting: boolean; onOpen: () => void;
}) {
  return (
    <Tap accessibilityRole="button" accessibilityHint={PLAY_TEXT.quest.open} onPress={onOpen} radius={radius.control}>
      <View style={{
        flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.control,
        backgroundColor: colors.panel, borderWidth: space.border, borderColor: colors.divider,
      }}>
        <Icon name="check" size={22} color={colors.accentText} />
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: 2 }}>
          <Body weight="bold" tone="ashLight">{title}</Body>
          <Meta>{fillText(TODAY_TEXT.clearedAt, { stat, time })}</Meta>
          {waiting && <WillSync />}
        </View>
        <Label tone="accentText">{fillText(TODAY_TEXT.cleared, { xp })}</Label>
      </View>
    </Tap>
  );
}

/** The cleared row of a quest; the reading's carries its article's title. */
export function clearedQuestRow(quest: QuestView, voice: Voice, timeZone: string, waiting: boolean, onOpen: () => void, title?: string) {
  return (
    <ClearedRow key={quest.id} title={title ?? authoredTemplate(quest.templateId).voice[voice].title} stat={STAT_NAMES[quest.stat]}
      time={clockTime(quest.completedAt!, timeZone)} xp={questXp(quest)} waiting={waiting} onOpen={onOpen} />
  );
}
