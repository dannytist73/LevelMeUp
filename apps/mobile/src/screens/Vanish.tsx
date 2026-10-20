// Vanish (Rogue level 10, spec §2.5; M6b decision 11): a planned phone-free block guarded by a timer. The screen stays
// awake and dark, and the block counts only while LevelMeUp stays open: leaving the app pauses it (calls and other apps
// always work). Nothing goes to the server: the rules give Vanish no reward. The timer is M6a's timestamps (quest/timer.ts).
import { ADJUST_TEXT, fillText } from '@levelmeup/content';
import { abilityUnlocked } from '@levelmeup/rules';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clockTime } from '../lib/dates.ts';
import { NEW_TIMER, pauseTimer, startTimer, timerElapsed } from '../quest/timer.ts';
import type { TimerState } from '../quest/timer.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Display, Title } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';

const T = ADJUST_TEXT.vanish;
export const VANISH_MINUTES = [30, 60, 90] as const;
const KEEP_AWAKE_TAG = 'lmu-vanish';

export type VanishProps = { onBack: () => void; now?: () => number };

export function Vanish({ onBack, now = Date.now }: VanishProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [timer, setTimer] = useState<TimerState>(NEW_TIMER);
  const [left, setLeft] = useState(false);
  const [, tick] = useState(0);
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const running = timer.runningSince !== null;
  const targetMs = (minutes ?? 0) * 60_000;
  const done = minutes !== null && timerElapsed(timer, now()) >= targetMs;

  // The guard: LevelMeUp leaving the foreground pauses the block.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' || timerRef.current.runningSince === null) return;
      setTimer(pauseTimer(timerRef.current, now()));
      setLeft(true);
    });
    return () => sub.remove();
  }, [now]);

  // While it runs: the screen stays awake, and the clock redraws every second.
  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      clearInterval(id);
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [running]);

  useEffect(() => {
    if (done && running) setTimer((t) => pauseTimer(t, now()));
  }, [done, running, now]);

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      {children}
    </ScreenScroll>
  );
  const back = <TopBar onBack={onBack} />;

  if (view === null || !abilityUnlocked('vanish', view.profile.classId, view.character.level)) {
    // M17: locked, the bar names the screen (an empty bar over one line said nothing of where you were).
    return frame(<><TopBar title={T.title} onBack={onBack} /><NarrationBox>{T.locked}</NarrationBox></>);
  }
  if (minutes === null) {
    return frame(
      <>
        {back}
        <Title accessibilityRole="header">{T.title}</Title>
        <Body>{T.lead}</Body>
        {VANISH_MINUTES.map((n) => (
          <Button
            key={n}
            label={fillText(T.minutes, { n })}
            variant="secondary"
            onPress={() => {
              setMinutes(n);
              setLeft(false);
              setTimer(startTimer(NEW_TIMER, now()));
            }}
          />
        ))}
      </>,
    );
  }
  if (done) {
    return frame(
      <>
        <NarrationBox>{fillText(T.done, { n: minutes })}</NarrationBox>
        <Button label={T.finish} onPress={onBack} />
      </>,
    );
  }
  const backAt = clockTime(new Date(now() + targetMs - timerElapsed(timer, now())).toISOString(), view.profile.timeZone);
  return frame(
    <>
      <Display>{T.running}</Display>
      {running ? (
        <Body tone="ash">{fillText(T.backAt, { at: backAt })}</Body>
      ) : (
        <>
          {left && <NarrationBox>{T.paused}</NarrationBox>}
          <Button
            label={T.resume}
            onPress={() => {
              setLeft(false);
              setTimer(startTimer(timer, now()));
            }}
          />
        </>
      )}
      <Button label={T.end} variant="secondary" onPress={onBack} />
    </>,
  );
}
