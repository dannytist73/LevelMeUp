// A quest, opened from Today (spec §3.1, §3.4, §3.6; M6a decisions 1–10): its picture, its words in the player's voice,
// why it was picked, how to do it, the safety lines, and the panel that logs it. A cleared quest shows "Quest cleared".
// M6b: "I felt pain" under the safety lines, a swap, and the hard-day tag. M6c: a workout's log, and a way to change the
// equipment or program.
import {
  ADJUST_TEXT, EXERCISE_SAFETY_LINE, PLAY_TEXT, STAT_NAMES, artKey, authoredTemplate, fillText, questSummary, renderWhy,
} from '@levelmeup/content';
import type { Rating } from '@levelmeup/rules';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { timerTargetMs } from '../../../../supabase/functions/_shared/events.ts';
import { artUrl } from '../art/manifest.ts';
import { isResting } from '../game/adjust.ts';
import { clearedSummary } from '../quest/cleared.ts';
import type { Shot } from '../quest/cleared.ts';
import { NEW_TIMER } from '../quest/timer.ts';
import type { TimerState } from '../quest/timer.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { Chip } from '../ui/Chip.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { QuestArt } from '../ui/QuestArt.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Caption, Label, Small, Title } from '../ui/Text.tsx';
import { COMPLETION_NAMES, questXp } from './QuestCard.tsx';
import { Cleared } from './quest/Cleared.tsx';
import { RepLog } from './quest/RepLog.tsx';
import { SentenceLog } from './quest/SentenceLog.tsx';
import { TapClaim } from './quest/TapClaim.tsx';
import { TimerPanel } from './quest/TimerPanel.tsx';
import { WorkoutLog } from './quest/WorkoutLog.tsx';

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
  now?: () => number;
};

export function Quest({ questId, onBack, onSwap, onPain, onTraining, now = Date.now }: QuestProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const art = useGame((s) => s.art);
  const enqueue = useGame((s) => s.enqueue);
  const loadTimer = useGame((s) => s.timer);
  const saveTimer = useGame((s) => s.saveTimer);
  const [before, setBefore] = useState<Shot | null>(null);
  const [timer, setTimer] = useState<TimerState>(NEW_TIMER);
  const [busy, setBusy] = useState(false);
  const [, redraw] = useState(0);
  /** A claim on its way: a second tap before the screen redraws sends nothing (review). */
  const claiming = useRef(false);
  /** The player moved the timer: a stored copy that loads late must not overwrite it (review). */
  const timerTouched = useRef(false);

  const today = view?.today ?? null;
  const quest = today?.quests.find((q) => q.id === questId) ?? null;
  const openTimer = quest !== null && quest.completion === 'timer' && quest.completedAt === null;

  useEffect(() => {
    if (!openTimer) return;
    let live = true;
    loadTimer(questId)
      .then((stored) => {
        if (live && stored !== null && !timerTouched.current) setTimer(stored);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [questId, openTimer, loadTimer]);

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
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 20 }}>
        <NarrationBox>{T.gone}</NarrationBox>
        <Button label={T.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }

  const template = authoredTemplate(quest.templateId);
  const words = template.voice[view.profile.voice];
  const summary = questSummary(quest);
  const slot = quest.slot === 'side1' || quest.slot === 'side2' ? T.slots.side : T.slots[quest.slot];

  if (quest.completedAt !== null) {
    return (
      <Cleared
        heading={`${slot} · ${template.name}`.toUpperCase()}
        line={summary}
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
      if (quest.completion === 'timer') await saveTimer(quest.id, null).catch(() => {});
    } finally {
      claiming.current = false;
      setBusy(false);
    }
  };

  let panel;
  if (quest.slot === 'article') {
    panel = <NarrationBox>{T.article}</NarrationBox>;
  } else if (quest.completion === 'timer') {
    panel = (
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
    );
  } else if (quest.condition.kind === 'session') {
    panel = <WorkoutLog moves={quest.condition.moves} disabled={busy} onClaim={(payload) => void claim(payload)} />;
  } else if (quest.completion === 'reps') {
    panel = <RepLog condition={quest.condition} disabled={busy} onClaim={(payload) => void claim(payload)} />;
  } else if (quest.completion === 'text') {
    panel = <SentenceLog disabled={busy} onClaim={(payload) => void claim(payload)} />;
  } else {
    panel = <TapClaim disabled={busy} onClaim={(payload) => void claim(payload)} />;
  }

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Button label={T.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <QuestArt
        uri={artUrl(art, artKey(template, quest.condition), quest.id)}
        label={fillText(T.picture, { stat: STAT_NAMES[quest.stat] })}
        fallback={STAT_NAMES[quest.stat]}
      />
      <View style={{ gap: 8 }}>
        <Label tone="ember">{slot}</Label>
        <Title>{words.title}</Title>
        <Body weight="medium">{summary}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label={STAT_NAMES[quest.stat]} />
          <Chip label={COMPLETION_NAMES[quest.completion]} kind="outline" />
          <Chip label={`+${questXp(quest)} XP`} kind="outline" />
          {quest.hardDay && <Chip label={A.hardDay.tag} kind="outline" />}
        </View>
      </View>
      {/* The voice line quotes the full version's numbers (M2 carried item), so a hard day hides it. */}
      {!quest.hardDay && <Body>{words.line}</Body>}
      <View style={{ gap: 4, padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line }}>
        <Label>{T.why}</Label>
        <Small>{renderWhy(quest.why, view.profile.voice, { classId: view.profile.classId })}</Small>
      </View>
      {template.steps.length > 0 && (
        <View style={{ gap: 6 }}>
          <Label>{T.steps}</Label>
          {template.steps.map((step, i) => <Body key={i}>{`${i + 1}. ${step}`}</Body>)}
        </View>
      )}
      {(template.exercise !== null || template.safety.length > 0) && (
        <View style={{ gap: 6 }}>
          <Label>{T.safety}</Label>
          {template.safety.map((line, i) => <Small key={i}>{line}</Small>)}
          {template.exercise !== null && <Small tone="chalk">{EXERCISE_SAFETY_LINE}</Small>}
          {template.exercise !== null && (
            <Button label={A.pain.open} variant="secondary" onPress={() => onPain(quest.id)} style={{ alignSelf: 'flex-start' }} />
          )}
        </View>
      )}
      {quest.completedAt === null && isResting(quest, view.paused) && <NarrationBox>{A.paused.quest}</NarrationBox>}
      {panel}
      {today.swapsLeft > 0 && quest.swaps.length > 0 && (
        <Button label={A.swap.open} variant="secondary" onPress={() => onSwap(quest.id)} />
      )}
      {quest.condition.kind === 'session' && onTraining !== undefined && (
        <Button label={PLAY_TEXT.workout.change} variant="secondary" onPress={onTraining} />
      )}
      {view.waiting.has(quest.id) && <Caption>{T.willSync}</Caption>}
    </ScreenScroll>
  );
}
