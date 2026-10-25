// The Shadow (board F2): a 16:9 dark with two ember eyes. M9a's painting is gone (Monster Week: the owner retired the
// earlier pictures), so the dark and its eyes are the Shadow until it is drawn again. M10a: it creeps closer over four
// seconds, once. M10b (spec decision 7): it lives. The eyes pulse, embers rise from its lower half, and after the creep
// it breathes. The one screen that keeps moving while it's open: nothing runs while LevelMeUp is in the background, and
// with reduced motion it is still.
import { SHADOW_TEXT } from '@levelmeup/content';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { colors, radius } from '../theme/tokens.ts';
import { BREATH_MS, BREATH_TO, CREEP_MS, CREEP_TO, EMBERS, PULSE_FROM, PULSE_MS, PULSE_TO, delayed, forever, timing } from './motion.ts';
import type { Ember as EmberSpec } from './motion.ts';
import { useAppActive, useReduce } from './useMotion.ts';

const T = SHADOW_TEXT;

/** One ember: it rises, drifting a little, fading in and out, then starts again. */
function Ember({ ember, running }: { ember: EmberSpec; running: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!running) return;
    p.value = delayed(ember.delay, forever(withTiming(1, timing(ember.ms, Easing.linear)), false));
    return () => {
      cancelAnimation(p);
      p.value = 0;
    };
  }, [running, ember, p]);
  const rising = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: t < 0.2 ? (t / 0.2) * 0.9 : t > 0.7 ? ((1 - t) / 0.3) * 0.9 : 0.9,
      transform: [{ translateX: ember.drift * t }, { translateY: -ember.rise * t }],
    };
  });
  return (
    <Animated.View
      testID="ember"
      style={[{ position: 'absolute', left: `${ember.x * 100}%`, top: `${ember.y * 100}%`, width: ember.size, height: ember.size, borderRadius: ember.size / 2, backgroundColor: colors[ember.tone] }, rising]}
    />
  );
}

export function ShadowArt() {
  const reduce = useReduce();
  const active = useAppActive();
  const creep = useSharedValue(1);
  const breath = useSharedValue(1);
  const pulse = useSharedValue(PULSE_FROM);
  const living = !reduce && active;
  // The creep: once, as the scene opens (M10a).
  useEffect(() => {
    if (!reduce) creep.value = withTiming(CREEP_TO, timing(CREEP_MS, Easing.inOut(Easing.quad)));
  }, [reduce, creep]);
  // The breath follows the creep; in the background it stops, and on return it waits its turn again (plan decision 9).
  // A back-and-forth loop swings between where it starts and its end, so each stops at its start: otherwise the breath
  // and the pulse would come back smaller after every trip to the background (review).
  useEffect(() => {
    if (!living) return;
    breath.value = delayed(CREEP_MS, forever(withTiming(BREATH_TO, timing(BREATH_MS, Easing.inOut(Easing.sin))), true));
    return () => {
      cancelAnimation(breath);
      breath.value = 1;
    };
  }, [living, breath]);
  // The eyes pulse from the first frame.
  useEffect(() => {
    if (reduce || !active) return;
    pulse.value = forever(withTiming(PULSE_TO, timing(PULSE_MS, Easing.inOut(Easing.sin))), true);
    return () => {
      cancelAnimation(pulse);
      pulse.value = PULSE_FROM;
    };
  }, [reduce, active, pulse]);
  const moving = useAnimatedStyle(() => ({ transform: [{ scale: creep.value * breath.value }] }));
  const smouldering = useAnimatedStyle(() => ({ opacity: Math.min(1, pulse.value + 0.15) }));
  const eye = { width: 34, height: 7, backgroundColor: colors.shadow };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={T.art}
      style={{ width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: radius.card, backgroundColor: colors.void }}>
      <Animated.View testID="shadow-creep" pointerEvents="none"
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, reduce ? null : moving]}>
        <Animated.View testID="shadow-eyes" style={[{ flexDirection: 'row', gap: 22 }, reduce ? null : smouldering]}>
          <View style={[eye, { transform: [{ rotate: '10deg' }] }]} />
          <View style={[eye, { transform: [{ rotate: '-10deg' }] }]} />
        </Animated.View>
        {!reduce && (
          <View testID="shadow-life" pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={StyleSheet.absoluteFill}>
            {EMBERS.map((e, i) => <Ember key={i} ember={e} running={living} />)}
          </View>
        )}
      </Animated.View>
    </View>
  );
}
