// Camp, the home (a simpler day, docs/2026-10-26-simpler-day.md; it was Today, spec §1.2–1.4, and the Camp tab). The day's
// header, the camp scene with this week's Grumble at the edge holding out today's quest, the battle strip, then one card:
// the check-in's question when one waits, the quest the Grumble brought, tonight's story, or "That's today". The
// check-off extras ride on the same card. Under it, only what the day needs (the System's notices, a pact's Shadow, the
// Trial, the Mage's Insight), what's done today, and the Grumble book. The day's options are one link away (DayOptions);
// the set-up cards moved to Me's Set up list. Loading, offline and failed states are as on Today (audit 11).
import {
  CAMP_TEXT, CLUSTER_NAMES, FEEDBACK_TEXT, GRUMBLES, OFFLINE_TEXT, PLAY_TEXT, SHADOW_TEXT, TODAY_TEXT, artKey, authoredTemplate, fillText, grumbleById,
  shadowLine,
} from '@levelmeup/content';
import { questDayDate } from '@levelmeup/rules';
import type { Rating } from '@levelmeup/rules';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storyPictureUrl } from '../art/stories.ts';
import { isExercise, isResting } from '../game/adjust.ts';
import { battleShown, questHit } from '../game/battle.ts';
import { noticeText } from '../game/notices.ts';
import { countsUntil } from '../game/offline.ts';
import { marked, sealedQuest, shadowHold } from '../game/pact.ts';
import { weekRecap } from '../game/week.ts';
import type { WeekRecap } from '../game/week.ts';
import type { ShadowHold } from '../game/pact.ts';
import type { Shown } from '../game/project.ts';
import { dayCleared, dayOff, openQuests, quickClearable, shownStreak, upNext, xpToday } from '../game/today.ts';
import type { QuestView, TodayView } from '../game/types.ts';
import { clockTime, dateLine, dayLabel } from '../lib/dates.ts';
import { asDeck, isStory } from '../reading/deck.ts';
import { useGame } from '../state/store.ts';
import type { GameState, Status } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { Appear, Glide } from '../ui/Appear.tsx';
import { Button } from '../ui/Button.tsx';
import { markJustCleared, useJustCleared } from '../ui/justCleared.ts';
import { SystemCard } from '../ui/NarrationBox.tsx';
import type { Power } from '../ui/PowerChip.tsx';
import { RowLink } from '../ui/RowLink.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { ShadowMark } from '../ui/ShadowMark.tsx';
import { TodaySkeleton } from '../ui/Skeleton.tsx';
import { StateNote } from '../ui/StateNote.tsx';
import { Caption, Heading, Label, Small, Title } from '../ui/Text.tsx';
import { dismissToast, toast, useToast } from '../ui/toast.ts';
import { buzz } from '../ui/haptics.ts';
import { play, warm } from '../ui/sound.ts';
import { BattleStrip } from './camp/BattleStrip.tsx';
import { CampScene } from './camp/CampScene.tsx';
import { CheckinAsk } from './camp/CheckinAsk.tsx';
import { GrumbleBook } from './camp/GrumbleBook.tsx';
import { DayEnd, FeelRow, QuestScroll, StoryCard } from './camp/QuestScroll.tsx';
import type { Extra } from './camp/QuestScroll.tsx';
import { CheckinNotes } from './CheckinNotes.tsx';
import { DayBanners } from './DayActions.tsx';
import { QuestRow, clearedQuestRow, questRowProps, questXp } from './QuestCard.tsx';
import { usePullToSync } from './pull.ts';
import { InsightPanel } from './reading/InsightPanel.tsx';
import { readingLength } from './reading/ReadingCard.tsx';
import { SignInLost } from './SignInLost.tsx';
import { syncMark } from './syncLine.ts';
import { keptToday } from './today/DayDone.tsx';
import { UpdateNeeded } from './UpdateNeeded.tsx';

const S = TODAY_TEXT.states;
const B = CAMP_TEXT.bubble;
/** How long the visitor cheers after power lands. */
export const CHEER_MS = 2500;

export type TodayProps = {
  onOpenQuest: (questId: number) => void;
  /** M8b: a cleared reading's "Read again" opens the article itself (emulator check). */
  onOpenReading?: (articleId: string) => void;
  /** The day's options: swap, hard day, rest, the class abilities, the paused exercises. */
  onDay: () => void;
  /** "I felt pain" for an exercise just cleared: pain always offers a rest (CLAUDE.md). */
  onPain?: (questId: number) => void;
  /** The Shadow's scene, opened again from its box (M7c decision 5). */
  onShadow?: () => void;
  /** The Trial of Stillness's focus session (M7c decision 7). */
  onTrial?: () => void;
  /** Whether Camp is in front: the route passes its focus (M10b review). */
  shown?: boolean;
  now?: () => number;
};

/** One of the System's notes (M12 decision 4): its words and what it offers. */
type Notice = { key: string; text: string; actions: { label: string; onPress: () => void }[] };

/** A day with quests that hasn't ended: Camp shows it, not a state. */
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

/** What the day stands at: what it needs, the one thing next, and what's open beside it. */
function dayState(view: Shown, today: TodayView, hold: ShadowHold | null) {
  const sealed = (q: QuestView) => sealedQuest(hold, q);
  const resting = (q: QuestView) => q.completedAt === null && isResting(q, view.paused);
  const cleared = dayCleared(today, resting);
  const done = cleared || dayOff(today);
  const next = done ? null : upNext(today, (q) => sealed(q) || resting(q));
  const rest = openQuests(today).filter((q) => q.id !== next?.id);
  return { sealed, resting, cleared, done, next, rest };
}

export function Today({ onOpenQuest, onOpenReading, onDay, onPain, onShadow = () => {}, onTrial = () => {}, shown = true, now = Date.now }: TodayProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const battle = view === null ? null : battleShown(view);
  // M17: a sync starting or ending over a usable day changes nothing Camp shows, so it doesn't draw again for it (every
  // tap starts one). Without a usable day the status shows: loading, offline, retrying.
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
  const offers = useGame((s) => s.offers);
  const markOffer = useGame((s) => s.markOffer);
  // M17: the offers wait until the phone knows who is signed in.
  const accountKnown = useGame((s) => s.accountKnown);
  const articles = useGame((s) => s.articles);
  const codex = useGame((s) => s.codex);
  const checkinLater = useGame((s) => s.checkinLater);
  /** Premium pass (review): a note shows at the bottom (the check circle's Undo among them), so the last row clears it. */
  const noting = useToast() !== null;
  /** Quests a check is on its way for: a quick second tap sends nothing (review). */
  const clearing = useRef(new Set<number>());
  const [showDone, setShowDone] = useState(false);
  /** M17: a pull down syncs now; the spinner stays until that sync is done. */
  const pull = usePullToSync();
  const justCleared = useJustCleared();

  const today = view?.today ?? null;
  const usable = today !== null && today.quests.length > 0 && Date.parse(today.endsAt!) > now();
  // M17 (perf audit 2026-10-20): never "Syncing…" here; offline and retrying still say so.
  const mark = status === 'syncing' ? null : syncMark(status);
  // M7c: what the Shadow holds today (the mark, the seal), from the state; none without a pact.
  const hold = view === null ? null : shadowHold(view, now());
  const open = (): boolean => today !== null && Date.parse(today.endsAt!) > now();
  const asking = view?.checkin != null && view.checkin.answer === null && view.checkin.id !== checkinLater;
  const day = usable && view !== null ? dayState(view, today, hold) : null;
  const visitor = battle === null ? undefined : grumbleById(battle.grumble);

  // The battle explained once, in the visitor's own words, on its first visit (it was the one-time System card). It counts
  // as said once the bubble said it and the player left Camp, or once power landed, so a decided battle's replay (which
  // waits for it) never covers it.
  const introNow = battle !== null && accountKnown && !offers.includes('monster:intro');
  const [intro, setIntro] = useState(false);
  /** The bubble has said it while Camp was in front. */
  const [introHeard, setIntroHeard] = useState(false);
  /** The first power landed: the battle has shown itself, so the intro is said. */
  const [introSaid, setIntroSaid] = useState(false);
  useEffect(() => {
    if (introNow) setIntro(true);
  }, [introNow]);
  useEffect(() => {
    if (introNow && (introSaid || (introHeard && !shown))) void markOffer('monster:intro');
  }, [introHeard, introSaid, introNow, shown, markOffer]);
  // M17: the first open of a new week, how last week went: one line under the scene, kept while Camp stays.
  const recapNow = view === null || !accountKnown || asking ? null : weekRecap(view.calendar, offers);
  const [recap, setRecap] = useState<WeekRecap | null>(null);
  useEffect(() => {
    if (recapNow === null || recap !== null) return;
    setRecap(recapNow);
    void markOffer(recapNow.key);
  }, [recapNow, recap, markOffer]);
  // When power rises while Camp is in front, the visitor flinches and cheers (it was the Arena's).
  const [gain, setGain] = useState({ key: 0, n: 0 });
  const [cheering, setCheering] = useState(false);
  /** The power Camp last showed: a claim on the quest screen lands while Camp is out of sight, and plays on coming back. */
  const lastPower = useRef(battle?.power ?? 0);
  const power = battle?.power ?? 0;
  useEffect(() => {
    if (!shown) return;
    const gained = power - lastPower.current;
    lastPower.current = power;
    if (gained <= 0) return;
    setGain((g) => ({ key: g.key + 1, n: gained }));
    setIntro(false);
    setIntroSaid(true);
    buzz('stamp');
  }, [power, shown]);
  useEffect(() => {
    if (gain.key === 0) return;
    setCheering(true);
    const t = setTimeout(() => setCheering(false), CHEER_MS);
    return () => clearTimeout(t);
  }, [gain.key]);
  // How it felt is asked while the player is at Camp; once they leave, the question goes (review).
  const feltAsked = useRef<number | null>(null);
  useEffect(() => {
    if (shown && justCleared !== null) feltAsked.current = justCleared;
    if (!shown && justCleared !== null && feltAsked.current === justCleared) {
      feltAsked.current = null;
      markJustCleared(null);
    }
  }, [shown, justCleared]);

  const R = TODAY_TEXT.states;
  const strip: Notice[] = [
    ...(refused
      ? [{ key: 'refused', text: unsent === 0 ? R.refused : unsent === 1 ? R.refusedOne : fillText(R.refusedSome, { n: unsent }),
          actions: [{ label: R.retry, onPress: () => void syncNow() }] }]
      : []),
    ...notices.map((n) => ({ key: n.eventId, text: noticeText(n.code), actions: [{ label: TODAY_TEXT.gotIt, onPress: () => void dismissNotice(n.eventId) }] })),
  ];

  /** M12 decision 3: a check circle clears a check-off quest as the quest screen's Done does; Undo takes it back. */
  const check = (q: QuestView, title: string) => {
    if (!open() || clearing.current.has(q.id)) return;
    clearing.current.add(q.id);
    play('claim');
    buzz('stamp'); // M17: a check you can feel, as a stamp landing
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
  // M17 (perf audit 2026-10-20): once Camp is drawn, the day's sounds get their players.
  useEffect(() => {
    const t = setTimeout(() => warm(['claim', 'undo', 'streak', 'dayDone', 'cardTurn']), 1500);
    return () => clearTimeout(t);
  }, []);
  // M12 decision 11: a warm chord the moment the day becomes done while Camp is in front (never on opening).
  const doneNow = day?.cleared ?? false;
  const wasDone = useRef<boolean | null>(null);
  useEffect(() => {
    if (wasDone.current === false && doneNow && shown) play('dayDone');
    wasDone.current = doneNow;
  }, [doneNow, shown]);

  const night = day?.done ?? false;
  const ready = battle !== null && !battle.decided && !battle.waiting && battle.power >= battle.need;
  const introText = visitor === undefined ? '' : fillText(B.intro, { name: visitor.name, standsFor: visitor.standsFor });
  const bubble = !usable || visitor === undefined ? null
    : asking ? (view?.checkin?.gap ? B.askGap : B.ask)
      : cheering ? B.cheer
        : intro ? introText
          : night ? B.asleep
            : ready ? B.ready
              : day?.next?.slot === 'article' ? B.story
                : day?.next != null ? (day.next.slot === 'core' ? B.gift : B.more) : null;
  const pose = asking || day === null ? 'idle' : night ? 'sleep' : day.next !== null ? 'gift' : 'idle';
  const saidIntro = intro && bubble === introText && shown;
  useEffect(() => {
    if (saidIntro) setIntroHeard(true);
  }, [saidIntro]);
  const friends = view?.camp === undefined ? [] : GRUMBLES.filter((g) => (view.camp!.wins[g.id] ?? 0) > 0).map((g) => g.id).reverse();

  let body;
  if (signInLost) {
    // M4 re-review: the sign-in is gone for good; starting again is the player's choice, confirmed, never automatic.
    body = <SignInLost />;
  } else if (!usable || day === null) {
    body = <NoDay view={view} status={status} ended={today !== null && Date.parse(today.endsAt!) <= now()} empty={today !== null && today.quests.length === 0}
      onRetry={() => void syncNow()} />;
  } else {
    body = (
      <DayBody view={view!} today={today} hold={hold} day={day} asking={asking} onPain={onPain} visitorName={visitor?.name ?? null} articles={articles}
        kept={keptToday(codex, today)} justCleared={justCleared} onOpenQuest={onOpenQuest} onOpenReading={onOpenReading} onDay={onDay}
        onShadow={onShadow} onTrial={onTrial} onCheck={check} showDone={showDone} onToggleDone={() => setShowDone((s) => !s)}
        onRate={(id, rating) => {
          if (!open()) return;
          void enqueue({ type: 'rate', instanceId: id, rating });
          if (rating !== 'too_hard') markJustCleared(null);
        }}
        onStepDown={(id) => { if (open()) void enqueue({ type: 'step_down', instanceId: id }); }}
        enqueue={enqueue}
        power={battle === null || battle.decided ? null : (q) => questHit(q, battle.weakness)} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <ScreenScroll contentContainerStyle={{ paddingBottom: noting ? 96 : 32 }} refresh={pull} tab="index">
        <View style={{ paddingTop: insets.top + 14, paddingHorizontal: space.gutter, paddingBottom: 4, gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 12 }}>
            <Title accessibilityRole="header">{today !== null ? `Day ${today.dayNumber}` : CAMP_TEXT.tabs.camp}</Title>
            {today !== null && (
              <Label>{dayLabel(questDayDate({ startsAt: Date.parse(today.startsAt!), endsAt: Date.parse(today.endsAt!), timeZone: today.timeZone }))}</Label>
            )}
          </View>
          {marked(hold) && <ShadowMark label={SHADOW_TEXT.mark} accessibilityLabel={SHADOW_TEXT.markLabel} />}
          {mark !== null && usable && <Caption>{mark}</Caption>}
        </View>
        {view !== null && (
          <CampScene classId={view.profile.classId} level={view.character.level} friends={friends}
            visitor={visitor === undefined || battle === null ? null : { id: visitor.id, weakness: visitor.weakness, pose }}
            bubble={bubble} night={night} gain={gain} />
        )}
        <View style={{ paddingHorizontal: space.gutter, gap: 20 }}>
          {battle !== null && usable && <BattleStrip battle={battle} timeZone={today!.timeZone} now={now} shown={shown} />}
          {recap !== null && <Small testID="week-recap">{recapLine(recap)}</Small>}
          {updateRequired && <UpdateNeeded />}
          {strip[0] !== undefined && (
            <SystemCard key={strip[0].key} testID="notice-strip" text={strip[0].text} actions={strip[0].actions}
              {...(strip.length > 1 ? { count: fillText(TODAY_TEXT.notices, { n: 1, total: strip.length }) } : {})} />
          )}
          {view !== null && asking && !signInLost && <CheckinAsk view={view} />}
          {view !== null && !signInLost && <CheckinNotes view={view} now={now} />}
          {body}
          {view?.camp !== undefined && <GrumbleBook wins={view.camp.wins} here={battle?.grumble ?? null} />}
        </View>
      </ScreenScroll>
    </View>
  );
}

/** "Last week: 4 of 6 days cleared, 1 rested. A new week has begun." */
function recapLine(recap: WeekRecap): string {
  const W = TODAY_TEXT.week;
  const rest = recap.rested === 0 ? '' : recap.rested === 1 ? W.restOne : fillText(W.rest, { n: recap.rested });
  return recap.cleared === 0 ? W.none : fillText(recap.cleared === 1 ? W.clearedOne : W.cleared, { n: recap.cleared, days: recap.days, rest });
}

type DayBodyProps = {
  view: Shown;
  today: TodayView;
  hold: ShadowHold | null;
  day: ReturnType<typeof dayState>;
  asking: boolean;
  visitorName: string | null;
  articles: GameState['articles'];
  kept: number;
  justCleared: number | null;
  onOpenQuest: (questId: number) => void;
  onOpenReading?: (articleId: string) => void;
  onDay: () => void;
  onShadow: () => void;
  onTrial: () => void;
  onCheck: (q: QuestView, title: string) => void;
  showDone: boolean;
  onToggleDone: () => void;
  onRate: (questId: number, rating: Rating) => void;
  onStepDown: (questId: number) => void;
  onPain?: (questId: number) => void;
  enqueue: GameState['enqueue'];
  /** Monster Week: the power each quest gives the battle, or null without one. */
  power: ((q: QuestView) => Power) | null;
};

/** A usable day: the one card, what's beside it, what the day needs, and what's done. */
function DayBody({
  view, today, hold, day, asking, visitorName, articles, kept, justCleared, onOpenQuest, onOpenReading, onDay, onShadow, onTrial, onCheck, showDone,
  onToggleDone, onRate, onStepDown, onPain, enqueue, power,
}: DayBodyProps) {
  const voice = view.profile.voice;
  // Premium pass A6: on a day built offline, until when what is cleared still counts, said before it passes.
  const countsBy = useGame((s) => (s.cached === null || !view.offline ? null : countsUntil(s.cached.state, s.pending, view)));
  const { sealed, resting, done, next, rest } = day;
  const cleared = today.quests.filter((q) => q.completedAt !== null);
  const anySealed = rest.some(sealed);
  const article = today.article;
  const titleOf = (q: QuestView) => (q.slot === 'article' && article !== null ? article.title : authoredTemplate(q.templateId).voice[voice].title);

  const openReading = (q: QuestView) => {
    if (q.completedAt !== null && article !== null && onOpenReading !== undefined) onOpenReading(article.id);
    else onOpenQuest(q.id);
  };
  const held = article === null ? null : (articles[article.id] ?? null);
  const deck = held === null ? null : asDeck(held.deck);
  const story = deck !== null && isStory(deck) ? deck : null;
  const length = article === null ? '' : readingLength(article, held);
  const extra = (q: QuestView): Extra => {
    const title = titleOf(q);
    // M8b: the reading has nothing to open until the day has its article.
    if (q.slot === 'article' && article === null) return { id: q.id, title: PLAY_TEXT.quest.article, line: '', waiting: false };
    if (q.slot === 'article' && article !== null) {
      return { id: q.id, title, line: `${CLUSTER_NAMES[article.cluster]} · ${length}`, onOpen: () => openReading(q), waiting: view.waiting.has(q.id),
        ...(power === null ? {} : { power: power(q) }) };
    }
    const isSealed = sealed(q);
    const row = questRowProps(q, voice, { resting: resting(q), sealed: isSealed, ...(power === null ? {} : { power: power(q) }) });
    return {
      id: q.id, title, line: isSealed ? SHADOW_TEXT.trial.sealed : row.line, waiting: view.waiting.has(q.id), ...(row.note === undefined ? {} : { note: row.note }),
      ...(row.accessibilityLabel === undefined ? {} : { label: row.accessibilityLabel }),
      onOpen: isSealed ? onTrial : () => onOpenQuest(q.id),
      ...(quickClearable(q, isSealed) ? { onCheck: () => onCheck(q, title) } : {}),
      ...(power === null || isSealed ? {} : { power: power(q) }),
    };
  };
  // The quest screen just cleared one: how did it feel (optional; never the reading, which has no rung).
  const felt = justCleared === null ? undefined : today.quests.find((q) => q.id === justCleared && q.completedAt !== null && q.slot !== 'article');
  const picture = story?.picture !== undefined ? storyPictureUrl(story.picture) : null;
  const kicker = (q: QuestView): string => {
    if (visitorName === null) return TODAY_TEXT.upNext;
    const said = q.slot === 'core' ? CAMP_TEXT.brought.core : q.slot === 'recovery' ? CAMP_TEXT.brought.recovery : CAMP_TEXT.brought.side;
    return fillText(said, { name: visitorName });
  };

  let card = null;
  if (asking) {
    card = null; // the check-in is asked first, above (one card)
  } else if (done) {
    card = (
      <DayEnd
        asleep={visitorName === null ? null : fillText(CAMP_TEXT.done.asleep, { name: visitorName })}
        line={shownStreak(view).counts ? TODAY_TEXT.dayDone.holds : TODAY_TEXT.dayDone.rest}
        facts={[
          ...(xpToday(today) > 0 ? [fillText(TODAY_TEXT.earned, { xp: xpToday(today) })] : []),
          ...(kept === 0 ? [] : [kept === 1 ? TODAY_TEXT.dayDone.kept : fillText(TODAY_TEXT.dayDone.keptMany, { n: kept })]),
        ]}
        next={fillText(CAMP_TEXT.done.next, { time: clockTime(today.endsAt!, today.timeZone) })}
        onChange={onDay}
        done={cleared.length === 0 ? null : (
          <View style={{ gap: 8 }}>
            <Label>{CAMP_TEXT.done.list}</Label>
            {cleared.map((q) => (q.slot === 'article'
              ? clearedQuestRow(q, voice, today.timeZone, view.waiting.has(q.id), () => openReading(q), article?.title)
              : clearedQuestRow(q, voice, today.timeZone, view.waiting.has(q.id), () => onOpenQuest(q.id))))}
          </View>
        )}
      />
    );
  } else if (next !== null && next.slot === 'article' && article !== null) {
    card = (
      <StoryCard title={article.title} length={length} xp={questXp(next)} picture={picture} waiting={view.waiting.has(next.id)}
        onRead={() => openReading(next)} extras={rest.map(extra)} {...(power === null ? {} : { power: power(next) })} />
    );
  } else if (next !== null) {
    const clears = quickClearable(next, false) && next.slot !== 'core' && next.slot !== 'recovery';
    card = (
      <QuestScroll kicker={kicker(next)} quest={next} voice={voice} waiting={view.waiting.has(next.id)}
        onGo={clears ? () => onCheck(next, titleOf(next)) : () => onOpenQuest(next.id)} onChange={onDay} extras={rest.map(extra)}
        art={{ classId: view.profile.classId, key: artKey(authoredTemplate(next.templateId), next.condition) }}
        {...(power === null ? {} : { power: power(next) })} />
    );
  }
  const extrasAfter = done ? rest : [];

  return (
    // M17: rows that arrive with the day don't fade in; those that come and go later do.
    <LayoutAnimationConfig skipEntering>
    <View style={{ gap: 20 }}>
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
      {felt !== undefined && !asking && (
        <Appear>
          <FeelRow key={felt.id} title={titleOf(felt)} rating={felt.rating} canStepDown={felt.canStepDown}
            onRate={(r) => onRate(felt.id, r)} onStepDown={() => onStepDown(felt.id)}
            {...(onPain !== undefined && isExercise(felt) ? { onPain: () => onPain(felt.id) } : {})} />
        </Appear>
      )}
      {card}
      {anySealed && <TrialPanel onTrial={onTrial} />}
      {view.insight !== null && <InsightPanel insight={view.insight} onChoose={(cluster) => void enqueue({ type: 'insight', cluster })} />}
      {extrasAfter.length > 0 && (
        <Appear style={{ gap: 10 }}>
          <SectionTitle title={TODAY_TEXT.extra} count={TODAY_TEXT.optional} />
          {extrasAfter.map((q) => {
            const e = extra(q);
            return (
              <Appear key={q.id}>
                {e.onOpen === undefined ? <Small>{e.title}</Small> : (
                  <QuestRow title={e.title} line={e.line} xp={questXp(q)} waiting={e.waiting} onOpen={e.onOpen}
                    {...(e.onCheck === undefined ? {} : { onCheck: e.onCheck })} {...(e.power === undefined ? {} : { power: e.power })} />
                )}
              </Appear>
            );
          })}
        </Appear>
      )}
      {!done && cleared.length > 0 && (
        <Glide style={{ gap: 10 }}>
          <RowLink label={fillText(TODAY_TEXT.doneToday, { n: cleared.length })} open={showDone} onPress={onToggleDone} />
          {showDone && cleared.map((q) => (
            <Appear key={q.id}>
              {q.slot === 'article'
                ? clearedQuestRow(q, voice, today.timeZone, view.waiting.has(q.id), () => openReading(q), article?.title)
                : clearedQuestRow(q, voice, today.timeZone, view.waiting.has(q.id), () => onOpenQuest(q.id))}
            </Appear>
          ))}
        </Glide>
      )}
    </View>
    </LayoutAnimationConfig>
  );
}
