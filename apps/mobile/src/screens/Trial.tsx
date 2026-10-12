// The Trial of Stillness's focus session (spec §4.3, board F4; M7c decision 7): ten minutes of LevelMeUp in the
// foreground. The screen stays awake while it runs; leaving the app pauses it and coming back goes on (calls and every
// other app still work). The minutes are kept on the phone for this check-in (a checkpoint every 5 seconds), so ending
// the session, or a crash, keeps them. Done: the `trial` event, and the side quests open at once.
import { SHADOW_TEXT } from '@levelmeup/content';
import { TRIAL_FOCUS_MS } from '@levelmeup/rules';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadowHold } from '../game/pact.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Display, Label, Small } from '../ui/Text.tsx';
import { XpBar } from '../ui/XpBar.tsx';

const T = SHADOW_TEXT.focus;
const KEEP_AWAKE_TAG = 'lmu-trial';
const CHECKPOINT_TICKS = 5;

/** "06:42": minutes and seconds left, never below zero. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export type TrialProps = { onDone: () => void; now?: () => number };

export function Trial({ onDone, now = Date.now }: TrialProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const enqueue = useGame((s) => s.enqueue);
  const trialMs = useGame((s) => s.trialMs);
  const saveTrialMs = useGame((s) => s.saveTrialMs);
  const hold = view === null ? null : shadowHold(view, now());
  // The check-in this session is for, fixed when the screen opens.
  const [checkinId] = useState(() => (hold !== null && hold.sealed ? hold.checkinId : null));
  const open = checkinId !== null && hold !== null && hold.checkinId === checkinId && hold.sealed;
  const [finished, setFinished] = useState(false);
  const [running, setRunning] = useState(false);
  const [, redraw] = useState(0);
  // Every callback below reads these refs, so listeners made once never see stale numbers.
  const base = useRef(0);
  const since = useRef<number | null>(null);
  const loaded = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  const elapsed = (): number => base.current + (since.current === null ? 0 : Math.max(0, now() - since.current));
  const save = (): void => {
    if (checkinId !== null) void saveTrialMs(checkinId, elapsed()).catch(() => {});
  };
  const pause = (): void => {
    if (since.current === null) return;
    base.current = elapsed();
    since.current = null;
    setRunning(false);
    save();
  };
  const resume = (): void => {
    if (!loaded.current || since.current !== null || !openRef.current || elapsed() >= TRIAL_FOCUS_MS) return;
    since.current = now();
    setRunning(true);
  };

  // The minutes kept for this check-in, then the session runs while the app is in front; leaving the screen keeps them.
  // The dependency lists below are deliberate: the refs carry the live numbers.
  useEffect(() => {
    if (checkinId === null) return;
    let live = true;
    void trialMs(checkinId).then((ms) => {
      if (!live) return;
      base.current = ms;
      loaded.current = true;
      if (AppState.currentState !== 'background') resume();
      redraw((n) => n + 1);
    });
    return () => {
      live = false;
      pause();
    };
  }, [checkinId]);

  // Leaving LevelMeUp pauses it; coming back goes on (board F4: "the timer pauses and waits for you").
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => (next === 'active' ? resume() : pause()));
    return () => sub.remove();
  }, []);

  // While it runs: the screen stays awake, the clock redraws every second, and the minutes are kept every 5 seconds.
  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      if (ticks % CHECKPOINT_TICKS === 0) save();
      redraw((n) => n + 1);
    }, 1000);
    return () => {
      clearInterval(id);
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [running]);

  // Ten minutes: the seal breaks (once).
  const reached = loaded.current && elapsed() >= TRIAL_FOCUS_MS;
  useEffect(() => {
    if (!reached || finished || checkinId === null || !openRef.current) return;
    pause();
    setFinished(true);
    void enqueue({ type: 'trial', checkinId });
  }, [reached, finished]);

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      {children}
    </ScreenScroll>
  );
  if (finished) {
    return frame(
      <>
        <NarrationBox>{T.done}</NarrationBox>
        <Button label={SHADOW_TEXT.done} onPress={onDone} />
      </>,
    );
  }
  if (!open) {
    return frame(
      <>
        <NarrationBox>{T.gone}</NarrationBox>
        <Button label={SHADOW_TEXT.done} variant="secondary" onPress={onDone} />
      </>,
    );
  }
  const done = Math.min(elapsed(), TRIAL_FOCUS_MS);
  return frame(
    <>
      <Label tone="ember">{SHADOW_TEXT.trial.title}</Label>
      <Label>{T.label}</Label>
      <View accessible accessibilityRole="timer" accessibilityLabel={`${clock(TRIAL_FOCUS_MS - done)} ${T.left}`} style={{ alignItems: 'center', gap: 6, paddingVertical: 18 }}>
        <Display>{clock(TRIAL_FOCUS_MS - done)}</Display>
        <Small>{T.left}</Small>
      </View>
      <XpBar value={done} max={TRIAL_FOCUS_MS} label={T.label} />
      <NarrationBox>{T.stay}</NarrationBox>
      <Small tone="chalk">{T.apps}</Small>
      <Button label={T.end} variant="secondary" onPress={onDone} />
      <Small>{T.endNote}</Small>
    </>,
  );
}
