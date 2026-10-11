// A quest on Today (D1 board): the core quest in a paper panel with its XP stamp, the others as night cards. Words come
// from the content package in the player's voice; numbers from the quest's stored snapshot. M4 showed; M6a makes every
// card open its quest and puts the picture on the core quest; M6b adds the hard-day tag and "I felt pain".
import { ADJUST_TEXT, EXERCISE_SAFETY_LINE, PLAY_TEXT, STAT_NAMES, authoredTemplate, fillText, questSummary, renderWhy } from '@levelmeup/content';
import type { Voice } from '@levelmeup/content';
import type { ClassId } from '@levelmeup/rules';
import { Pressable, View } from 'react-native';
import type { QuestView } from '../game/types.ts';
import { clockTime } from '../lib/dates.ts';
import { colors } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { Chip } from '../ui/Chip.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { QuestArt } from '../ui/QuestArt.tsx';
import { SlamIn } from '../ui/SlamIn.tsx';
import { SlantPanel } from '../ui/SlantPanel.tsx';
import { MarkStamp, XpStamp } from '../ui/Stamp.tsx';
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
};

export const questXp = (quest: QuestView): number => Object.values(quest.xp).reduce((sum, x) => sum + (x ?? 0), 0);

function WillSync({ on }: { on: 'paper' | 'night' }) {
  return <Caption tone={on === 'paper' ? 'inkMuted' : 'ash'}>Will sync</Caption>;
}

export function QuestCard({ quest, voice, classId, timeZone, waiting, onOpen, artUri, onPain }: QuestCardProps) {
  const template = authoredTemplate(quest.templateId);
  const words = template.voice[voice];
  const summary = questSummary(template, quest.hardDay);
  const why = renderWhy(quest.why, voice, { classId });
  const xp = questXp(quest);
  const stat = STAT_NAMES[quest.stat];
  const cleared = quest.completedAt !== null;

  if (quest.slot === 'core') {
    // The pain button sits beside the card, never inside it: a button inside the card's pressable is unreachable for
    // screen readers.
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
                  </View>
                  <View style={{ gap: 4 }}>
                    <Title tone="ink">{words.title}</Title>
                    <Body tone="inkSoft" weight="medium">{summary}</Body>
                  </View>
                  <View style={{ gap: 3, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ink }}>
                    <Label tone="sealText">Why this quest</Label>
                    <Small tone="inkSoft">{why}</Small>
                  </View>
                  {template.exercise !== null && <Small tone="inkMuted">{EXERCISE_SAFETY_LINE}</Small>}
                  {cleared && <MarkStamp text={`Cleared +${xp}`} style={{ borderColor: colors.sealText }} />}
                  {waiting && <WillSync on="paper" />}
                </SlantPanel>
                {!cleared && <XpStamp xp={xp} style={{ position: 'absolute', top: -20, right: -8 }} />}
              </View>
            </SlamIn>
          </Pressable>
        {onPain !== undefined && (
          <Button label={ADJUST_TEXT.pain.open} variant="secondary" onPress={onPain} style={{ alignSelf: 'flex-start' }} />
        )}
      </View>
    );
  }

  if (cleared) {
    return (
      <Pressable accessibilityRole="button" accessibilityHint={PLAY_TEXT.quest.open} onPress={onOpen}>
        <NightCard quiet>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Body weight="bold" tone="ashLight">{words.title}</Body>
              <Meta>{`${stat} · cleared ${clockTime(quest.completedAt!, timeZone)}`}</Meta>
              {waiting && <WillSync on="night" />}
            </View>
            <MarkStamp text={`Cleared +${xp}`} />
          </View>
        </NightCard>
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityRole="button" accessibilityHint={PLAY_TEXT.quest.open} onPress={onOpen}>
      <NightCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 }}>
            <Chip label={stat} />
            <Chip label={COMPLETION_NAMES[quest.completion]} kind="outline" />
            {quest.hardDay && <Chip label={ADJUST_TEXT.hardDay.tag} kind="outline" />}
          </View>
          <Heading tone="ember">{`+${xp} XP`}</Heading>
        </View>
        <Heading>{words.title}</Heading>
        <Meta>{summary}</Meta>
        <Small>{why}</Small>
        {template.exercise !== null && <Meta>{EXERCISE_SAFETY_LINE}</Meta>}
        {waiting && <WillSync on="night" />}
      </NightCard>
    </Pressable>
  );
}
