// Today (spec §1.2–1.4, D1 board), M4's read-only version (the tabs send a player with no character to the onboarding):
// the day's header and every quest of the day, with the §1.4 loading, empty and offline states. Every quest opens its
// quest screen (M6a); M6b adds the day's adjustments (DayActions.tsx); M7a the check-in (CheckinNotes.tsx). M8b: today's
// reading card and the Mage's Insight. M7c: after "I just didn't" under a pact, the Shadow's mark and box, the recovery quest first, and
// at level 2 the Trial above the sealed side quests (board F3).
import { ADJUST_TEXT, CLASS_NAMES, OFFLINE_TEXT, SHADOW_TEXT, artKey, authoredTemplate, shadowLine } from '@levelmeup/content';
import { questDayDate } from '@levelmeup/rules';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { artUrl } from '../art/manifest.ts';
import { isExercise, isResting } from '../game/adjust.ts';
import { trainingUnset } from '../game/character.ts';
import { streakNote } from '../game/checkin.ts';
import { noticeText } from '../game/notices.ts';
import { marked, sealedQuest, shadowHold } from '../game/pact.ts';
import type { QuestView } from '../game/types.ts';
import { dayLabel } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { HalftoneHeader } from '../ui/HalftoneHeader.tsx';
import { Icon } from '../ui/icons.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { ShadowMark } from '../ui/ShadowMark.tsx';
import { Body, Caption, Display, Heading, Label, Small } from '../ui/Text.tsx';
import { XpBar } from '../ui/XpBar.tsx';
import { CheckinNotes } from './CheckinNotes.tsx';
import { DayActions, DayBanners, PausedExercises } from './DayActions.tsx';
import { QuestCard } from './QuestCard.tsx';
import { InsightPanel } from './reading/InsightPanel.tsx';
import { ReadingCard } from './reading/ReadingCard.tsx';
import { SignInLost } from './SignInLost.tsx';
import { syncMark } from './syncLine.ts';
import { UpdateNeeded } from './UpdateNeeded.tsx';

export type TodayProps = {
  onSettings: () => void;
  onOpenQuest: (questId: number) => void;
  /** M8b: a cleared reading's "Read again" opens the article itself (emulator check). */
  onOpenReading?: (articleId: string) => void;
  onSwap: () => void;
  onPain: (questId: number) => void;
  onVanish: () => void;
  /** Settings → Training, from the one-time training notice (M6d). */
  onTraining: () => void;
  /** The check-in screen (M7a). */
  onCheckin: () => void;
  /** The Shadow's scene, opened again from its box (M7c decision 5). */
  onShadow?: () => void;
  /** The Trial of Stillness's focus session (M7c decision 7). */
  onTrial?: () => void;
  now?: () => number;
};

const SECTION: Record<QuestView['slot'], string> = {
  core: 'Core quest', side1: 'Side quests', side2: 'Side quests', article: "Today's reading", recovery: 'Recovery',
};

export function Today({
  onSettings, onOpenQuest, onOpenReading, onSwap, onPain, onVanish, onTraining, onCheckin, onShadow = () => {}, onTrial = () => {},
  now = Date.now,
}: TodayProps) {
  const insets = useSafeAreaInsets();
  const phase = useGame((s) => s.phase);
  const view = useGame((s) => s.view);
  const art = useGame((s) => s.art);
  const status = useGame((s) => s.status);
  const notices = useGame((s) => s.notices);
  const syncNow = useGame((s) => s.syncNow);
  const dismissNotice = useGame((s) => s.dismissNotice);
  const enqueue = useGame((s) => s.enqueue);
  const signInLost = useGame((s) => s.signInLost);
  const updateRequired = useGame((s) => s.updateRequired);
  const trainingNoticeSeen = useGame((s) => s.trainingNoticeSeen);
  const dismissTrainingNotice = useGame((s) => s.dismissTrainingNotice);

  const today = view?.today ?? null;
  const usable = today !== null && today.quests.length > 0 && Date.parse(today.endsAt!) > now();
  // Spec §1.4: the empty state always offers a retry, except while a sync is already running.
  const canRetry = status !== 'syncing';
  const mark = syncMark(status);
  // M7a: "paused" while a check-in waits, "held today" after "I just didn't".
  const note = view === null ? null : streakNote(view);
  // M7c: what the Shadow holds today (the mark, the seal), from the state; none without a pact.
  const hold = view === null ? null : shadowHold(view, now());

  const noticeBoxes = notices.map((n) => (
    <View key={n.eventId} style={{ gap: 8 }}>
      <NarrationBox>{noticeText(n.code)}</NarrationBox>
      <Button label="Got it" variant="secondary" onPress={() => dismissNotice(n.eventId)} />
    </View>
  ));

  let body;
  if (signInLost) {
    // M4 re-review: the sign-in is gone for good; starting again is the player's choice, confirmed, never automatic.
    body = <SignInLost />;
  } else if (!usable) {
    body = (
      <View style={{ gap: 16 }}>
        <NarrationBox>The System is preparing your trials.</NarrationBox>
        {canRetry && <Button label="Try again" variant="secondary" onPress={() => void syncNow()} />}
        {mark !== null && <Caption>{mark}</Caption>}
      </View>
    );
  } else {
    const quests = today!.quests;
    const titles = [...new Set(quests.map((q) => SECTION[q.slot]))];
    // Board F3 (M7c decision 6): the recovery quest comes first while it is open.
    const slots = quests.some((q) => q.slot === 'recovery' && q.completedAt === null)
      ? [SECTION.recovery, ...titles.filter((t) => t !== SECTION.recovery)]
      : titles;
    const sides = quests.filter((q) => q.slot === 'side1' || q.slot === 'side2');
    body = (
      <View style={{ gap: 30 }}>
        {view!.offline && <NarrationBox>{OFFLINE_TEXT.built}</NarrationBox>}
        <DayBanners today={today!} restDay={view!.character.restDay} />
        {hold !== null && hold.kind !== 'paused' && (
          <View style={{ gap: 8 }}>
            <ShadowBox lines={[shadowLine(hold.cleared ? 'release' : 'mark', today!.dayNumber)]} />
            <Button label={SHADOW_TEXT.reopen} variant="secondary" onPress={onShadow} style={{ alignSelf: 'flex-start' }} />
          </View>
        )}
        {slots.map((title) => {
          const inSection = quests.filter((q) => SECTION[q.slot] === title);
          const count = title === 'Side quests' ? `${sides.filter((q) => q.completedAt !== null).length} / ${sides.length}` : undefined;
          return (
            <View key={title} style={{ gap: 14 }}>
              {title === SECTION.side1 && hold !== null && hold.sealed && <TrialPanel onTrial={onTrial} />}
              <SectionTitle title={title} count={count} />
              {inSection.map((q) => {
                if (q.slot === 'article') {
                  // M8b decision 5: the reading card, and the Mage's Insight under it (decision 8).
                  return (
                    <View key={q.id} style={{ gap: 14 }}>
                      <ReadingCard
                        quest={q}
                        article={today!.article}
                        waiting={view!.waiting.has(q.id)}
                        onOpen={() => {
                          const article = today!.article;
                          if (q.completedAt !== null && article !== null && onOpenReading !== undefined) onOpenReading(article.id);
                          else onOpenQuest(q.id);
                        }}
                      />
                      {view!.insight !== null && <InsightPanel insight={view!.insight} onChoose={(cluster) => void enqueue({ type: 'insight', cluster })} />}
                    </View>
                  );
                }
                const sealed = sealedQuest(hold, q);
                return (
                  <QuestCard
                    key={q.id}
                    quest={q}
                    voice={view!.profile.voice}
                    classId={view!.profile.classId}
                    timeZone={today!.timeZone}
                    waiting={view!.waiting.has(q.id)}
                    onOpen={sealed ? onTrial : () => onOpenQuest(q.id)}
                    sealed={sealed}
                    artUri={q.slot === 'core' ? artUrl(art, artKey(authoredTemplate(q.templateId), q.condition), q.id) : null}
                    onPain={q.slot === 'core' && q.completedAt === null && isExercise(q) ? () => onPain(q.id) : undefined}
                    resting={q.completedAt === null && isResting(q, view!.paused)}
                  />
                );
              })}
            </View>
          );
        })}
        <DayActions view={view!} enqueue={enqueue} onSwap={onSwap} onVanish={onVanish} />
        <PausedExercises view={view!} enqueue={enqueue} />
      </View>
    );
  }

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            {today !== null && (
              <Label>{dayLabel(questDayDate({ startsAt: Date.parse(today.startsAt!), endsAt: Date.parse(today.endsAt!), timeZone: today.timeZone }))}</Label>
            )}
            <Display>{today !== null ? `DAY ${today.dayNumber}` : 'TODAY'}</Display>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={onSettings}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.chalk }}
          >
            <Icon name="settings" size={20} />
          </Pressable>
        </View>
        {view !== null && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <Heading>{view.profile.name.toUpperCase()}</Heading>
              <View style={{ paddingVertical: 3, paddingHorizontal: 10, backgroundColor: colors.paper, transform: [{ skewX: '-10deg' }] }}>
                <Label tone="ink">{`LV ${view.character.level} ${CLASS_NAMES[view.profile.classId]}`}</Label>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <XpBar value={view.character.xpIntoLevel} max={view.character.xpForLevel} label={`Level ${view.character.level} progress`} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Caption>{`${view.character.xpIntoLevel} / ${view.character.xpForLevel} XP`}</Caption>
                <Caption>{`Next: Lv ${view.character.level + 1}`}</Caption>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                <Icon name="flame" size={18} color={colors.ember} />
                <Heading tone="ember">{String(view.character.streak.current)}</Heading>
                <Small tone="chalk" style={{ flexShrink: 1 }}>{note === null ? 'day streak' : `day streak · ${note}`}</Small>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="shield" size={18} />
                <Heading>{String(view.character.streak.shields)}</Heading>
                <Small tone="chalk">of 2 shields</Small>
              </View>
            </View>
            {marked(hold) && <ShadowMark label={SHADOW_TEXT.mark} accessibilityLabel={SHADOW_TEXT.markLabel} />}
            {mark !== null && usable && <Body tone="ash">{mark}</Body>}
          </>
        )}
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        {updateRequired && <UpdateNeeded />}
        {view !== null && !trainingNoticeSeen && trainingUnset(view.profile) && (
          // Players from before M6c never chose a training setup: asked once (M6d decision 13).
          <View style={{ gap: 8 }}>
            <NarrationBox>{ADJUST_TEXT.training.notice}</NarrationBox>
            <Button label={ADJUST_TEXT.training.setUp} onPress={() => { void dismissTrainingNotice(); onTraining(); }} />
            <Button label={ADJUST_TEXT.day.notNow} variant="secondary" onPress={() => void dismissTrainingNotice()} />
          </View>
        )}
        {view !== null && <CheckinNotes view={view} onCheckin={onCheckin} now={now} />}
        {noticeBoxes}
        {body}
      </View>
    </ScreenScroll>
  );
}

/** Board F3: the Trial of Stillness above the sealed side quests (M7c decision 6). */
function TrialPanel({ onTrial }: { onTrial: () => void }) {
  return (
    <View style={{ gap: 10, padding: 16, borderWidth: 2, borderColor: colors.ember, backgroundColor: colors.panel }}>
      <Heading tone="ember">{SHADOW_TEXT.trial.title.toUpperCase()}</Heading>
      <Small tone="chalk">{SHADOW_TEXT.trial.line}</Small>
      <Button label={SHADOW_TEXT.trial.start} onPress={onTrial} />
    </View>
  );
}
