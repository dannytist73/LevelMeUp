// Hold to swear (visual spec §3): a commitment button that fills while held and fires after `holdMs`; letting go early
// cancels. With a screen reader on, holding isn't practical, so a tap shows a Confirm button instead.
// M10b: a tick when the hold starts, the sworn click as it fires (spec decision 6); nothing when let go early, and nothing
// for a scroll that starts on the button (the hold waits for the press to settle; review).
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts, radius } from '../theme/tokens.ts';
import { Button } from './Button.tsx';
import { buzz } from './haptics.ts';
import { play } from './sound.ts';

export type HoldButtonProps = {
  label: string;
  tapLabel: string;
  confirmLabel: string;
  onDone: () => void;
  holdMs?: number;
  disabled?: boolean;
  /** Overrides the phone's setting (tests, the kit). */
  screenReader?: boolean;
};

/**
 * The hold starts once the press has settled (M10b review), as Android's own tap timeout does in a scrolling list: a
 * scroll that starts on the button takes the touch before then, so it never ticks or starts the fill. It is Pressable's
 * press delay: a timer of our own can't do it, because React Native holds a press's end back until 130 ms after it
 * began, so a scroll's end came after the timer (emulator check).
 */
export const HOLD_SETTLE_MS = 100;

export function HoldButton({ label, tapLabel, confirmLabel, onDone, holdMs = 2_000, disabled = false, screenReader }: HoldButtonProps) {
  const [readerOn, setReaderOn] = useState(screenReader ?? false);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fill = useSharedValue(0);

  useEffect(() => {
    if (screenReader !== undefined) return;
    void AccessibilityInfo.isScreenReaderEnabled().then(setReaderOn);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setReaderOn);
    return () => sub.remove();
  }, [screenReader]);
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  if (readerOn) {
    return confirming
      ? <Button label={confirmLabel} variant="commitment" disabled={disabled} onPress={() => { buzz('sworn'); play('sworn'); onDone(); }} />
      : <Button label={tapLabel} variant="commitment" disabled={disabled} onPress={() => setConfirming(true)} />;
  }

  const start = () => {
    buzz('tick');
    // The fill is how long to keep holding, not decoration: it runs even with reduced motion on (M5 review).
    fill.value = withTiming(1, { duration: holdMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never });
    timer.current = setTimeout(() => {
      timer.current = null;
      buzz('sworn');
      play('sworn');
      onDone();
    }, holdMs);
  };
  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    cancelAnimation(fill);
    fill.value = withTiming(0, { duration: 120 });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      unstable_pressDelay={HOLD_SETTLE_MS}
      onPressIn={start}
      onPressOut={stop}
      style={{ minHeight: 56, paddingHorizontal: 20, justifyContent: 'center', borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.commit, opacity: disabled ? 0.45 : 1 }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 17, lineHeight: 22, color: colors.onAccent, textAlign: 'center' }}>
        {label}
      </Text>
      <Animated.View testID="hold-fill" style={[{ position: 'absolute', left: 0, bottom: 0, height: 5, backgroundColor: colors.onAccent }, bar]} />
    </Pressable>
  );
}
