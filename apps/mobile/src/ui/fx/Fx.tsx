// Monster Week's effects, drawn on the GPU with React Native Skia (the only file that imports it, as haptics.ts is for
// expo-haptics). A power burst where a shot lands: a ring that widens and fades, and sparkles that fly out. Power shots
// for the battle: glowing comets that arc up into the Grumble, one after another (Monster Buddy: out of your buddy's
// paw into the Grumble where it stands, when the screen says). With reduced motion neither draws;
// the screens show the numbers without them.
import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { delayed, timing } from '../motion.ts';
import { useReduce } from '../useMotion.ts';

export const BURST_FX_MS = 650;
/** A shot's flight, and the time between two shots. */
export const SHOT_MS = 520;
export const SHOT_GAP_MS = 260;

const SPARKLE = Skia.Path.MakeFromSVGString('M0 -6 Q1 -1 6 0 Q1 1 0 6 Q-1 1 -6 0 Q-1 -1 0 -6 Z')!;

function Sparkle({ t, angle, reach, size, centre, color }: { t: SharedValue<number>; angle: number; reach: number; size: number; centre: number; color: string }) {
  const transform = useDerivedValue(() => {
    const d = reach * Math.sqrt(t.value);
    return [{ translateX: centre + Math.cos(angle) * d }, { translateY: centre + Math.sin(angle) * d }, { scale: (size / 6) * (1 - 0.6 * t.value) }];
  });
  const opacity = useDerivedValue(() => (t.value >= 1 ? 0 : 1 - t.value * t.value));
  return <Path path={SPARKLE} color={color} transform={transform} opacity={opacity} />;
}

/** A burst at the middle of a `size` square, played for each new `burstKey` (never for the first). */
export function PowerBurst({ burstKey, size, color }: { burstKey: number; size: number; color: string }) {
  const reduce = useReduce();
  const t = useSharedValue(1);
  const first = useRef(burstKey);
  useEffect(() => {
    if (burstKey === first.current || reduce) return;
    first.current = burstKey;
    t.value = 0;
    t.value = withTiming(1, timing(BURST_FX_MS, Easing.out(Easing.quad)));
  }, [burstKey, reduce, t]);
  const c = size / 2;
  const ringR = useDerivedValue(() => 10 + t.value * size * 0.4);
  const ringW = useDerivedValue(() => 6 * (1 - t.value));
  const ringO = useDerivedValue(() => (t.value >= 1 ? 0 : 0.9 * (1 - t.value)));
  const sparkles = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ angle: (i / 9) * Math.PI * 2 + 0.3, reach: size * (0.3 + 0.12 * (i % 3)), size: 5 + (i % 3) * 2 })), [size]);
  if (reduce) return null;
  return (
    <Canvas testID="power-burst" pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}>
      <Group>
        <Circle cx={c} cy={c} r={ringR} color={color} style="stroke" strokeWidth={ringW} opacity={ringO}>
          <BlurMask blur={3} style="solid" />
        </Circle>
        {sparkles.map((s, i) => <Sparkle key={i} t={t} angle={s.angle} reach={s.reach} size={s.size} centre={c} color={color} />)}
      </Group>
    </Canvas>
  );
}

type Point = { x: number; y: number };

function Shot({ index, width, height, color, run, origin, target }: {
  index: number; width: number; height: number; color: string; run: number; origin?: Point; target?: Point;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (run === 0) return;
    t.value = 0;
    t.value = delayed(index * SHOT_GAP_MS, withTiming(1, timing(SHOT_MS, Easing.in(Easing.quad))));
  }, [run, index, t]);
  // From low on the left or right, arcing into the Grumble at the top middle; or from the buddy's paw, looping up over it.
  const side = index % 2 === 0 ? -1 : 1;
  const to = target ?? { x: width / 2, y: height * 0.32 };
  const from = origin ?? { x: width / 2 + side * width * (0.25 + 0.1 * (index % 3)), y: height };
  const bend = origin === undefined
    ? { x: width / 2 + side * width * 0.42, y: height * 0.55 }
    : { x: (origin.x + to.x) / 2 + side * width * 0.06, y: Math.min(origin.y, to.y) - height * 0.12 };
  const at = (u: number) => {
    'worklet';
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    return { x: a * from.x + b * bend.x + c * to.x, y: a * from.y + b * bend.y + c * to.y };
  };
  const head = useDerivedValue(() => at(t.value));
  const tail = useDerivedValue(() => at(Math.max(0, t.value - 0.12)));
  const cx = useDerivedValue(() => head.value.x);
  const cy = useDerivedValue(() => head.value.y);
  const tx = useDerivedValue(() => tail.value.x);
  const ty = useDerivedValue(() => tail.value.y);
  const shown = useDerivedValue(() => (t.value <= 0 || t.value >= 1 ? 0 : 1));
  return (
    <Group opacity={shown}>
      <Circle cx={tx} cy={ty} r={5} color={color} opacity={0.45}>
        <BlurMask blur={6} style="normal" />
      </Circle>
      <Circle cx={cx} cy={cy} r={8} color={color}>
        <BlurMask blur={5} style="solid" />
      </Circle>
    </Group>
  );
}

/** `colors.length` shots, one after another, each new `run`; the screen times its hits by SHOT_GAP_MS and SHOT_MS. They
 * leave from `origin` and land on `target` when given. */
export function PowerShots({ colors, width, height, run, origin, target }: {
  colors: readonly string[]; width: number; height: number; run: number; origin?: Point; target?: Point;
}) {
  const reduce = useReduce();
  if (reduce || width === 0) return null;
  return (
    <Canvas testID="power-shots" pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {colors.map((color, i) => <Shot key={i} index={i} width={width} height={height} color={color} run={run} origin={origin} target={target} />)}
    </Canvas>
  );
}
