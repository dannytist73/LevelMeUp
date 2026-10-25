// Today (spec §1.2–1.4, D1 board), M4's read-only version (the tabs send a player with no character to the onboarding):
// the day's header and every quest of the day, with the §1.4 loading, empty and offline states. Every quest opens its
// quest screen (M6a); M6b adds the day's adjustments (DayActions.tsx); M7a the check-in (CheckinNotes.tsx). M8b: today's
// reading and the Mage's Insight. M7c: after "I just didn't" under a pact, the Shadow's mark and box, the recovery quest
// first, and at level 2 the Trial above the sealed side quests (board F3). M10b: the streak's flare ticks.
// M12 (Round 3, boards R3-1 and R3-4; audit 1, 3, 11, 12): a tighter header, the notices in one strip, "Up next" with the
// screen's only bright button, the other open quests as quiet rows (a check-off quest's circle clears it, with Undo),
// the day done once its core quest and reading are, side quests then optional, and the cleared ones folded away.
import {
  ADJUST_TEXT, FEEDBACK_TEXT, MONSTER_TEXT, OFFLINE_TEXT, PLUS_TEXT, SETUP_TEXT, SHADOW_TEXT, TODAY_TEXT, authoredTemplate, fillText, shadowLine,
} from '@levelmeup/content';
import { questDayDate } from '@levelmeup/rules';
import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isExercise, isResting } from '../game/adjust.ts';
import { battleShown, questHit } from '../game/battle.ts';
import { trainingUnset } from '../game/character.ts';
import { noticeText } from '../game/notices.ts';
import { countsUntil } from '../game/offline.ts';
import { marked, sealedQuest, shadowHold } from '../game/pact.ts';
import { programOffered, setupCard } from '../game/setup.ts';
import { weekRecap } from '../game/week.ts';
import type { SetupCard } from '../game/setup.ts';
import type { ShadowHold } from '../game/pact.ts';
import type { Shown } from '../game/project.ts';
import { dayCleared, dayOff, openQuests, quickClearable, upNext } from '../game/today.ts';
import type { QuestView, TodayView } from '../game/types.ts';
import { clockTime, dateLine, dayLabel } from '../lib/dates.ts';
import { plusCard, plusOf } from '../plus/plus.ts';
import { manageUrl, purchasesSetUp } from '../plus/purchases.ts';
import { useGame } from '../state/store.ts';
import type { Status } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { Appear, Glide } from '../ui/Appear.tsx';
import { Button } from '../ui/Button.tsx';
import { SystemCard } from '../ui/NarrationBox.tsx';
import { RowLink } from '../ui/RowLink.tsx';
import { ScreenHeader } from '../ui/ScreenHeader.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { ShadowMark } from '../ui/ShadowMark.tsx';
import { TodaySkeleton } from '../ui/Skeleton.tsx';
import { StateNote } from '../ui/StateNote.tsx';
import { SettingsButton } from '../ui/TabTop.tsx';
import { Caption, Heading, Label, Small, Title } from '../ui/Text.tsx';
import type { Power } from '../ui/PowerChip.tsx';
import { dismissToast, toast, useToast } from '../ui/toast.ts';
import { buzz } from '../ui/haptics.ts';
import { play, warm } from '../ui/sound.ts';
import { CheckinNotes } from './CheckinNotes.tsx';
import { DayActions, DayBanners, PausedExercises } from './DayActions.tsx';
import { QuestRow, UpNextCard, clearedQuestRow, questRowProps } from './QuestCard.tsx';
import { usePullToSync } from './pull.ts';
import { InsightPanel } from './reading/InsightPanel.tsx';
import { ReadingHero, ReadingRow } from './reading/ReadingCard.tsx';
import { SignInLost } from './SignInLost.tsx';
import { syncMark } from './syncLine.ts';
import { Arena } from './today/Arena.tsx';
import { DayDonePanel, ReminderOffer } from './today/DayDone.tsx';
import { UpdateNeeded } from './UpdateNeeded.tsx';

const S = TODAY_TEXT.states;

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
  /** M12 decision 8, the set-up cards: Settings → Your game (the voice), the slip question, the vow. */
  onGame?: () => void;
  onSlip?: () => void;
  onVow?: () => void;
  /** M13: the Plus offer, from the one-time "a week in" card. */
  onPlus?: () => void;
  /** Whether Today is in front: the route passes its focus (M10b review). */
  shown?: boolean;
  now?: () => number;
};

/** One item of the notice strip (M12 decision 4): its words and what it offers. */
type Notice = { key: string; text: string; actions: { label: string; onPress: () => void }[] };

/** The notices, one at a time, in one strip (audit 3): "1 of 3" while more wait. M17: one card, its answers inside it. */
function NoticeStrip({ items }: { items: readonly Notice[] }) {
  const first = items[0];
  if (first === undefined) return null;
  return (
    <SystemCard key={first.key} testID="notice-strip" text={first.text} actions={first.actions}
      {...(items.length > 1 ? { count: fillText(TODAY_TEXT.notices, { n: 1, total: items.length }) } : {})} />
  );
}

/** A set-up card's words and buttons; `answer` marks it offered, then goes where the button says. */
function setupNotice(
  card: SetupCard,
  answer: (go?: () => void) => void,
  go: { onSettings: () => void; onGame: () => void; onTraining: () => void; onSlip: () => void; onVow: () => void },
): Notice {
  const S = SETUP_TEXT;
  const later = { label: S.notNow, onPress: () => answer() };
  switch (card) {
    case 'save': return { key: card, text: S.save.line, actions: [{ label: S.save.go, onPress: () => answer(go.onSettings) }, later] };
    case 'voice': return { key: card, text: S.voice.line, actions: [{ label: S.voice.go, onPress: () => answer(go.onGame) }, { label: S.voice.keep, onPress: () => answer() }] };
    case 'gear': return { key: card, text: S.gear.line, actions: [{ label: S.gear.go, onPress: () => answer(go.onTraining) }, later] };
    case 'slip': return { key: card, text: S.slip.line, actions: [{ label: S.slip.go, onPress: () => answer(go.onSlip) }, later] };
    case 'vow': return { key: card, text: S.vow.line, actions: [{ label: S.vow.go, onPress: () => answer(go.onVow) }, later] };
  }
}

/** A day with quests that hasn't ended: Today shows it, not a state. */
const dayShown = (view: Shown | null, at: number): boolean =>
  view?.today != null && view.today.quests.length > 0 && Date.parse(view.today.endsAt!) > at;

/** Not a usable day (audit 11): loading is a skeleton; offline, a failed reach and an ended day each say what they are. */
function NoDay({ view, status, ended, empty, onRetry }: { view: Shown | null; status: Status; ended: boolean; empty: boolean; onRetry: () => void }) {
  if (status === 'syncing') return <TodaySkeleton />;
  const retry = { label: S.retry, onPress: onRetry };
  // A day still running with no quests (review): the rules protect it; it isn't "ended".
  if (view !== null && empty && !ended) return <StateNote kind="empty" title={S.none} line={S.noneLine} />;
  if (status === 'offline') return <StateNote kind="offline" title={S.offline} line={S.offlineLine} action={retry} />;
  if (status === 'retrying') return <StateNote kind="failed" title={S.failed} line={S.failedLine} action={retry} />;
  if (view !== null && ended) return <StateNote kind="empty" title={S.ended} line={S.endedLine} action={retry} />;
  return <StateNote kind="empty" title={S.waiting} line={S.waitingLine} action={retry} />;
}

/** Board F3: the Trial of Stillness above the sealed side quests (M7c decision 6). */
function TrialPanel({ onTrial }: { onTrial: () => void }) {
  return (
    <View style={{ gap: 10, padding: 16, borderRadius: radius.card, borderWidth: space.border, borderColor: colors.shadow, backgroundColor: colors.panel }}>
      <Heading tone="shadow">{SHADOW_TEXT.trial.title}</Heading>
      <Small tone="chalk">{SHADOW_TEXT.trial.line}</Small>
      <Button label={SHADOW_TEXT.trial.start} variant="secondary" onPress={onTrial} />
    </View>
  );
}

export function Today({
  onSettings, onOpenQuest, onOpenReading, onSwap, onPain, onVanish, onTraining, onCheckin, onShadow = () => {}, onTrial = () => {},
  onGame = () => {}, onSlip = () => {}, onVow = () => {}, onPlus = () => {}, shown = true, now = Date.now,
}: TodayProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  // Monster Week: the battle on top of Today (the streak and the XP bar moved to Me).
  const battle = view === null ? null : battleShown(view);
  // M17: a sync starting or ending over a usable day changes nothing Today shows, so Today doesn't draw again for it
  // (every tap starts one). Without a usable day the status shows: loading, offline, retrying.
  const status = useGame((s): Status => (s.status === 'syncing' && dayShown(s.view, now()) ? 'idle' : s.status));
  const notices = useGame((s) => s.notices);
  const syncNow = useGame((s) => s.syncNow);
  const dismissNotice = useGame((s) => s.dismissNotice);
  const enqueue = useGame((s) => s.enqueue);
  const signInLost = useGame((s) => s.signInLost);
  /** Premium pass A3: the System refused the last sync (a refusal that won't pass by itself), and what still waits. */
  const refused = useGame((s) => s.error !== null);
  const unsent = useGame((s) => s.pending.length);
  const updateRequired = useGame((s) => s.updateRequired);
  const trainingNoticeSeen = useGame((s) => s.trainingNoticeSeen);
  const dismissTrainingNotice = useGame((s) => s.dismissTrainingNotice);
  const offers = useGame((s) => s.offers);
  const markOffer = useGame((s) => s.markOffer);
  const saved = useGame((s) => s.account.kind === 'saved');
  // M17: the offers wait until the phone knows who is signed in, so a saved player never sees "save your character" flash.
  const accountKnown = useGame((s) => s.accountKnown);
  const vow = useGame((s) => s.vow);
  /** Premium pass (review): a note shows at the bottom (the check circle's Undo among them), so the last row clears it. */
  const noting = useToast() !== null;
  /** Quests a check is on its way for: a quick second tap sends nothing (review). */
  const clearing = useRef(new Set<number>());
  const [showDone, setShowDone] = useState(false);
  /** M17: a pull down on Today syncs now; the spinner stays until that sync is done. */
  const pull = usePullToSync();

  const today = view?.today ?? null;
  const usable = today !== null && today.quests.length > 0 && Date.parse(today.endsAt!) > now();
  // M17 (perf audit 2026-10-20): never "Syncing…" here: every tap starts a sync of about a second, and the line came and
  // went in the header, moving everything below it twice. Offline and retrying still say so; a quest that waits says "will sync".
  const mark = status === 'syncing' ? null : syncMark(status);
  // M7c: what the Shadow holds today (the mark, the seal), from the state; none without a pact.
  const hold = view === null ? null : shadowHold(view, now());
  const open = (): boolean => today !== null && Date.parse(today.endsAt!) > now();

  const R = TODAY_TEXT.states;
  const strip: Notice[] = [
    ...(refused
      ? [{ key: 'refused', text: unsent === 0 ? R.refused : unsent === 1 ? R.refusedOne : fillText(R.refusedSome, { n: unsent }),
          actions: [{ label: R.retry, onPress: () => void syncNow() }] }]
      : []),
    ...(view !== null && !trainingNoticeSeen && trainingUnset(view.profile)
      // Players from before M6c never chose a training setup: asked once (M6d decision 13).
      ? [{ key: 'training', text: ADJUST_TEXT.training.notice, actions: [
          { label: ADJUST_TEXT.training.setUp, onPress: () => { void dismissTrainingNotice(); onTraining(); } },
          { label: ADJUST_TEXT.day.notNow, onPress: () => void dismissTrainingNotice() },
        ] }]
      : []),
    ...notices.map((n) => ({ key: n.eventId, text: noticeText(n.code), actions: [{ label: TODAY_TEXT.gotIt, onPress: () => void dismissNotice(n.eventId) }] })),
  ];
  // Monster Week: what the battles are, once, before anything else is offered.
  if (battle !== null && accountKnown && !offers.includes('monster:intro')) {
    strip.push({ key: 'monster:intro', text: MONSTER_TEXT.intro.line, actions: [{ label: MONSTER_TEXT.intro.go, onPress: () => void markOffer('monster:intro') }] });
  }
  // M12 decision 8: one set-up card at a time, after the System's notices.
  const card = view === null || !accountKnown ? null : setupCard({ view, offers, saved, vow });
  if (card !== null) strip.push(setupNotice(card, (go) => { void markOffer(`setup:${card}`); go?.(); }, { onSettings, onGame, onTraining, onSlip, onVow }));
  // M13: Plus's one-time cards (a week in; a free trial's last two days), never while a set-up card waits.
  const plusNote = card !== null || view === null || !accountKnown ? null : plusCard(view, offers, now(), purchasesSetUp());
  // M16 decision 9: the weekly program, offered once, never beside another card.
  if (accountKnown && card === null && plusNote === null && view !== null && programOffered(view, offers)) {
    const T = ADJUST_TEXT.training;
    strip.push({ key: 'program', text: T.offer, actions: [
      { label: T.offerGo, onPress: () => { void markOffer('program'); onTraining(); } },
      { label: ADJUST_TEXT.day.notNow, onPress: () => void markOffer('program') },
    ] });
  }
  // M17: the first open of a new week, how last week went (game/week.ts), after anything else waiting. It waits while a
  // check-in asks its question: that matters more, and two cards would push Up next down.
  const checkinLater = useGame((s) => s.checkinLater);
  const asking = view?.checkin != null && ((view.checkin.answer === null && view.checkin.id !== checkinLater) || view.checkin.answer === 'just_didnt');
  const recap = view === null || !accountKnown || asking ? null : weekRecap(view.calendar, offers);
  if (recap !== null) {
    const W = TODAY_TEXT.week;
    const rest = recap.rested === 0 ? '' : recap.rested === 1 ? W.restOne : fillText(W.rest, { n: recap.rested });
    const text = recap.cleared === 0 ? W.none : fillText(recap.cleared === 1 ? W.clearedOne : W.cleared, { n: recap.cleared, days: recap.days, rest });
    strip.push({ key: recap.key, text, actions: [{ label: TODAY_TEXT.gotIt, onPress: () => void markOffer(recap.key) }] });
  }
  if (plusNote !== null && view !== null) {
    const P = PLUS_TEXT;
    const plus = plusOf(view);
    const done = (go?: () => void) => { void markOffer(`plus:${plusNote}`); go?.(); };
    strip.push(plusNote === 'day7'
      ? { key: 'plus:day7', text: `${P.day7.title}. ${P.day7.line}`, actions: [{ label: P.day7.see, onPress: () => done(onPlus) }, { label: P.day7.later, onPress: () => done() }] }
      : {
          key: 'plus:trial',
          text: `${fillText(P.trialCard.title, { date: dateLine(Date.parse(plus.endsAt!), view.profile.timeZone) })}. ${P.trialCard.line}`,
          actions: [
            { label: P.trialCard.manage, onPress: () => done(() => void Linking.openURL(manageUrl(plus.product)).catch(() => {})) },
            { label: P.trialCard.later, onPress: () => done() },
          ],
        });
  }

  /** M12 decision 3: a check circle clears a check-off quest as the quest screen's Mark cleared does; Undo takes it back. */
  const check = (q: QuestView, title: string) => {
    if (!open() || clearing.current.has(q.id)) return;
    clearing.current.add(q.id);
    play('claim');
    buzz('stamp'); // M17: a check you can feel, as a stamp landing
    // The Undo note is the app's own (review: Today's and the app's notes stacked in one place).
    const note = toast(fillText(TODAY_TEXT.markedDone, { title }), { label: TODAY_TEXT.undo, onPress: () => undo(q.id) });
    enqueue({ type: 'complete', instanceId: q.id, completedAt: now(), rating: null, payload: {} }).catch(() => {
      // Premium pass A7: not saved, so never "cleared": the Undo note goes and the app says so.
      clearing.current.delete(q.id);
      dismissToast(note);
      toast(FEEDBACK_TEXT.saveFailed);
    });
  };
  const undo = (id: number) => {
    if (!open()) return;
    clearing.current.delete(id);
    play('undo');
    void enqueue({ type: 'undo', instanceId: id });
  };
  // M17 (perf audit 2026-10-20): once Today is drawn, the day's sounds get their players, so the first Claim sounds as it
  // lands.
  useEffect(() => {
    const t = setTimeout(() => warm(['claim', 'undo', 'streak', 'dayDone', 'cardTurn']), 1500);
    return () => clearTimeout(t);
  }, []);
  // M12 decision 11: a warm chord the moment the day becomes done while Today is in front (never on opening).
  const paused = view?.paused;
  const doneNow = today !== null && usable && dayCleared(today, (q) => q.completedAt === null && isResting(q, paused ?? []));
  const wasDone = useRef<boolean | null>(null);
  useEffect(() => {
    if (wasDone.current === false && doneNow && shown) play('dayDone');
    wasDone.current = doneNow;
  }, [doneNow, shown]);

  let body;
  if (signInLost) {
    // M4 re-review: the sign-in is gone for good; starting again is the player's choice, confirmed, never automatic.
    body = <SignInLost />;
  } else if (!usable) {
    body = <NoDay view={view} status={status} ended={today !== null && Date.parse(today.endsAt!) <= now()} empty={today !== null && today.quests.length === 0}
      onRetry={() => void syncNow()} />;
  } else {
    body = (
      <DayBody view={view!} today={today!} hold={hold} onOpenQuest={onOpenQuest} onOpenReading={onOpenReading} onPain={onPain}
        onShadow={onShadow} onTrial={onTrial} onSwap={onSwap} onVanish={onVanish} onCheck={check} showDone={showDone}
        onToggleDone={() => setShowDone((s) => !s)} enqueue={enqueue}
        power={battle === null || battle.decided ? null : (q) => questHit(q, battle.weakness)} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <ScreenScroll contentContainerStyle={{ paddingBottom: noting ? 96 : 32 }} refresh={pull} tab="index">
        {/* M17: a shorter header (about 50 dp less), so Up next's button stays above the fold with a note waiting: the date
            beside "Day N", and the level on the XP bar's line (name and class live on Character). */}
        <ScreenHeader style={{ paddingTop: insets.top + 12, paddingBottom: 16, gap: 12, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <View style={{ flexShrink: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 12 }}>
              <Title accessibilityRole="header">{today !== null ? `Day ${today.dayNumber}` : 'Today'}</Title>
              {today !== null && (
                <Label>{dayLabel(questDayDate({ startsAt: Date.parse(today.startsAt!), endsAt: Date.parse(today.endsAt!), timeZone: today.timeZone }))}</Label>
              )}
              {view !== null && <Label tone="accentText">{fillText(MONSTER_TEXT.arena.level, { level: view.character.level })}</Label>}
            </View>
            <SettingsButton onPress={onSettings} />
          </View>
          {view !== null && (
            <>
              {marked(hold) && <ShadowMark label={SHADOW_TEXT.mark} accessibilityLabel={SHADOW_TEXT.markLabel} />}
              {mark !== null && usable && <Caption>{mark}</Caption>}
            </>
          )}
        </ScreenHeader>
        <View style={{ paddingHorizontal: space.gutter, gap: 22 }}>
          {updateRequired && <UpdateNeeded />}
          {battle !== null && usable && <Arena battle={battle} timeZone={today!.timeZone} now={now} shown={shown} />}
          {view !== null && <CheckinNotes view={view} onCheckin={onCheckin} now={now} />}
          <NoticeStrip items={strip} />
          {body}
        </View>
      </ScreenScroll>
    </View>
  );
}

type DayBodyProps = {
  view: Shown;
  today: TodayView;
  hold: ShadowHold | null;
  onOpenQuest: (questId: number) => void;
  onOpenReading?: (articleId: string) => void;
  onPain: (questId: number) => void;
  onShadow: () => void;
  onTrial: () => void;
  onSwap: () => void;
  onVanish: () => void;
  onCheck: (q: QuestView, title: string) => void;
  showDone: boolean;
  onToggleDone: () => void;
  enqueue: Parameters<typeof DayActions>[0]['enqueue'];
  /** Monster Week: the power each quest gives the battle, or null without one. */
  power: ((q: QuestView) => Power) | null;
};

/** A usable day: Up next or the day done, the other open quests, the day's options, and what's cleared. */
function DayBody({
  view, today, hold, onOpenQuest, onOpenReading, onPain, onShadow, onTrial, onSwap, onVanish, onCheck, showDone, onToggleDone, enqueue, power,
}: DayBodyProps) {
  const voice = view.profile.voice;
  // Premium pass A6: on a day built offline, until when what is cleared still counts, said before it passes.
  const countsBy = useGame((s) => (s.cached === null || !view.offline ? null : countsUntil(s.cached.state, s.pending, view)));
  const sealed = (q: QuestView) => sealedQuest(hold, q);
  const resting = (q: QuestView) => q.completedAt === null && isResting(q, view.paused);
  /** The day's must-dos are cleared (resting ones excused); or the rules protect the day, so nothing is asked of it. */
  const cleared_ = dayCleared(today, resting);
  const done = cleared_ || dayOff(today);
  const next = done ? null : upNext(today, (q) => sealed(q) || resting(q));
  const rest = openQuests(today).filter((q) => q.id !== next?.id);
  /** Before the day is done, everything left is "Then"; after, the side quests are optional extras. */
  const then = done ? [] : rest;
  const extras = done ? rest : [];
  const cleared = today.quests.filter((q) => q.completedAt !== null);
  const anySealed = rest.some(sealed);

  const openReading = (q: QuestView) => {
    if (q.completedAt !== null && today.article !== null && onOpenReading !== undefined) onOpenReading(today.article.id);
    else onOpenQuest(q.id);
  };
  // M17: each row fades in and out, and the rows under it glide (Appear).
  const row = (q: QuestView) => {
    if (q.slot === 'article') {
      return (
        <Appear key={q.id}>
          <ReadingRow quest={q} article={today.article} waiting={view.waiting.has(q.id)} onOpen={() => openReading(q)} {...(power === null ? {} : { power: power(q) })} />
        </Appear>
      );
    }
    const isSealed = sealed(q);
    const title = authoredTemplate(q.templateId).voice[voice].title;
    const checkable = quickClearable(q, isSealed);
    return (
      <Appear key={q.id}>
        <QuestRow {...questRowProps(q, voice, { resting: resting(q), sealed: isSealed, ...(checkable ? { onCheck: () => onCheck(q, title) } : {}), ...(power === null ? {} : { power: power(q) }) })}
          waiting={view.waiting.has(q.id)} onOpen={isSealed ? onTrial : () => onOpenQuest(q.id)} />
      </Appear>
    );
  };

  return (
    // M17: rows that arrive with the day don't fade in; those that come and go later do.
    <LayoutAnimationConfig skipEntering>
    <View style={{ gap: 26 }}>
      {view.offline && (
        <StateNote kind="offline" title={OFFLINE_TEXT.built} line={countsBy === null ? undefined
          : fillText(OFFLINE_TEXT.countsBy, { when: `${dateLine(countsBy, today.timeZone)}, ${clockTime(new Date(countsBy).toISOString(), today.timeZone)}` })} />
      )}
      <DayBanners today={today} restDay={view.character.restDay} />
      {hold !== null && hold.kind !== 'paused' && (
        <View style={{ gap: 8 }}>
          <ShadowBox lines={[shadowLine(hold.cleared ? 'release' : 'mark', today.dayNumber)]} />
          <Button label={SHADOW_TEXT.reopen} variant="secondary" onPress={onShadow} style={{ alignSelf: 'flex-start' }} />
        </View>
      )}

      {cleared_ && (
        <View style={{ gap: 16 }}>
          <DayDonePanel view={view} today={today} />
          <ReminderOffer />
        </View>
      )}

      {next !== null && (
        <View style={{ gap: 12 }}>
          {next.slot === 'article' && today.article !== null ? (
            <ReadingHero quest={next} article={today.article} waiting={view.waiting.has(next.id)} onOpen={() => openReading(next)} lead={TODAY_TEXT.upNext}
              {...(power === null ? {} : { power: power(next) })} />
          ) : (
            <UpNextCard
              quest={next}
              voice={voice}
              waiting={view.waiting.has(next.id)}
              // The core quest always opens its screen (steps, safety, Cleared); a check-off side quest clears here (review).
              onGo={quickClearable(next, false) && next.slot !== 'core' ? () => onCheck(next, authoredTemplate(next.templateId).voice[voice].title) : () => onOpenQuest(next.id)}
              resting={resting(next)}
              {...(power === null ? {} : { power: power(next) })}
            />
          )}
          <DayActions view={view} enqueue={enqueue} onSwap={onSwap} onVanish={onVanish}
            onPain={next.slot === 'core' && isExercise(next) ? () => onPain(next.id) : undefined} />
        </View>
      )}

      {then.length > 0 && (
        <Appear style={{ gap: 10 }}>
          <SectionTitle title={TODAY_TEXT.then} count={fillText(TODAY_TEXT.left, { n: then.length })} />
          {anySealed && <TrialPanel onTrial={onTrial} />}
          {then.map(row)}
        </Appear>
      )}

      {view.insight !== null && <InsightPanel insight={view.insight} onChoose={(cluster) => void enqueue({ type: 'insight', cluster })} />}

      {extras.length > 0 && (
        <Appear style={{ gap: 10 }}>
          <SectionTitle title={TODAY_TEXT.extra} count={TODAY_TEXT.optional} />
          {anySealed && <TrialPanel onTrial={onTrial} />}
          {extras.map(row)}
        </Appear>
      )}

      {next === null && <DayActions view={view} enqueue={enqueue} onSwap={onSwap} onVanish={onVanish} />}

      {cleared.length > 0 && (
        <Glide style={{ gap: 10 }}>
          <RowLink label={fillText(TODAY_TEXT.doneToday, { n: cleared.length })} open={showDone} onPress={onToggleDone} />
          {showDone && cleared.map((q) => (
            <Appear key={q.id}>
              {q.slot === 'article'
                ? clearedQuestRow(q, voice, today.timeZone, view.waiting.has(q.id), () => openReading(q), today.article?.title)
                : clearedQuestRow(q, voice, today.timeZone, view.waiting.has(q.id), () => onOpenQuest(q.id))}
            </Appear>
          ))}
        </Glide>
      )}
      <PausedExercises view={view} enqueue={enqueue} />
    </View>
    </LayoutAnimationConfig>
  );
}
