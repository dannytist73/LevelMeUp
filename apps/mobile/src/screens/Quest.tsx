// A quest, opened from Today (spec §3.1, §3.4, §3.6; M6a decisions 1–10): its picture, its words in the player's voice,
// why it was picked, how to do it, the safety lines, and the panel that logs it. A cleared quest shows "Quest cleared".
// M6b: "I felt pain" under the safety lines, a swap, and the hard-day tag. M6c: a workout's log, and a way to change the
// equipment or program. M10c: a logged workout or rep log is remembered on this phone for next time (decision 7).
// M12 (Round 3, board R3-2; audit 2, 9, 10, 12): one top bar; the title, then the log first, its button fixed at the
// bottom; How and Why fold below, Safety stays open; Cleared leads on to the next quest; a half-written takeaway waits.
// A simpler day (docs/2026-10-26-simpler-day.md, decisions 4, 6 and 10): the buddy doing it and the steps open at the top;
// a rep log or a workout claims its target with one tap ("Did different numbers?" opens the log); a claim goes straight
// back to Camp with the app's note and Undo (Camp asks how it felt), so Cleared shows only for a quest reopened later;
// Change today is in the top bar; and today's story is one scroll that ends on three lines to take with you.
import {
  ADJUST_TEXT, BOOK_TEXT, BUDDIES, BUDDY_TEXT, CAMP_TEXT, CLUSTER_NAMES, EXERCISE_SAFETY_LINE, NOTIFY_TEXT, PLAY_TEXT, READING_TEXT, SHADOW_TEXT, STAT_NAMES,
  TODAY_TEXT, artKey, authoredTemplate, fillText, programBlockLabel, questSummary, renderWhy, shadowLine, targetText,
} from '@levelmeup/content';
import type { Rating } from '@levelmeup/rules';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { timerTargetMs } from '../../../../supabase/functions/_shared/events.ts';
import { isResting } from '../game/adjust.ts';
import { findQuest } from '../game/offline.ts';
import { sealedQuest, shadowHold } from '../game/pact.ts';
import { upNext } from '../game/today.ts';
import { clearedSummary } from '../quest/cleared.ts';
import { questKey, sessionMemory, startFromLast } from '../quest/lastSets.ts';
import { repsPayload, sessionPayload, startingSets, textPayload } from '../quest/payload.ts';
import type { Shot } from '../quest/cleared.ts';
import { NEW_TIMER, pauseTimer } from '../quest/timer.ts';
import type { TimerState } from '../quest/timer.ts';
import { readDraft, restoredDraft, writeDraft } from '../state/drafts.ts';
import { useGame } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { Appear } from '../ui/Appear.tsx';
import { Button } from '../ui/Button.tsx';
import { Chip } from '../ui/Chip.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { QuestArt } from '../ui/QuestArt.tsx';
import { RowLink } from '../ui/RowLink.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { Body, Caption, Label, Small, Title } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { questXp } from './QuestCard.tsx';
import { markJustCleared } from '../ui/justCleared.ts';
import { LinkButton } from '../ui/LinkButton.tsx';
import { toast } from '../ui/toast.ts';
import { play } from '../ui/sound.ts';
import { ClaimBarHost, ClaimButton } from './quest/ClaimBar.tsx';
import { logDraft } from './quest/logDrafts.ts';
import { Cleared } from './quest/Cleared.tsx';
import { RepLog } from './quest/RepLog.tsx';
import { SentenceLog } from './quest/SentenceLog.tsx';
import { TapClaim } from './quest/TapClaim.tsx';
import { TimerPanel } from './quest/TimerPanel.tsx';
import { WorkoutLog } from './quest/WorkoutLog.tsx';
import { isKept } from '../reading/codex.ts';
import { asDeck, isStory, storyLines } from '../reading/deck.ts';
import { keepDraft, takeawayDraft } from '../reading/drafts.ts';
import { Deck } from './reading/Deck.tsx';
import { openSource } from './reading/openSource.ts';
import { readingLength } from './reading/ReadingCard.tsx';
import { Reader } from './reading/Reader.tsx';
import { StoryScroll, TakeLines } from './reading/StoryScroll.tsx';

const T = PLAY_TEXT.quest;
const A = ADJUST_TEXT;
const MAX_TIMEOUT_MS = 2_147_483_647;

export type QuestProps = {
  questId: number;
  onBack: () => void;
  onPain: (questId: number) => void;
  /** A workout: change the equipment or program (M6c). */
  onTraining?: () => void;
  /** M7c: the Trial of Stillness, for a sealed side quest. */
  onTrial?: () => void;
  /** M8b: a reading, read again (decision 5). */
  onRead?: (articleId: string) => void;
  /** M12 decision 6: Cleared's "Next", in place of this screen. */
  onNext?: (questId: number) => void;
  /** A simpler day: Change today, in the top bar. */
  onDay?: () => void;
  /** A simpler day: after a claim, back to Camp (which asks how it felt); without it, Cleared shows here as before. */
  onCleared?: () => void;
  now?: () => number;
};

export function Quest({ questId, onBack, onPain, onTraining, onTrial, onRead, onNext, onDay, onCleared, now = Date.now }: QuestProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const pending = useGame((s) => s.pending);
  const enqueue = useGame((s) => s.enqueue);
  const loadTimer = useGame((s) => s.timer);
  const saveTimer = useGame((s) => s.saveTimer);
  const articles = useGame((s) => s.articles);
  const fetchArticle = useGame((s) => s.fetchArticle);
  const lastSets = useGame((s) => s.lastSets);
  const rememberSets = useGame((s) => s.rememberSets);
  const codex = useGame((s) => s.codex);
  const toggleKeep = useGame((s) => s.toggleKeep);
  const notify = useGame((s) => s.notify);
  const permission = useGame((s) => s.permission);
  const offers = useGame((s) => s.offers);
  const markOffer = useGame((s) => s.markOffer);
  const setNotify = useGame((s) => s.setNotify);
  const allowNotify = useGame((s) => s.allowNotify);
  const [before, setBefore] = useState<Shot | null>(null);
  const [timer, setTimer] = useState<TimerState>(NEW_TIMER);
  const [busy, setBusy] = useState(false);
  /**
   * M11: the full article instead of the Story Deck; chosen when the article first shows, so a deck that a sync brings
   * meanwhile doesn't swap the screen under the reader (review).
   */
  const [fullArticle, setFullArticle] = useState<boolean | null>(null);
  /** M11: the card the deck was left on and the takeaway being written, kept here to outlive both (review). */
  const [deckStep, setDeckStep] = useState(0);
  /** M12 (audit 9): null until typed in here; the draft kept for this article stands in until then. */
  const [typed, setTyped] = useState<string | null>(null);
  /** Premium pass A1: a one-sentence quest's line, likewise; null until typed in here. */
  const [typedLine, setTypedLine] = useState<string | null>(null);
  /** Premium pass A4: what the last undo gave back, said above the log. */
  const [undone, setUndone] = useState<'log' | 'tap' | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  /** Claimed and on its way back to Camp: the screen keeps its look rather than flashing Cleared (a simpler day). */
  const [leaving, setLeaving] = useState(false);
  const [, redraw] = useState(0);
  /** A claim on its way: a second tap before the screen redraws sends nothing (review). */
  const claiming = useRef(false);
  /** The player moved the timer: a stored copy that loads late must not overwrite it (review). */
  const timerTouched = useRef(false);

  const today = view?.today ?? null;
  const quest = findQuest(today, questId);
  const timerId = quest?.id ?? questId;
  const openTimer = quest !== null && quest.completion === 'timer' && quest.completedAt === null;
  // M8b decision 5: the reading quest is the reader; an article this phone doesn't hold yet is asked for.
  const todaysArticle = quest !== null && quest.slot === 'article' ? (today?.article ?? null) : null;
  /** M17: names a workout's or a rep log's draft: the day too, since a day built offline reuses its quests' ids (review). */
  const logKey = quest === null ? '' : `${today?.dayNumber ?? 0}:${quest.id}:${JSON.stringify(quest.condition)}`;
  const reading = todaysArticle === null ? null : (articles[todaysArticle.id] ?? null);
  const missing = todaysArticle !== null && reading === null ? todaysArticle.id : null;
  const deck = reading === null ? null : asDeck(reading.deck);
  if (reading !== null && fullArticle === null) setFullArticle(deck === null);
  const takeaway = typed ?? (todaysArticle === null ? '' : takeawayDraft(todaysArticle.id));
  const lineKey = `line:${logKey}`;
  const line = typedLine ?? readDraft<string>(lineKey) ?? '';
  const [pickedLine] = useState(() => quest !== null && restoredDraft(lineKey));
  /** A simpler day: the full log instead of one-tap Done, once asked for, or when this log was already being changed. */
  const [detailed, setDetailed] = useState(() => logDraft(logKey) !== undefined);
  const setLine = (text: string) => {
    setTypedLine(text);
    writeDraft(lineKey, text);
  };
  const setTakeaway = (text: string) => {
    setTyped(text);
    if (todaysArticle !== null) keepDraft(todaysArticle.id, text);
  };
  useEffect(() => {
    if (missing !== null) fetchArticle(missing);
  }, [missing, fetchArticle]);

  useEffect(() => {
    if (!openTimer) return;
    let live = true;
    loadTimer(timerId)
      .then((stored) => {
        if (live && stored !== null && !timerTouched.current) setTimer(stored);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [timerId, openTimer, loadTimer]);

  const endsAt = today?.endsAt != null ? Date.parse(today.endsAt) : null;
  const isOpen = (): boolean => endsAt !== null && endsAt > now();
  const dayOpen = isOpen();

  // The screen closes itself when the day ends (review): nothing else redraws it at that moment.
  useEffect(() => {
    if (!dayOpen || endsAt === null) return;
    const wait = endsAt - now() + 50;
    if (wait >= MAX_TIMEOUT_MS) return;
    const id = setTimeout(() => redraw((n) => n + 1), Math.max(0, wait));
    return () => clearTimeout(id);
  }, [dayOpen, endsAt, now]);

  /** The day may have ended since the last redraw: then nothing is sent and the screen shows it (review). */
  const stillOpen = (): boolean => {
    if (isOpen()) return true;
    redraw((n) => n + 1);
    return false;
  };
  if (view === null || today === null || quest === null || (!dayOpen && quest.completedAt === null)) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 20 }}>
        <TopBar onBack={onBack} />
        <NarrationBox>{T.gone}</NarrationBox>
        <Button label={T.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }

  const template = authoredTemplate(quest.templateId);
  const words = template.voice[view.profile.voice];
  const summary = questSummary(quest);
  const slot = quest.slot === 'side1' || quest.slot === 'side2' ? T.slots.side : T.slots[quest.slot];
  const hold = shadowHold(view, now());

  if (quest.completedAt !== null && !leaving) {
    // M12 decision 6: what comes after this quest, so Cleared can lead straight on.
    const after = upNext(today, (q) => q.id === quest.id || sealedQuest(hold, q));
    const nextLabel = after === null ? null : after.slot === 'article' && today.article !== null
      ? fillText(PLAY_TEXT.cleared.nextReading, { length: readingLength(today.article, articles[today.article.id] ?? null) })
      : fillText(PLAY_TEXT.cleared.next, { title: authoredTemplate(after.templateId).voice[view.profile.voice].title });
    return (
      <Cleared
        next={after !== null && nextLabel !== null && onNext !== undefined ? { label: nextLabel, onPress: () => onNext(after.id) } : undefined}
        // The reading quest's name is its slot's: the topic says more (M8b emulator check).
        heading={`${slot} · ${todaysArticle !== null ? CLUSTER_NAMES[todaysArticle.cluster] : template.name}`}
        line={todaysArticle !== null ? todaysArticle.title : summary}
        numbers={clearedSummary(before, { character: view.character, quests: today.quests }, quest.id)}
        rating={quest.rating}
        dayOpen={dayOpen}
        waiting={view.waiting.has(quest.id)}
        onRate={(rating: Rating) => {
          if (stillOpen()) void enqueue({ type: 'rate', instanceId: quest.id, rating });
        }}
        onUndo={() => {
          if (!stillOpen()) return;
          setBefore(null);
          // Premium pass A4: the log comes back as it was claimed (its draft and the paused timer are kept), and says so.
          setUndone(quest.completion === 'tap' ? 'tap' : 'log');
          void enqueue({ type: 'undo', instanceId: quest.id });
        }}
        onContinue={onBack}
        canStepDown={quest.canStepDown}
        onStepDown={() => {
          if (stillOpen()) void enqueue({ type: 'step_down', instanceId: quest.id });
        }}
        onPain={template.exercise !== null ? () => onPain(quest.id) : null}
        rateable={quest.slot !== 'article'}
        onReadAgain={todaysArticle !== null && onRead !== undefined ? () => onRead(todaysArticle.id) : undefined}
      />
    );
  }

  const claim = async (payload: Record<string, unknown>): Promise<void> => {
    if (claiming.current || !stillOpen()) return;
    claiming.current = true;
    setBusy(true);
    try {
      setBefore({ character: view.character, quests: today.quests });
      setUndone(null);
      // Before the claim lands, so the screen never flashes Cleared on its way back to Camp; a claim not saved stays here.
      if (onCleared !== undefined) setLeaving(true);
      await enqueue({ type: 'complete', instanceId: quest.id, completedAt: now(), rating: null, payload }).catch((error: unknown) => {
        setLeaving(false);
        throw error;
      });
      // Premium pass A4: the takeaway, the line and the sets stay as drafts, and the timer stays, paused where it was
      // claimed: "Logged by mistake? Undo" gives them back instead of starting over.
      if (quest.completion === 'timer') {
        const kept = pauseTimer(timer, endsAt === null ? now() : Math.min(now(), endsAt));
        setTimer(kept);
        await saveTimer(quest.id, kept).catch(() => {});
      }
      // M10c decision 7: next time starts from these sets.
      const sets = Array.isArray(payload.sets) ? (payload.sets as number[]) : null;
      if (sets !== null && quest.condition.kind === 'session') await rememberSets(sessionMemory(quest.condition.moves, sets)).catch(() => {});
      else if (sets !== null && quest.completion === 'reps') await rememberSets({ [questKey(quest.templateId)]: sets }).catch(() => {});
      // A simpler day (decision 6): straight back to Camp, which cheers; the app's note offers Undo, Camp asks how it felt.
      if (onCleared !== undefined) {
        const id = quest.id;
        const title = todaysArticle !== null ? todaysArticle.title : authoredTemplate(quest.templateId).voice[view.profile.voice].title;
        toast(fillText(TODAY_TEXT.markedDone, { title }), { label: TODAY_TEXT.undo, onPress: () => {
          if (endsAt === null || endsAt <= now()) return;
          play('undo');
          markJustCleared(null);
          void enqueue({ type: 'undo', instanceId: id });
        } });
        markJustCleared(quest.slot === 'article' ? null : id);
        onCleared();
      }
    } finally {
      claiming.current = false;
      setBusy(false);
    }
  };

  let panel;
  if (sealedQuest(hold, quest)) {
    // M7c decision 6: the Trial of Stillness seals this side quest until its focus session (the phone's own seal).
    panel = (
      <View style={{ gap: 12 }}>
        <ShadowBox lines={[shadowLine('trial', today.dayNumber)]} />
        <Button label={SHADOW_TEXT.trial.start} onPress={onTrial ?? (() => {})} />
      </View>
    );
  } else if (quest.slot === 'article') {
    panel = <NarrationBox>{todaysArticle === null ? T.article : READING_TEXT.waiting}</NarrationBox>;
  } else if (quest.completion === 'timer') {
    // M12 decision 12: the first timer started without the timer notes offers them, once, where it matters.
    const liveOn = permission === 'granted' && notify.optedIn && notify.timers;
    const offerLive = timer.runningSince !== null && !liveOn && permission !== 'denied' && permission !== 'unknown' && !offers.includes('live-timer');
    const allowLive = async (): Promise<void> => {
      await markOffer('live-timer');
      const allowed = permission === 'granted' ? 'granted' : await allowNotify();
      if (allowed === 'granted') await setNotify({ ...notify, timers: true, optedIn: true });
    };
    panel = (
      <View style={{ gap: 12 }}>
      <TimerPanel
        timer={timer}
        targetMs={timerTargetMs(quest)}
        now={now}
        endsAt={endsAt ?? undefined}
        disabled={busy}
        onChange={(next) => {
          timerTouched.current = true;
          setTimer(next);
          void saveTimer(quest.id, next).catch(() => {});
        }}
        onClaim={(payload) => void claim(payload)}
      />
      {/* M17 (UX audit N2): the offer sits under the clock, so Pause stays where the thumb was. */}
      {offerLive && (
        <View testID="live-offer" style={{ gap: 10, padding: 14, borderRadius: radius.card, borderWidth: space.border, borderColor: colors.lineStrong }}>
          <Small tone="chalk">{NOTIFY_TEXT.live.offer}</Small>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Button label={NOTIFY_TEXT.live.allow} variant="secondary" onPress={() => void allowLive()} style={{ flexGrow: 1 }} />
            <Button label={NOTIFY_TEXT.live.no} variant="secondary" onPress={() => void markOffer('live-timer')} style={{ flexGrow: 1 }} />
          </View>
        </View>
      )}
      </View>
    );
  } else if (quest.condition.kind === 'session') {
    // A new plan starts a fresh log (review); a training change on its way re-plans the workout first, so it waits.
    const replanning = pending.some((e) => e.type === 'training');
    // M16: a weekly workout says where it stands in its block and what the week asks for.
    const block = quest.condition.block;
    panel = (
      <View style={{ gap: 12 }}>
        {replanning && <NarrationBox>{PLAY_TEXT.workout.replanning}</NarrationBox>}
        {block !== undefined && (
          <View testID="workout-block" style={{ gap: 4 }}>
            <Label tone="accentText">{programBlockLabel(block)}</Label>
            <Small>{PLAY_TEXT.workout.weeks[block.week - 1]}</Small>
          </View>
        )}
        {detailed ? (
          <WorkoutLog key={JSON.stringify(quest.condition)} moves={quest.condition.moves} disabled={busy || replanning}
            onClaim={(payload) => void claim(payload)} last={lastSets} now={now} draftKey={logKey} />
        ) : (
          <QuickDone label={CAMP_TEXT.quest.doneWorkout} disabled={busy || replanning} onDifferent={() => setDetailed(true)}
            onDone={() => quest.condition.kind === 'session' && void claim(sessionPayload(startFromLast(quest.condition.moves, lastSets)))} />
        )}
      </View>
    );
  } else if (quest.completion === 'reps') {
    // Review: keyed by its target too, as the workout is, so a quest swapped in place starts from its own numbers.
    panel = detailed ? (
      <RepLog key={JSON.stringify(quest.condition)} condition={quest.condition} disabled={busy} onClaim={(payload) => void claim(payload)}
        last={lastSets[questKey(quest.templateId)] ?? null} now={now} draftKey={logKey} />
    ) : (
      <QuickDone label={fillText(CAMP_TEXT.quest.done, { target: targetText(quest.condition) })} disabled={busy} onDifferent={() => setDetailed(true)}
        onDone={() => void claim(repsPayload(startingSets(quest.condition)))} />
    );
  } else if (quest.completion === 'text') {
    panel = <SentenceLog disabled={busy} onClaim={(payload) => void claim(payload)} value={line} onChangeText={setLine} />;
  } else {
    panel = <TapClaim disabled={busy} onClaim={(payload) => void claim(payload)} />;
  }

  if (reading !== null) {
    const xp = questXp(quest);
    if (deck !== null && isStory(deck) && !(fullArticle ?? false)) {
      // A simpler day (decision 10): today's story is one scroll; a line from it claims the reading, or your own words.
      const own = (
        <View style={{ gap: 10 }}>
          <SentenceLog disabled={busy} label={READING_TEXT.takeawayLabel} note={READING_TEXT.takeawayNote} value={takeaway}
            onChangeText={setTakeaway} claimLabel={fillText(READING_TEXT.claim, { xp })} onClaim={(payload) => void claim(payload)} />
          {view.waiting.has(quest.id) && <Caption>{T.willSync}</Caption>}
        </View>
      );
      return (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.night }}>
          <StoryScroll
            article={{ ...reading, deck }}
            label={READING_TEXT.label}
            xp={xp}
            onClose={onBack}
            onFullArticle={() => setFullArticle(true)}
            buddy={{ classId: view.profile.classId, level: view.character.level }}
            kept={isKept(codex, reading.id)}
            onKeep={() => void toggleKeep({ articleId: reading.id, title: reading.title, lesson: deck.lesson, keptAt: now() })}
            end={<TakeLines lines={storyLines(deck)} disabled={busy} onPick={(line) => void claim(textPayload(line))} own={own} />}
          />
        </KeyboardAvoidingView>
      );
    }
    if (deck !== null && !(fullArticle ?? false)) {
      // M11: the reading opens on its Story Deck; Your turn is the takeaway that clears the quest.
      return (
        <Deck
          article={{ ...reading, deck }}
          label={READING_TEXT.label}
          xp={xp}
          turn={(
            <View style={{ gap: 10 }}>
              <SentenceLog disabled={busy} label={READING_TEXT.takeawayLabel} note={READING_TEXT.takeawayNote} value={takeaway}
                onChangeText={setTakeaway} claimLabel={fillText(READING_TEXT.claim, { xp })} onClaim={(payload) => void claim(payload)} />
              {view.waiting.has(quest.id) && <Caption>{T.willSync}</Caption>}
            </View>
          )}
          onClose={onBack}
          onFullArticle={() => setFullArticle(true)}
          initialStep={deckStep}
          buddy={{ classId: view.profile.classId, level: view.character.level }}
          onStep={setDeckStep}
          kept={isKept(codex, reading.id)}
          onKeep={() => void toggleKeep({ articleId: reading.id, title: reading.title, lesson: deck.lesson, keptAt: now() })}
        />
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.night }}>
      <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
        <TopBar onBack={onBack} />
        {deck !== null && (
          <Button label={isStory(deck) ? CAMP_TEXT.story.back : READING_TEXT.deck.backToCards} variant="secondary" onPress={() => setFullArticle(false)}
            style={{ alignSelf: 'flex-start' }} />
        )}
        <Reader
          article={reading}
          label={READING_TEXT.label}
          xp={xp}
          onOpenSource={openSource}
          footer={(
            <SentenceLog
              disabled={busy}
              label={READING_TEXT.takeawayLabel}
              note={READING_TEXT.takeawayNote}
              value={takeaway}
              onChangeText={setTakeaway}
              claimLabel={fillText(READING_TEXT.claim, { xp })}
              onClaim={(payload) => void claim(payload)}
            />
          )}
        />
        {view.waiting.has(quest.id) && <Caption>{T.willSync}</Caption>}
      </ScreenScroll>
      </KeyboardAvoidingView>
    );
  }

  const xp = questXp(quest);
  const logsSets = quest.completion === 'reps' || quest.condition.kind === 'session';
  const hasHow = template.steps.length > 0;
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.night }}>
      <ClaimBarHost suffix={fillText(PLAY_TEXT.claim.xp, { xp })} note={logsSets && detailed ? T.kept : undefined}>
        {(barSpace) => (
        <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + barSpace + 24, paddingHorizontal: space.gutter, gap: 18 }}>
          <TopBar onBack={onBack} backLabel={CAMP_TEXT.quest.back}
            {...(onDay === undefined || quest.completedAt !== null ? {} : { end: <LinkButton label={TODAY_TEXT.change} tone="accentText" onPress={onDay} /> })} />
          {/* A simpler day: your buddy doing it, at the top (it was folded under How). */}
          <QuestArt classId={view.profile.classId} artKey={artKey(template, quest.condition)}
            label={fillText(BUDDY_TEXT.questPicture, { name: BUDDIES[view.profile.classId].name, stat: STAT_NAMES[quest.stat] })} />
          <View style={{ gap: 6 }}>
            <Label tone="accentText">{`${slot} · ${STAT_NAMES[quest.stat]} · +${xp} XP`}</Label>
            <Title accessibilityRole="header">{words.title}</Title>
            <Body weight="medium">{summary}</Body>
            {quest.book !== null && <Body tone="ashLight">{fillText(BOOK_TEXT.questLine, { title: quest.book })}</Body>}
            {quest.hardDay && <Chip label={A.hardDay.tag} kind="outline" />}
          </View>
          {quest.completedAt === null && isResting(quest, view.paused) && <NarrationBox>{A.paused.quest}</NarrationBox>}
          {undone !== null && (
            <View accessibilityLiveRegion="polite"><Small tone="chalk">{undone === 'log' ? T.undoneLog : T.undone}</Small></View>
          )}
          {undone === null && pickedLine && quest.completion === 'text' && <Small tone="chalk">{T.picked}</Small>}
          {/* A simpler day: the steps are open, so the one-tap Done below has nothing hidden behind it. */}
          {hasHow && (
            <View style={{ gap: 8 }}>
              <Label>{T.steps}</Label>
              {template.steps.map((step, i) => <Body key={i}>{`${i + 1}. ${step}`}</Body>)}
            </View>
          )}
          {panel}
          {/* Safety stays open (CLAUDE.md: exercise safety is never folded away), with "I felt pain" in reach. */}
          {(template.exercise !== null || template.safety.length > 0) && (
            <View style={{ gap: 6, padding: 14, borderRadius: radius.card, borderWidth: space.border, borderColor: colors.lineStrong, backgroundColor: colors.panel }}>
              <Label>{T.safety}</Label>
              {template.safety.map((line, i) => <Small key={i}>{line}</Small>)}
              {template.exercise !== null && <Small tone="chalk">{EXERCISE_SAFETY_LINE}</Small>}
              {template.exercise !== null && (
                <Button label={A.pain.open} variant="secondary" onPress={() => onPain(quest.id)} style={{ alignSelf: 'flex-start' }} />
              )}
            </View>
          )}
          <View style={{ gap: 10 }}>
            <RowLink label={T.why} open={showWhy} onPress={() => setShowWhy((s) => !s)} />
            {showWhy && (
              <Appear style={{ gap: 8, paddingHorizontal: 4 }}>
                {/* The voice line quotes the full version's numbers (M2 carried item), so a hard day hides it. */}
                {!quest.hardDay && <Body>{words.line}</Body>}
                <Small>{renderWhy(quest.why, view.profile.voice, { classId: view.profile.classId })}</Small>
              </Appear>
            )}
          </View>
          {quest.condition.kind === 'session' && onTraining !== undefined && (
            <Button label={PLAY_TEXT.workout.change} variant="secondary" onPress={onTraining} />
          )}
          {view.waiting.has(quest.id) && <Caption>{T.willSync}</Caption>}
        </ScreenScroll>
        )}
      </ClaimBarHost>
    </KeyboardAvoidingView>
  );
}

/** A simpler day (decision 4): the target in one tap ("Done · 3 sets of 8"), or the full log for different numbers. */
function QuickDone({ label, disabled, onDone, onDifferent }: { label: string; disabled: boolean; onDone: () => void; onDifferent: () => void }) {
  return (
    // 2026-10-27: side by side, the main one wide, so both sit under the thumb.
    <View testID="quick-done" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <View style={{ flexGrow: 1, flexBasis: 190 }}>
        <ClaimButton label={label} disabled={disabled} onPress={onDone} />
      </View>
      <LinkButton label={CAMP_TEXT.quest.different} onPress={onDifferent} style={{ flexGrow: 1 }} />
    </View>
  );
}
