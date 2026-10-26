// A simpler day (docs/2026-10-26-simpler-day.md, decisions 3 and 6): the card under the camp scene, on paper like the
// scroll the visitor holds out. One thing at a time: today's quest ("Snoozle brought today's quest") with the screen's
// one bright button, or tonight's story once the quest is done, and the check-off extras under "Also today", each
// cleared by its circle. "Change today" opens the day's options. Once the day is done: "That's today." After a quest
// screen's claim, Camp asks how it felt (optional, as Cleared did), and Too hard offers the step down in place.
import { ADJUST_TEXT, BOOK_TEXT, CAMP_TEXT, MONSTER_TEXT, PLAY_TEXT, STAT_NAMES, TODAY_TEXT, authoredTemplate, fillText, questSummary } from '@levelmeup/content';
import type { Voice } from '@levelmeup/content';
import type { ClassId, Rating } from '@levelmeup/rules';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Image, View } from 'react-native';
import type { QuestView } from '../../game/types.ts';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Icon } from '../../ui/icons.tsx';
import { LinkButton } from '../../ui/LinkButton.tsx';
import type { Power } from '../../ui/PowerChip.tsx';
import { powerWords } from '../../ui/PowerChip.tsx';
import { QuestArt } from '../../ui/QuestArt.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Body, Caption, Heading, Label, Small, Title } from '../../ui/Text.tsx';
import { questXp } from '../QuestCard.tsx';
import { RateButton } from '../quest/Cleared.tsx';

/** An open quest beside the main one: a check-off quest's circle clears it; the others open their screen. */
export type Extra = {
  id: number;
  title: string;
  /** "Vitality · 5 minutes", or "Sealed" for a side quest the Trial holds. */
  line: string;
  /** A second line ("Reading: Dune"). */
  note?: string;
  /** What a screen reader hears, when the title and line don't say it all (a sealed quest opens the Trial). */
  label?: string;
  /** None for a reading whose article hasn't come yet: then the row only says so. */
  onOpen?: () => void;
  onCheck?: () => void;
  power?: Power;
  waiting: boolean;
};

/** The paper the card is drawn on. */
function Paper({ children, testID }: { children: ReactNode; testID: string }) {
  return (
    <View testID={testID} style={{ gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, borderRadius: radius.card, backgroundColor: colors.paper }}>
      {children}
    </View>
  );
}

/** The power a quest gives, on paper: candy when it hits the weakness (double), quiet ink otherwise. */
function PaperPower({ power }: { power: Power }) {
  const words = fillText(power.weak ? MONSTER_TEXT.arena.questWeak : MONSTER_TEXT.arena.questPower, { n: power.n });
  return power.weak ? (
    <View testID="power-chip-weak" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 3, paddingHorizontal: 9, borderRadius: radius.pill, backgroundColor: colors.candy }}>
      <Icon name="bolt" size={14} color={colors.onAccent} />
      <Caption tone="onAccent">{words}</Caption>
    </View>
  ) : (
    <View testID="power-chip" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon name="bolt" size={14} color={colors.inkSoft} />
      <Caption tone="inkSoft">{words}</Caption>
    </View>
  );
}

/** A check circle on paper, 48 dp; it fills the moment it's pressed. */
function PaperCheck({ title, onPress }: { title: string; onPress: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <Tap accessibilityRole="checkbox" accessibilityLabel={fillText(TODAY_TEXT.markDone, { title })} accessibilityState={{ checked }}
      onPress={() => { setChecked(true); onPress(); }} on="paper" radius={radius.pill} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
        borderColor: checked ? colors.accentInk : colors.inkMuted, backgroundColor: checked ? colors.commit : 'transparent',
      }}>
        {checked && <Icon name="check" size={18} color={colors.onAccent} />}
      </View>
    </Tap>
  );
}

function ExtraRow({ extra }: { extra: Extra }) {
  const { onOpen } = extra;
  if (onOpen === undefined) return <Small tone="inkSoft" style={{ paddingVertical: 10, paddingLeft: 4 }}>{extra.title}</Small>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {extra.onCheck !== undefined ? <PaperCheck title={extra.title} onPress={extra.onCheck} /> : <View style={{ width: 4 }} />}
      <Tap accessibilityRole="button" accessibilityLabel={extra.label ?? `${extra.title}. ${extra.line}${extra.power === undefined ? '' : `, ${powerWords(extra.power)}`}`}
        accessibilityHint={PLAY_TEXT.quest.open} onPress={onOpen} on="paper" radius={radius.control}
        style={{ flex: 1, minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4, paddingVertical: 8, paddingRight: 4 }}>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 150, gap: 1 }}>
          <Body tone="ink" weight="bold">{extra.title}</Body>
          <Small tone="inkSoft">{extra.line}</Small>
          {extra.note !== undefined && <Small tone="inkSoft">{extra.note}</Small>}
          {extra.waiting && <Caption tone="inkMuted">{PLAY_TEXT.quest.willSync}</Caption>}
        </View>
        {extra.power !== undefined && <PaperPower power={extra.power} />}
        {extra.onCheck === undefined && <Icon name="chevronRight" size={20} color={colors.inkMuted} />}
      </Tap>
    </View>
  );
}

function Extras({ extras }: { extras: readonly Extra[] }) {
  if (extras.length === 0) return null;
  return (
    <View testID="also-today" style={{ gap: 2, paddingTop: 4, borderTopWidth: space.border, borderTopColor: colors.trackOnPaper }}>
      <Label tone="inkMuted" style={{ paddingTop: 8 }}>{CAMP_TEXT.also}</Label>
      {extras.map((e) => <ExtraRow key={e.id} extra={e} />)}
    </View>
  );
}

export type QuestScrollProps = {
  /** "Snoozle brought today's quest". */
  kicker: string;
  quest: QuestView;
  voice: Voice;
  /** The core quest's picture: your buddy doing it. */
  art?: { classId: ClassId; key: string };
  power?: Power;
  waiting: boolean;
  /** Opens the quest; a check-off side quest is cleared here instead (Camp offers Undo). */
  onGo: () => void;
  onChange?: () => void;
  extras: readonly Extra[];
};

export function QuestScroll({ kicker, quest, voice, art, power, waiting, onGo, onChange, extras }: QuestScrollProps) {
  const words = authoredTemplate(quest.templateId).voice[voice];
  const clears = quest.completion === 'tap' && quest.slot !== 'core' && quest.slot !== 'recovery';
  const line = `${questSummary(quest)} · ${STAT_NAMES[quest.stat]} · +${questXp(quest)} XP`;
  return (
    <Paper testID="quest-scroll">
      <Label tone="inkMuted">{kicker}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {art !== undefined && (
          <View style={{ width: 68, borderRadius: radius.control, overflow: 'hidden', backgroundColor: colors.trackOnPaper }}>
            <QuestArt classId={art.classId} artKey={art.key} label="" decorative ratio={1} rounded={false} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Title tone="ink">{words.title}</Title>
          <Small tone="inkSoft">{line}</Small>
          {quest.book !== null && <Small tone="inkSoft">{fillText(BOOK_TEXT.questLine, { title: quest.book })}</Small>}
          {power !== undefined && <View style={{ alignSelf: 'flex-start' }}><PaperPower power={power} /></View>}
          {quest.hardDay && <Caption tone="inkMuted">{ADJUST_TEXT.hardDay.tag}</Caption>}
          {waiting && <Caption tone="inkMuted">{PLAY_TEXT.quest.willSync}</Caption>}
        </View>
      </View>
      {/* 2026-10-27 (the owner: buttons easier to hit): the two actions in one row, the main one wide. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <View style={{ flexGrow: 1, flexBasis: 170 }}>
          <Button label={clears ? PLAY_TEXT.claim.tap : CAMP_TEXT.go} variant="commitment" on="paper" onPress={onGo}
            accessibilityLabel={`${clears ? fillText(TODAY_TEXT.markDone, { title: words.title }) : CAMP_TEXT.go}. ${words.title}${power === undefined ? '' : `, ${powerWords(power)}`}`} />
        </View>
        {onChange !== undefined && <LinkButton label={TODAY_TEXT.change} tone="accentInk" onPress={onChange} style={{ flexGrow: 1 }} />}
      </View>
      <Extras extras={extras} />
    </Paper>
  );
}

export type StoryCardProps = {
  title: string;
  /** "about 4 min". */
  length: string;
  xp: number;
  /** The story's clay picture, when this phone has it. */
  picture: string | null;
  power?: Power;
  waiting: boolean;
  onRead: () => void;
  extras: readonly Extra[];
};

/** Tonight's story, next once the main quest is done. */
export function StoryCard({ title, length, xp, picture, power, waiting, onRead, extras }: StoryCardProps) {
  const [failed, setFailed] = useState(false);
  return (
    <Paper testID="story-card">
      <Label tone="inkMuted">{CAMP_TEXT.brought.article}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {picture !== null && !failed && (
          <Image source={{ uri: picture }} onError={() => setFailed(true)} resizeMode="cover" accessible={false}
            style={{ width: 96, height: 64, borderRadius: radius.control, backgroundColor: colors.trackOnPaper }} />
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Heading tone="ink">{title}</Heading>
          <Small tone="inkSoft">{fillText(CAMP_TEXT.readMeta, { length, xp })}</Small>
          {power !== undefined && <View style={{ alignSelf: 'flex-start' }}><PaperPower power={power} /></View>}
          {waiting && <Caption tone="inkMuted">{PLAY_TEXT.quest.willSync}</Caption>}
        </View>
      </View>
      <Button label={CAMP_TEXT.read} variant="commitment" on="paper" onPress={onRead} accessibilityLabel={`${CAMP_TEXT.read}. ${title}`} />
      <Extras extras={extras} />
    </Paper>
  );
}

const RATINGS: readonly (readonly [Rating, string])[] = [['easy', PLAY_TEXT.cleared.easy], ['right', PLAY_TEXT.cleared.right], ['too_hard', PLAY_TEXT.cleared.tooHard]];

/** The quest just cleared, rated in place: optional (no answer counts as Right on the server), as on Cleared. */
export function FeelRow({ title, rating, canStepDown, onRate, onStepDown, onPain }: {
  title: string; rating: Rating | null; canStepDown: boolean; onRate: (r: Rating) => void; onStepDown: () => void;
  /** An exercise: "I felt pain" stays in reach after clearing it, as on Cleared. */
  onPain?: () => void;
}) {
  const [eased, setEased] = useState(false);
  return (
    <View testID="feel-row" style={{ gap: 8 }}>
      <Small>{`${CAMP_TEXT.feel} · ${title}`}</Small>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {RATINGS.map(([value, label]) => (
          <RateButton key={value} label={label} selected={rating === value} onPress={() => { if (value !== rating) onRate(value); }} />
        ))}
      </View>
      {rating === 'too_hard' && (eased ? (
        <Small>{ADJUST_TEXT.stepDown.done}</Small>
      ) : canStepDown ? (
        <View style={{ gap: 8 }}>
          <Body>{ADJUST_TEXT.stepDown.offer}</Body>
          <Button label={ADJUST_TEXT.stepDown.accept} variant="secondary" onPress={() => { setEased(true); onStepDown(); }} />
        </View>
      ) : (
        <Small>{PLAY_TEXT.cleared.tooHardNote}</Small>
      ))}
      {onPain !== undefined && <LinkButton label={ADJUST_TEXT.pain.open} onPress={onPain} style={{ alignSelf: 'flex-start' }} />}
    </View>
  );
}

/** The day done: what it came to, and when the next quest comes. Under it, anything still open is an extra. */
export function DayEnd({ asleep, line, facts, next, onChange, done }: {
  /** "Snoozle dozed off by the fire.", when a Grumble is visiting. */
  asleep: string | null;
  /** "Your streak holds. Rest well." */
  line: string;
  /** "+60 XP today", "1 lesson kept". */
  facts: readonly string[];
  /** "Tomorrow's quest arrives after 4:00 AM." */
  next: string;
  onChange?: () => void;
  done: ReactNode;
}) {
  return (
    <View testID="day-done" style={{ gap: 12 }}>
      <View accessible accessibilityRole="summary" style={{ gap: 6 }}>
        <Title accessibilityRole="header">{CAMP_TEXT.done.title}</Title>
        {asleep !== null && <Body>{asleep}</Body>}
        <Body tone="ashLight">{line}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 2 }}>
          {facts.map((f) => <Body key={f} tone="accentText" weight="bold">{f}</Body>)}
        </View>
      </View>
      {done}
      <Small>{next}</Small>
      {onChange !== undefined && <LinkButton label={TODAY_TEXT.change} onPress={onChange} style={{ alignSelf: 'flex-start' }} />}
    </View>
  );
}
