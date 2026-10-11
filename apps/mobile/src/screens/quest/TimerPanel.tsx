// Timer quests (spec §3.6, M6a decision 3): start, pause, resume. It counts from timestamps, so it keeps going with the
// screen off; the panel only redraws once a second while it runs. Claim unlocks at the server's own 80 %.
import { PLAY_TEXT, fillText } from '@levelmeup/content';
import { TIMER_COMPLETE_FRACTION } from '@levelmeup/rules';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { timerPayload } from '../../quest/payload.ts';
import { pauseTimer, startTimer, timerDone, timerElapsed } from '../../quest/timer.ts';
import type { TimerState } from '../../quest/timer.ts';
import { Button } from '../../ui/Button.tsx';
import { Display, Heading, Small } from '../../ui/Text.tsx';
import { XpBar } from '../../ui/XpBar.tsx';

const T = PLAY_TEXT.timer;

/** "mm:ss", or "h:mm:ss" from an hour. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export type TimerPanelProps = {
  timer: TimerState;
  targetMs: number;
  now: () => number;
  disabled: boolean;
  onChange: (timer: TimerState) => void;
  onClaim: (payload: Record<string, unknown>) => void;
};

export function TimerPanel({ timer, targetMs, now, disabled, onChange, onClaim }: TimerPanelProps) {
  const [, tick] = useState(0);
  const running = timer.runningSince !== null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const at = now();
  const elapsed = timerElapsed(timer, at);
  const done = timerDone(timer, at, targetMs);
  const started = running || timer.segments.length > 0;
  return (
    <View style={{ gap: 12 }}>
      {/* The elapsed time large, the target beside it: "mm:ss / mm:ss" at display size wrapped onto two lines (emulator). */}
      <View accessible accessibilityLabel={`${clock(elapsed)} of ${clock(targetMs)}`} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 10 }}>
        <Display>{clock(elapsed)}</Display>
        <Heading tone="ash">{`/ ${clock(targetMs)}`}</Heading>
      </View>
      <XpBar value={Math.min(elapsed, targetMs)} max={targetMs} label={T.progress} />
      <Small>{done ? T.ready : fillText(T.note, { at: clock(targetMs * TIMER_COMPLETE_FRACTION) })}</Small>
      <Button
        label={running ? T.pause : started ? T.resume : T.start}
        variant="secondary"
        disabled={disabled}
        onPress={() => onChange(running ? pauseTimer(timer, now()) : startTimer(timer, now()))}
      />
      <Button label={PLAY_TEXT.claim.timer} variant="commitment" disabled={disabled || !done} onPress={() => onClaim(timerPayload(timer, now()))} />
    </View>
  );
}
