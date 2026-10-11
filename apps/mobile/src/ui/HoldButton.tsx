// Hold to swear (visual spec §3): a commitment button that fills while held and fires after `holdMs`; letting go early
// cancels. With a screen reader on, holding isn't practical, so a tap shows a Confirm button instead.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '../theme/tokens.ts';
import { Button } from './Button.tsx';

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
      ? <Button label={confirmLabel} variant="commitment" disabled={disabled} onPress={onDone} />
      : <Button label={tapLabel} variant="commitment" disabled={disabled} onPress={() => setConfirming(true)} />;
  }

  const start = () => {
    // The fill is how long to keep holding, not decoration: it runs even with reduced motion on (M5 review).
    fill.value = withTiming(1, { duration: holdMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never });
    timer.current = setTimeout(() => {
      timer.current = null;
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
      onPressIn={start}
      onPressOut={stop}
      style={{ minHeight: 56, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 2, borderColor: colors.chalk, backgroundColor: colors.seal, opacity: disabled ? 0.45 : 1 }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 16, lineHeight: 20, letterSpacing: 1.9, color: colors.white, textAlign: 'center', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Animated.View testID="hold-fill" style={[{ position: 'absolute', left: 0, bottom: 0, height: 4, backgroundColor: colors.paper }, bar]} />
    </Pressable>
  );
}
