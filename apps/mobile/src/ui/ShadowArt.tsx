// The Shadow's painting (board F2; M9a decision 7): 16:9 like the quest art, over the dark and two ember eyes that show
// while it loads, or when it can't (offline before it was first seen). M10a: it creeps closer over four seconds, once,
// from when it has loaded. M10b (spec decision 7): it lives. The painted eyes glow and pulse, embers rise from its lower
// half, and after the creep it breathes; the stand-in's eyes pulse while the painting loads. The one screen that keeps
// moving while it's open: nothing runs while LevelMeUp is in the background, and with reduced motion it is still.
import { SHADOW_TEXT } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { SHADOW_ART_URL } from '../art/portraits.ts';
import { colors } from '../theme/tokens.ts';
import {
  BREATH_MS, BREATH_TO, CREEP_MS, CREEP_TO, EMBERS, GLOW_SHARE, PULSE_FROM, PULSE_MS, PULSE_TO, SHADOW_EYES, delayed, forever, timing,
} from './motion.ts';
import type { Ember as EmberSpec, ShadowEye } from './motion.ts';
import { useAppActive, useReduce } from './useMotion.ts';

const T = SHADOW_TEXT;

/** A soft red glow over one painted eye; both share the pulse. */
function Glow({ eye, id, pulse }: { eye: ShadowEye; id: string; pulse: SharedValue<number> }) {
  const glowing = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const share = GLOW_SHARE * 100;
  return (
    <Animated.View
      testID="eye-glow"
      // Percentage margins are of the frame's width on both axes, so the square glow is centred on the eye.
      style={[{ position: 'absolute', left: `${eye.x * 100}%`, top: `${eye.y * 100}%`, width: `${share}%`, aspectRatio: 1, marginLeft: `${-share / 2}%`, marginTop: `${-share / 2}%` }, glowing]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.vermilion} stopOpacity={0.9} />
            <Stop offset="0.4" stopColor={colors.vermilion} stopOpacity={0.45} />
            <Stop offset="1" stopColor={colors.vermilion} stopOpacity={0} />
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
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduce = useReduce();
  const active = useAppActive();
  const creep = useSharedValue(1);
  const breath = useSharedValue(1);
  const pulse = useSharedValue(PULSE_FROM);
  const living = loaded && !reduce && active;
  // The creep: once, from when the painting has loaded (a slow first download would otherwise hide it; M10a).
  useEffect(() => {
    if (loaded && !reduce) creep.value = withTiming(CREEP_TO, timing(CREEP_MS, Easing.inOut(Easing.quad)));
  }, [loaded, reduce, creep]);
  // The breath follows the creep; in the background it stops, and on return it waits its turn again (plan decision 9).
  useEffect(() => {
    if (!living) return;
    breath.value = delayed(CREEP_MS, forever(withTiming(BREATH_TO, timing(BREATH_MS, Easing.inOut(Easing.sin))), true));
    return () => cancelAnimation(breath);
  }, [living, breath]);
  // The eyes pulse from the first frame: the stand-in's while the painting loads, the painted ones' glows once it has.
  useEffect(() => {
    if (reduce || !active) return;
    pulse.value = forever(withTiming(PULSE_TO, timing(PULSE_MS, Easing.inOut(Easing.sin))), true);
    return () => cancelAnimation(pulse);
  }, [reduce, active, pulse]);
  const moving = useAnimatedStyle(() => ({ transform: [{ scale: creep.value * breath.value }] }));
  const smouldering = useAnimatedStyle(() => ({ opacity: Math.min(1, pulse.value + 0.15) }));
  const eye = { width: 34, height: 7, backgroundColor: colors.vermilion };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={T.art}
      style={{ width: '100%', aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: colors.line, backgroundColor: colors.halftone }}>
      <Animated.View testID="shadow-eyes" style={[{ flexDirection: 'row', gap: 22 }, reduce ? null : smouldering]}>
        <View style={[eye, { transform: [{ rotate: '10deg' }] }]} />
        <View style={[eye, { transform: [{ rotate: '-10deg' }] }]} />
      </Animated.View>
      {!failed && (
        <Animated.View testID="shadow-creep" pointerEvents="none" style={[StyleSheet.absoluteFill, reduce ? null : moving]}>
          <Image testID="shadow-art" source={{ uri: SHADOW_ART_URL }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} resizeMode="cover"
            style={{ width: '100%', height: '100%' }} />
          {loaded && !reduce && (
            <View testID="shadow-life" pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={StyleSheet.absoluteFill}>
              {SHADOW_EYES.map((e, i) => <Glow key={i} eye={e} id={`shadow-eye-${i}`} pulse={pulse} />)}
              {EMBERS.map((e, i) => <Ember key={i} ember={e} running={living} />)}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}
