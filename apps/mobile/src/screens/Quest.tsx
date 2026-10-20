// A quest, opened from Today (spec §3.1, §3.4, §3.6; M6a decisions 1–10): its picture, its words in the player's voice,
// why it was picked, how to do it, the safety lines, and the panel that logs it. A cleared quest shows "Quest cleared".
// M6b: "I felt pain" under the safety lines, a swap, and the hard-day tag. M6c: a workout's log, and a way to change the
// equipment or program. M10c: a logged workout or rep log is remembered on this phone for next time (decision 7).
// M12 (Round 3, board R3-2; audit 2, 9, 10, 12): one top bar; the title, then the log first, its button fixed at the
// bottom; How and Why fold below, Safety stays open; Cleared leads on to the next quest; a half-written takeaway waits.
import {
  ADJUST_TEXT, BOOK_TEXT, CLUSTER_NAMES, EXERCISE_SAFETY_LINE, NOTIFY_TEXT, PLAY_TEXT, READING_TEXT, SHADOW_TEXT, STAT_NAMES, artKey,
  authoredTemplate, fillText, programBlockLabel, questSummary, renderWhy, shadowLine,
} from '@levelmeup/content';
import type { Rating } from '@levelmeup/rules';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { timerTargetMs } from '../../../../supabase/functions/_shared/events.ts';
import { artUrl } from '../art/manifest.ts';
import { isResting } from '../game/adjust.ts';
import { findQuest } from '../game/offline.ts';
import { sealedQuest, shadowHold } from '../game/pact.ts';
import { upNext } from '../game/today.ts';
import { clearedSummary } from '../quest/cleared.ts';
import { questKey, sessionMemory } from '../quest/lastSets.ts';
import type { Shot } from '../quest/cleared.ts';
import { NEW_TIMER } from '../quest/timer.ts';
import type { TimerState } from '../quest/timer.ts';
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
import { ClaimBarHost } from './quest/ClaimBar.tsx';
import { Cleared } from './quest/Cleared.tsx';
import { RepLog } from './quest/RepLog.tsx';
import { SentenceLog } from './quest/SentenceLog.tsx';
import { TapClaim } from './quest/TapClaim.tsx';
import { TimerPanel } from './quest/TimerPanel.tsx';
import { WorkoutLog } from './quest/WorkoutLog.tsx';
import { isKept } from '../reading/codex.ts';
import { asDeck } from '../reading/deck.ts';
import { keepDraft, takeawayDraft } from '../reading/drafts.ts';
import { Deck } from './reading/Deck.tsx';
import { openSource } from './reading/openSource.ts';
import { readingLength } from './reading/ReadingCard.tsx';
import { Reader } from './reading/Reader.tsx';

const T = PLAY_TEXT.quest;
const A = ADJUST_TEXT;
const MAX_TIMEOUT_MS = 2_147_483_647;

export type QuestProps = {
  questId: number;
  onBack: () => void;
  onSwap: (questId: number) => void;
  onPain: (questId: number) => void;
  /** A workout: change the equipment or program (M6c). */
  onTraining?: () => void;
  /** M7c: the Trial of Stillness, for a sealed side quest. */
  onTrial?: () => void;
  /** M8b: a reading, read again (decision 5). */
  onRead?: (articleId: string) => void;
  /** M12 decision 6: Cleared's "Next", in place of this screen. */
  onNext?: (questId: number) => void;
  now?: () => number;
};

export function Quest({ questId, onBack, onSwap, onPain, onTraining, onTrial, onRead, onNext, now = Date.now }: QuestProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const pending = useGame((s) => s.pending);
  const art = useGame((s) => s.art);
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
  const [showHow, setShowHow] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
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
  const reading = todaysArticle === null ? null : (articles[todaysArticle.id] ?? null);
  const missing = todaysArticle !== null && reading === null ? todaysArticle.id : null;
  const deck = reading === null ? null : asDeck(reading.deck);
  if (reading !== null && fullArticle === null) setFullArticle(deck === null);
  const takeaway = typed ?? (todaysArticle === null ? '' : takeawayDraft(todaysArticle.id));
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

  if (quest.completedAt !== null) {
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
          setTimer(NEW_TIMER); // logged by mistake: the time it claimed doesn't carry over
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
      await enqueue({ type: 'complete', instanceId: quest.id, completedAt: now(), rating: null, payload });
      if (todaysArticle !== null) keepDraft(todaysArticle.id, ''); // M12: claimed, so the draft is done
      if (quest.completion === 'timer') await saveTimer(quest.id, null).catch(() => {});
      // M10c decision 7: next time starts from these sets.
      const sets = Array.isArray(payload.sets) ? (payload.sets as number[]) : null;
      if (sets !== null && quest.condition.kind === 'session') await rememberSets(sessionMemory(quest.condition.moves, sets)).catch(() => {});
      else if (sets !== null && quest.completion === 'reps') await rememberSets({ [questKey(quest.templateId)]: sets }).catch(() => {});
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
        <WorkoutLog key={JSON.stringify(quest.condition)} moves={quest.condition.moves} disabled={busy || replanning}
          onClaim={(payload) => void claim(payload)} last={lastSets} now={now} />
      </View>
    );
  } else if (quest.completion === 'reps') {
    panel = <RepLog condition={quest.condition} disabled={busy} onClaim={(payload) => void claim(payload)}
      last={lastSets[questKey(quest.templateId)] ?? null} now={now} />;
  } else if (quest.completion === 'text') {
    panel = <SentenceLog disabled={busy} onClaim={(payload) => void claim(payload)} />;
  } else {
    panel = <TapClaim disabled={busy} onClaim={(payload) => void claim(payload)} />;
  }

  if (reading !== null) {
    const xp = questXp(quest);
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
          <Button label={READING_TEXT.deck.backToCards} variant="secondary" onPress={() => setFullArticle(false)} style={{ alignSelf: 'flex-start' }} />
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
      <ClaimBarHost suffix={fillText(PLAY_TEXT.claim.xp, { xp })} note={logsSets ? T.kept : undefined}>
        {(barSpace) => (
        <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + barSpace + 24, paddingHorizontal: space.gutter, gap: 20 }}>
          <TopBar onBack={onBack} />
          <View style={{ gap: 6 }}>
            <Label tone="accentText">{`${slot} · ${STAT_NAMES[quest.stat]} · +${xp} XP`}</Label>
            <Title accessibilityRole="header">{words.title}</Title>
            <Body weight="medium">{summary}</Body>
            {quest.book !== null && <Body tone="ashLight">{fillText(BOOK_TEXT.questLine, { title: quest.book })}</Body>}
            {quest.hardDay && <Chip label={A.hardDay.tag} kind="outline" />}
          </View>
          {quest.completedAt === null && isResting(quest, view.paused) && <NarrationBox>{A.paused.quest}</NarrationBox>}
          {/* M12 (audit 2): the log first, where the thumb is; its button sits in the bar at the bottom. */}
          {panel}
          {/* Safety stays open (CLAUDE.md: exercise safety is never folded away), with "I felt pain" in reach. M17 (design
              critique): right after the log and before the folds, as a filled card, so it reads as more than an aside. */}
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
            <RowLink label={T.steps} open={showHow} onPress={() => setShowHow((s) => !s)} />
            {showHow && (
              <Appear style={{ gap: 10, paddingHorizontal: 4 }}>
                <QuestArt
                  uri={artUrl(art, artKey(template, quest.condition), quest.id)}
                  label={fillText(T.picture, { stat: STAT_NAMES[quest.stat] })}
                  fallback={STAT_NAMES[quest.stat]}
                />
                {hasHow && template.steps.map((step, i) => <Body key={i}>{`${i + 1}. ${step}`}</Body>)}
              </Appear>
            )}
            <RowLink label={T.why} open={showWhy} onPress={() => setShowWhy((s) => !s)} />
            {showWhy && (
              <Appear style={{ gap: 8, paddingHorizontal: 4 }}>
                {/* The voice line quotes the full version's numbers (M2 carried item), so a hard day hides it. */}
                {!quest.hardDay && <Body>{words.line}</Body>}
                <Small>{renderWhy(quest.why, view.profile.voice, { classId: view.profile.classId })}</Small>
              </Appear>
            )}
          </View>
          {today.swapsLeft > 0 && quest.swaps.length > 0 && (
            <Button label={A.swap.open} variant="secondary" onPress={() => onSwap(quest.id)} />
          )}
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
