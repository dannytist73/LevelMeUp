// The Shadow (board F2): a 16:9 painting. M9a's went with Monster Week (the owner retired the earlier pictures); Monster
// Buddy paints it again in clay, shipped in the app, a hooded figure of dark smoke with two glowing eyes. M10a: it creeps
// closer over four seconds, once. M10b (spec decision 7): it lives. A glow pulses over each painted eye, embers rise from
// its lower half, and after the creep it breathes. The one screen that keeps moving while it's open: nothing runs while LevelMeUp is in the background, and
// with reduced motion it is still.
import { SHADOW_TEXT } from '@levelmeup/content';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors, radius } from '../theme/tokens.ts';
import {
  BREATH_MS, BREATH_TO, CREEP_MS, CREEP_TO, EMBERS, GLOW_SHARE, PULSE_FROM, PULSE_MS, PULSE_TO, SHADOW_EYES, delayed, forever, timing,
} from './motion.ts';
import type { Ember as EmberSpec, ShadowEye } from './motion.ts';
import { useAppActive, useReduce } from './useMotion.ts';

const T = SHADOW_TEXT;
const PAINTING = require('../../assets/shadow/shadow.webp');

/** A soft red glow over one painted eye; both share the pulse. */
function Glow({ eye, id, pulse }: { eye: ShadowEye; id: string; pulse: SharedValue<number> }) {
  const glowing = useAnimatedStyle(() => ({ opacity: pulse.value }));
  // Placed by its corner: a percentage width is of the frame's width but a percentage top of its height (and Yoga reads a
  // placed view's top margin against the height too; review), so the square's half side is GLOW_SHARE / 2 across and
  // that times 16/9 down the 16:9 frame.
  const corner = { left: `${(eye.x - GLOW_SHARE / 2) * 100}%`, top: `${(eye.y - (GLOW_SHARE / 2) * (16 / 9)) * 100}%` } as const;
  return (
    <Animated.View
      testID="eye-glow"
      style={[{ position: 'absolute', ...corner, width: `${GLOW_SHARE * 100}%`, aspectRatio: 1 }, glowing]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.shadow} stopOpacity={0.9} />
            <Stop offset="0.4" stopColor={colors.shadow} stopOpacity={0.45} />
            <Stop offset="1" stopColor={colors.shadow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

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
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={T.art}
      style={{ width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: radius.card, backgroundColor: colors.void }}>
      <Animated.View testID="shadow-creep" pointerEvents="none"
        style={[StyleSheet.absoluteFill, reduce ? null : moving]}>
        <Image testID="shadow-art" source={PAINTING} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        {!reduce && (
          <View testID="shadow-life" pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={StyleSheet.absoluteFill}>
            {SHADOW_EYES.map((e, i) => <Glow key={i} eye={e} id={`shadow-eye-${i}`} pulse={pulse} />)}
            {EMBERS.map((e, i) => <Ember key={i} ember={e} running={living} />)}
          </View>
        )}
      </Animated.View>
    </View>
  );
}
