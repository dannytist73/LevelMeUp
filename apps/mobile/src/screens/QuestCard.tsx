// A quest on Today (D1 board): the core quest in a paper panel with its XP stamp, the others as night cards. Words come
// from the content package in the player's voice; numbers from the quest's stored snapshot. M4 showed; M6a makes every
// card open its quest and puts the picture on the core quest; M6b adds the hard-day tag and "I felt pain". M10c: the open
// core quest ends in a Begin bar; a cleared quest is a slim, quiet row; the next quest is marked; a check-off quest has a
// hold-to-clear bar under its card.
import {
  ADJUST_TEXT, BOOK_TEXT, EXERCISE_SAFETY_LINE, PLAY_TEXT, SHADOW_TEXT, STAT_NAMES, TODAY_TEXT, authoredTemplate, fillText, questSummary,
  renderWhy,
} from '@levelmeup/content';
import type { Voice } from '@levelmeup/content';
import type { ClassId } from '@levelmeup/rules';
import { Pressable, View } from 'react-native';
import type { QuestView } from '../game/types.ts';
import { clockTime } from '../lib/dates.ts';
import { colors } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { Chip } from '../ui/Chip.tsx';
import { HoldButton } from '../ui/HoldButton.tsx';
import { Icon } from '../ui/icons.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { QuestArt } from '../ui/QuestArt.tsx';
import { SlamIn } from '../ui/SlamIn.tsx';
import { SlantPanel } from '../ui/SlantPanel.tsx';
import { XpStamp } from '../ui/Stamp.tsx';
import { Body, Caption, Heading, Label, Meta, Small, Title } from '../ui/Text.tsx';

export const COMPLETION_NAMES = { tap: 'Check off', timer: 'Timer', reps: 'Rep log', text: 'One sentence' } as const;

export type QuestCardProps = {
  quest: QuestView;
  voice: Voice;
  classId: ClassId;
  timeZone: string;
  /** The server hasn't confirmed a change to this quest yet. */
  waiting: boolean;
  /** Opens the quest screen (M6a). */
  onOpen: () => void;
  /** The core quest's picture, or null for the ink fallback (M6a decision 10). */
  artUri: string | null;
  /** An open exercise core quest: "I felt pain" under the card (board D1). */
  onPain?: () => void;
  /** The quest's exercise is resting after pain (M6b review): the card says so. */
  resting?: boolean;
  /** M7c: a side quest the Trial of Stillness seals: a quiet card that opens the trial. */
  sealed?: boolean;
  /** M10c: the quest to do next, once the core quest is cleared. */
  next?: boolean;
  /** M10c decision 6: a check-off quest cleared by a hold under its card. */
  onQuickClear?: () => void;
};

/** M10c: how long the hold to clear a quest from Today lasts: quick, but never a brushed tap. */
export const QUICK_CLEAR_MS = 800;

function QuickClear({ xp, onDone }: { xp: number; onDone: () => void }) {
  return (
    <HoldButton label={fillText(TODAY_TEXT.hold, { xp })} tapLabel={TODAY_TEXT.holdTap} confirmLabel={TODAY_TEXT.holdConfirm}
      holdMs={QUICK_CLEAR_MS} onDone={onDone} />
  );
}

/** M10c: a cleared quest, quiet: its title, when it was cleared, and its XP in a small ember line. */
function ClearedRow({ title, stat, time, xp, waiting, on, onOpen }: {
  title: string; stat: string; time: string; xp: number; waiting: boolean; on: 'paper' | 'night'; onOpen: () => void;
}) {
  const paper = on === 'paper';
  return (
    <Pressable accessibilityRole="button" accessibilityHint={PLAY_TEXT.quest.open} onPress={onOpen}>
      <View style={{
        flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: paper ? colors.paper : colors.panel, borderWidth: 2, borderColor: paper ? colors.paper : colors.divider,
      }}>
        <Icon name="check" size={22} color={paper ? colors.sealText : colors.ember} />
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: 2 }}>
          <Body weight="bold" tone={paper ? 'ink' : 'ashLight'}>{title}</Body>
          <Meta style={paper ? { color: colors.inkMuted } : undefined}>{fillText(TODAY_TEXT.clearedAt, { stat, time })}</Meta>
          {waiting && <WillSync on={on} />}
        </View>
        <Label tone={paper ? 'sealText' : 'ember'}>{fillText(TODAY_TEXT.cleared, { xp })}</Label>
      </View>
    </Pressable>
  );
}

export const questXp = (quest: QuestView): number => Object.values(quest.xp).reduce((sum, x) => sum + (x ?? 0), 0);

function WillSync({ on }: { on: 'paper' | 'night' }) {
  return <Caption tone={on === 'paper' ? 'inkMuted' : 'ash'}>Will sync</Caption>;
}

export function QuestCard({
  quest, voice, classId, timeZone, waiting, onOpen, artUri, onPain, resting = false, sealed = false, next = false, onQuickClear,
}: QuestCardProps) {
  const template = authoredTemplate(quest.templateId);
  const words = template.voice[voice];
  const summary = questSummary(quest);
  const why = renderWhy(quest.why, voice, { classId });
  const xp = questXp(quest);
  const stat = STAT_NAMES[quest.stat];
  const cleared = quest.completedAt !== null;

  if (cleared) {
    return (
      <ClearedRow title={words.title} stat={stat} time={clockTime(quest.completedAt!, timeZone)} xp={xp} waiting={waiting}
        on={quest.slot === 'core' ? 'paper' : 'night'} onOpen={onOpen} />
    );
  }

  if (quest.slot === 'core') {
    // The pain button sits beside the card, never inside it: a button inside the card's pressable is unreachable for
    // screen readers. The Begin bar is part of the card (M10c): the whole card is the one button.
    return (
      <View style={{ gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityHint={PLAY_TEXT.quest.open} onPress={onOpen}>
          <SlamIn>
            <View style={{ marginRight: 6 }}>
              <SlantPanel offset contentStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
                <QuestArt uri={artUri} label={fillText(PLAY_TEXT.quest.picture, { stat })} fallback={stat} decorative />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingRight: 56 }}>
                  <Chip label={stat} on="paper" />
                  <Chip label={COMPLETION_NAMES[quest.completion]} kind="outline" on="paper" />
                  {quest.hardDay && <Chip label={ADJUST_TEXT.hardDay.tag} kind="outline" on="paper" />}
              {resting && <Chip label={ADJUST_TEXT.paused.tag} kind="outline" on="paper" />}
                </View>
                <View style={{ gap: 4 }}>
                  <Title tone="ink">{words.title}</Title>
                  <Body tone="inkSoft" weight="medium">{summary}</Body>
                  {quest.book !== null && <Small tone="inkSoft">{fillText(BOOK_TEXT.questLine, { title: quest.book })}</Small>}
                </View>
                <View style={{ gap: 3, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ink }}>
                  <Label tone="sealText">Why this quest</Label>
                  <Small tone="inkSoft">{why}</Small>
                </View>
                {template.exercise !== null && <Small tone="inkMuted">{EXERCISE_SAFETY_LINE}</Small>}
                {waiting && <WillSync on="paper" />}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, backgroundColor: colors.seal }}>
                  <Heading tone="white">{TODAY_TEXT.begin.toUpperCase()}</Heading>
                  <Icon name="chevronRight" size={22} color={colors.white} />
                </View>
              </SlantPanel>
              <XpStamp xp={xp} style={{ position: 'absolute', top: -20, right: -8 }} />
            </View>
          </SlamIn>
        </Pressable>
        {onQuickClear !== undefined && <QuickClear xp={xp} onDone={onQuickClear} />}
        {onPain !== undefined && (
          <Button label={ADJUST_TEXT.pain.open} variant="secondary" onPress={onPain} style={{ alignSelf: 'flex-start' }} />
        )}
      </View>
    );
  }

  if (sealed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${words.title}. ${SHADOW_TEXT.trial.sealed}. ${SHADOW_TEXT.trial.sealedHint}`}
        onPress={onOpen}
      >
        <NightCard quiet>
          {/* Wraps: at the largest font the chip goes under the title instead of past the card's edge (emulator). */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flexGrow: 1, flexShrink: 1, gap: 3 }}>
              <Body weight="bold" tone="ashLight">{words.title}</Body>
              <Meta>{`${stat} · ${summary}`}</Meta>
            </View>
            <Chip label={SHADOW_TEXT.trial.sealed} kind="outline" />
          </View>
        </NightCard>
      </Pressable>
    );
  }

  const card = (
    <Pressable accessibilityRole="button" accessibilityHint={PLAY_TEXT.quest.open} onPress={onOpen}>
      <NightCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 }}>
            {next && <Chip label={TODAY_TEXT.next} kind="ember" />}
            <Chip label={stat} />
            <Chip label={COMPLETION_NAMES[quest.completion]} kind="outline" />
            {quest.hardDay && <Chip label={ADJUST_TEXT.hardDay.tag} kind="outline" />}
            {resting && <Chip label={ADJUST_TEXT.paused.tag} kind="outline" />}
          </View>
          <Heading tone="ember">{`+${xp} XP`}</Heading>
        </View>
        <Heading>{words.title}</Heading>
        <Meta>{summary}</Meta>
        {quest.book !== null && <Small tone="chalk">{fillText(BOOK_TEXT.questLine, { title: quest.book })}</Small>}
        <Small>{why}</Small>
        {template.exercise !== null && <Meta>{EXERCISE_SAFETY_LINE}</Meta>}
        {waiting && <WillSync on="night" />}
      </NightCard>
    </Pressable>
  );
  if (onQuickClear === undefined) return card;
  return <View style={{ gap: 10 }}>{card}<QuickClear xp={xp} onDone={onQuickClear} /></View>;
}
