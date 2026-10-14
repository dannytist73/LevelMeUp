# M10b — Haptics and a living Shadow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The phone gives a small click when a reward stamp lands or a vow is sworn (with a Haptics switch in Settings),
and the Shadow's painting comes alive in code: its eyes pulse, embers rise, and it breathes.

**Architecture:**
- **Haptics:** one file, `apps/mobile/src/ui/haptics.ts`, is the only one that imports expo-haptics. It plays four
  feels on Android's own haptic engine.
  - M10a's `Thud` gains a `haptic` prop and buzzes as its stamp lands; `HoldButton` ticks and clicks.
  - The moments pass the feels: Quest cleared, the level-up and achievement modal, and Today's streak.
  - The switch lives in the game store, kept on the phone (`lmu.haptics`).
- **The living Shadow:** the painting moves from `ShadowScene.tsx` to `src/ui/ShadowArt.tsx`. It gains:
  - two glows on the painted eyes;
  - ten embers;
  - a breath after M10a's creep.

  Its numbers live in `src/ui/motion.ts`; a new `useAppActive` hook stops the loops in the background.
- **What doesn't change:** no server change, no new art, no cost.

**Tech Stack:**
- **App:** as M10a (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14).
- **Motion:** Reanimated 4.5.1, react-native-svg 15.15.4.
- **New:** `expo-haptics` ~57.0.3 (Expo's own; it adds Android's `VIBRATE` permission, which
  `performAndroidHapticsAsync` itself doesn't need).

**Specs:**
- `docs/superpowers/specs/2026-10-14-m10b-haptics-living-shadow-design.md`: approved by the owner 2026-10-14 ("spec
  approved, write the plan"). Decisions 1–9 there.
- M10a's spec and plan (`2026-10-14-m10a-motion*.md`): the pieces this builds on, and the rule that every timing runs
  on `ReduceMotion.Never`.
- CLAUDE.md: "a new native module needs a new EAS build"; "Accessibility basics … a reduced-motion path".

---

## Plain summary

When M10b is done:
- **Quest cleared:** a firm click as the XP stamp lands, and one light tick as the rank stamps land.
- **Level-ups and achievements:** a stronger double click as "LV n" lands; a firm click as an achievement's name lands.
- **Today:** a light tick when the streak flame flares.
- **The vow and the pact:** a tick when you start holding, a long-press click when it's sworn.
- **No buzz for a miss:** not the Shadow, not undo, not anything shown still.
- **The switch:** Settings → Game gets a Haptics switch, on by default. The phone's own touch-feedback setting applies on
  top.
- **The Shadow's scene:**
  - the painted eyes glow and pulse;
  - embers rise and fade;
  - after its four-second creep, the painting breathes.

  It stops while the app is in the background, and stays still with "Remove animations" on.

**What it needs:**
- One new native module (expo-haptics), approved with the spec.
- **Your part, two yeses:**
  1. After the build and the review: the EAS development build (free tier), for the emulator checks.
  2. After the emulator checks: the 0.4.0 pilot APK (free tier).

  Then the Find X9 rows, when it suits.

## Decisions this plan makes

The spec's decisions stand. These are the details it left open, settled here. Deviations from the spec are marked.

1. **The stand-in click** (spec decision 5's open check, answered).
   - **What expo-haptics does:** 57.0.3's Android code maps each name to `HapticFeedbackConstants` by reflection. A
     constant the phone lacks throws `HapticsNotSupportedException`, so `Confirm` (Android 11 and up) is refused on
     older phones rather than played as something else. `Clock_Tick` and `Long_Press` exist on every Android.
   - **So:** when a haptic is refused, `Long_Press` plays instead, once, and a refused `Long_Press` is the end of it.
   - **The phone's setting:** the call is `View.performHapticFeedback` on the activity's content view, which follows
     the phone's touch-feedback setting. That's still to confirm on ColorOS (a Find X9 row).
2. **Tests never sound a haptic.** The Jest setup mocks `src/ui/haptics.ts` for every test (`buzz` and `setBuzzing`
   become `jest.fn`s), so screen tests can see each buzz. The module's own test reaches the real one with
   `jest.requireActual`.
3. **Deleting the character keeps the switch.** The spec is silent here.
   - **Why:** the switch belongs to the phone, not to a player, and holds nothing of them.
   - **What goes:** the portrait choice and the notifications go with the character, because they're about the
     player.
4. **`Thud`'s buzz has its own effect** (deviation in form from spec decision 6's "the same effect").
   - **Its dependencies:** `still`, `haptic` and `delay`, so nothing else can restart it: a re-render on the phone, or
     every re-render in a test, where Reanimated's mock makes fresh shared values (M10a's lesson).
   - **Same behaviour:** it starts and stops with the piece.
5. **`THUD_LAND_MS` = 100 is tested against the spring.** With `THUD_SPRING` (damping 18, mass 0.6, stiffness 400), the
   stamp first reaches full size at about 104 ms. A test computes that from the spring's numbers, so changing the spring
   without the constant fails.
6. **`ShadowArt` moves to `src/ui/ShadowArt.tsx`.**
   - **Why:** with the glows, the embers and the breath, it would double the scene's file.
   - **Kept:** the scene's tests find it by the same test ids (`shadow-art`, `shadow-creep`).
7. **The eyes pulse from the first frame; the rest waits for the painting.**
   - **The stand-in's eyes** are what shows while the painting loads, so their pulse starts at once.
   - **The glows, the embers and the breath** start on `load`.
   - **The spec's testing line** said "nothing loops before the painting's `load`", against its own decision 7. It's
     corrected with this plan.
8. **`useAppActive` starts `true`.**
   - **Why:** a screen being shown is in front.
   - **In tests:** React Native's Jest mock of `AppState` has no current state.
   - **On the phone:** it follows `AppState`'s `change` events.
9. **After a background pause,** the breath waits its four seconds again before resuming. The creep, a one-off, is
   never repeated.
10. **`forever()` joins `motion.ts`.** It's `withRepeat(…, -1, reverse, undefined, ReduceMotion.Never)`, next to
    `delayed()`. `reducedMotion.test.tsx`'s contract adds `withRepeat`.
11. **The bench gains a hold button and a way to the Shadow.**
    - **Why the hold button:** the vow is onboarding-only, and the pact's hold changes the live pact, so the bench is
      where the hold's tick and click are tried.
    - **The Shadow:** a button opens Developer → Shadow preview, whose Scene shows the living Shadow.
12. **The level-up's second click** is a timer inside `haptics.ts` (120 ms). A screen left within those 120 ms still
    plays it, which is harmless.

## File structure

| File | Change | Responsibility |
|---|---|---|
| `apps/mobile/package.json`, `package-lock.json` | Modify | `expo-haptics` ~57.0.3 |
| `apps/mobile/src/ui/haptics.ts` | Create | The only expo-haptics import: `Feel`, `FEELS`, `buzz`, `setBuzzing` |
| `apps/mobile/test/support/setup.ts` | Modify | Mocks `haptics.ts` for every test |
| `apps/mobile/src/ui/motion.ts` | Modify | `THUD_LAND_MS`, `forever`, the living Shadow's numbers (`SHADOW_EYES`, `GLOW_SHARE`, `PULSE_*`, `BREATH_*`, `EMBERS`) |
| `apps/mobile/src/ui/useMotion.ts` | Modify | `useAppActive` |
| `apps/mobile/src/ui/Thud.tsx` | Modify | `haptic` prop |
| `apps/mobile/src/ui/HoldButton.tsx` | Modify | Tick on press, sworn click on fire |
| `apps/mobile/src/screens/quest/Cleared.tsx`, `src/screens/Celebration.tsx`, `src/screens/Today.tsx` | Modify | Pass the feels |
| `packages/content/src/settings.ts` | Modify | `SETTINGS_TEXT.haptics` |
| `apps/mobile/src/state/store.ts` | Modify | `haptics`, `setHaptics`, `HAPTICS_KEY` |
| `apps/mobile/test/support/store.ts` | Modify | The test store's `haptics`, `setHaptics` |
| `apps/mobile/src/ui/Toggle.tsx` | Create | The switch row, moved from Notifications |
| `apps/mobile/src/screens/Notifications.tsx` | Modify | Uses `Toggle` |
| `apps/mobile/src/screens/Settings.tsx` | Modify | The Haptics switch under Your game |
| `apps/mobile/src/ui/ShadowArt.tsx` | Create | The living painting (moved from the scene) |
| `apps/mobile/src/screens/ShadowScene.tsx` | Modify | Imports `ShadowArt` |
| `apps/mobile/src/dev/routes/motion.tsx` | Modify | The bench's Haptics section |
| `apps/mobile/app.json` | Modify | 0.4.0, versionCode 4 |
| `apps/mobile/test/haptics.test.ts` | Create | The module |
| `apps/mobile/test/feel.test.tsx` | Create | The pieces and moments buzz |
| `apps/mobile/test/livingShadow.test.tsx` | Create | The living Shadow |
| `apps/mobile/test/motion.test.tsx`, `test/reducedMotion.test.tsx`, `test/store.test.ts`, `test/settings.test.tsx` | Modify | New cases |
| Docs | Modify | Checklist, roadmap, visual spec, architecture, README, CLAUDE.md, pilot guide, As built |

---

### Task 0: Baseline

**Files:** none.

- [ ] **Step 1: The branch.** `m10b-haptics` exists, made from `main` at 3eb0c44, with the spec at 5dacd4c and its
  approval and this plan committed after it.

Run: `git -C "D:/App Projects/LevelMeUp" branch --show-current`
Expected: `m10b-haptics`

- [ ] **Step 2: Run the app's suite and the typecheck, and record the counts.**

```bash
npm -w @levelmeup/mobile test
npm run typecheck
```

Expected: app 839 tests in 54 suites (main after the merge), all passing; typecheck clean.

---

### Task 1: expo-haptics and the haptics file

**Files:**
- Modify: `apps/mobile/package.json`, `package-lock.json` (by the install)
- Create: `apps/mobile/src/ui/haptics.ts`, `apps/mobile/test/haptics.test.ts`
- Modify: `apps/mobile/test/support/setup.ts`

- [ ] **Step 1: Install.** From `apps/mobile`:

```bash
npx expo install expo-haptics
```

Expected: `apps/mobile/package.json` gains `"expo-haptics": "~57.0.3"` (SDK 57's version); `package-lock.json` changes.
No `app.json` plugin is needed: the module's own manifest adds `VIBRATE`.

- [ ] **Step 2: Write the failing test** `apps/mobile/test/haptics.test.ts`:

```ts
// M10b (spec decision 5; plan decisions 1–2): the one file that imports expo-haptics. The Jest setup mocks it for every
// other test; this one reaches the real module through jest.requireActual, with expo-haptics itself mocked.
import { Platform } from 'react-native';
import type * as HapticsModule from '../src/ui/haptics.ts';

const mockHaptics = {
  performAndroidHapticsAsync: jest.fn(async (_type: string): Promise<void> => {}),
  AndroidHaptics: { Confirm: 'confirm', Clock_Tick: 'clock-tick', Long_Press: 'long-press' },
};
jest.mock('expo-haptics', () => mockHaptics);

const { FEELS, buzz, setBuzzing } = jest.requireActual<typeof HapticsModule>('../src/ui/haptics.ts');
const H = mockHaptics.performAndroidHapticsAsync;
const played = () => H.mock.calls.map((c) => c[0]);
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  H.mockReset();
  H.mockImplementation(async () => {});
  setBuzzing(true);
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => jest.useRealTimers());

describe('a buzz (M10b spec decision 5)', () => {
  it("plays each feel on Android's own haptic engine", () => {
    buzz('stamp');
    buzz('tick');
    buzz('sworn');
    expect(played()).toEqual(['confirm', 'clock-tick', 'long-press']);
  });

  it('a level-up is a long press, then a confirm 120 ms later', () => {
    jest.useFakeTimers();
    buzz('level');
    expect(played()).toEqual(['long-press']);
    jest.advanceTimersByTime(119);
    expect(played()).toEqual(['long-press']);
    jest.advanceTimersByTime(1);
    expect(played()).toEqual(['long-press', 'confirm']);
  });

  it('with the switch off, nothing plays or is logged', () => {
    setBuzzing(false);
    buzz('stamp');
    expect(played()).toEqual([]);
    expect(console.info).not.toHaveBeenCalled();
  });

  it('off Android, nothing plays (the app is Android-first)', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    buzz('stamp');
    expect(played()).toEqual([]);
  });

  it('Android before 11 refuses Confirm, and a long press stands in (plan decision 1)', async () => {
    H.mockImplementationOnce(async () => {
      throw new Error('HapticsNotSupportedException');
    });
    buzz('stamp');
    await flush();
    expect(played()).toEqual(['confirm', 'long-press']);
  });

  it('never throws and never loops: a phone that refuses every haptic stays quiet', async () => {
    H.mockImplementation(async () => {
      throw new Error('no haptics');
    });
    expect(() => buzz('stamp')).not.toThrow();
    expect(() => buzz('sworn')).not.toThrow();
    await flush();
    expect(played()).toEqual(['confirm', 'long-press', 'long-press']); // the stamp's stand-in once; a refused long press ends it
  });

  it('a development build logs each buzz, so the emulator (which cannot be felt) can be checked', () => {
    buzz('tick');
    expect(console.info).toHaveBeenCalledWith('[haptic] tick');
  });

  it('uses only haptics every Android has, or Confirm with its stand-in', () => {
    const used = new Set(Object.values(FEELS).flat().map((s) => s.haptic));
    expect(used).toEqual(new Set(['Confirm', 'Clock_Tick', 'Long_Press']));
  });
});
```

- [ ] **Step 3: Run it to make sure it fails.**

Run: `npm -w @levelmeup/mobile test -- haptics`
Expected: FAIL, "Cannot find module '../src/ui/haptics.ts'".

- [ ] **Step 4: Write `apps/mobile/src/ui/haptics.ts`:**

```ts
// M10b: the one file that imports expo-haptics (spec decision 5), as only notify/os.ts imports expo-notifications. A buzz
// plays a feel on Android's own haptic engine (`performAndroidHapticsAsync`: crisp clicks that follow the phone's
// touch-feedback setting and need no permission), never the Vibrator. It never waits and never throws: a phone that
// can't buzz stays quiet. expo-haptics loads at the first buzz; the Jest setup mocks this file for every other test.
import type * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';

const lib = (): typeof ExpoHaptics => require('expo-haptics');

export type Feel = 'stamp' | 'tick' | 'level' | 'sworn';
export type Haptic = keyof typeof ExpoHaptics.AndroidHaptics;
/** One haptic of a feel, `after` ms from its start. */
export type Step = { haptic: Haptic; after: number };

/** Each feel as Android's haptics (spec decision 5). A starting point: the Find X9 tunes them. */
export const FEELS: Readonly<Record<Feel, readonly Step[]>> = {
  stamp: [{ haptic: 'Confirm', after: 0 }],
  tick: [{ haptic: 'Clock_Tick', after: 0 }],
  level: [{ haptic: 'Long_Press', after: 0 }, { haptic: 'Confirm', after: 120 }],
  sworn: [{ haptic: 'Long_Press', after: 0 }],
};

/** Every Android has it; it stands in when expo-haptics refuses a haptic (Confirm before Android 11; plan decision 1). */
const STAND_IN: Haptic = 'Long_Press';

let on = true;

/** The Haptics switch (Settings → Game), as the store last read or set it; on until then. */
export function setBuzzing(next: boolean): void {
  on = next;
}

function play(haptic: Haptic): void {
  try {
    const h = lib();
    const go = (which: Haptic) => h.performAndroidHapticsAsync(h.AndroidHaptics[which]);
    void go(haptic)
      .catch(() => (haptic === STAND_IN ? undefined : go(STAND_IN)))
      .catch(() => {});
  } catch {
    // A build without the module: quiet.
  }
}

/** Plays a feel: on Android, with the switch on. Anywhere else, nothing. */
export function buzz(feel: Feel): void {
  if (!on) return;
  if (__DEV__) console.info(`[haptic] ${feel}`);
  if (Platform.OS !== 'android') return;
  for (const step of FEELS[feel]) {
    if (step.after === 0) play(step.haptic);
    else setTimeout(() => play(step.haptic), step.after);
  }
}
```

- [ ] **Step 5: Mock it for every other test.** In `apps/mobile/test/support/setup.ts`, after the Reanimated mock line,
  add:

```ts
// M10b (plan decision 2): no test sounds a haptic. Screens' buzzes are watched through this mock; test/haptics.test.ts
// reaches the real module with jest.requireActual.
jest.mock('../../src/ui/haptics.ts', () => ({ ...jest.requireActual('../../src/ui/haptics.ts'), buzz: jest.fn(), setBuzzing: jest.fn() }));
```

- [ ] **Step 6: Run the test and the app suite.**

Run: `npm -w @levelmeup/mobile test -- haptics` → PASS (8 tests).
Run: `npm -w @levelmeup/mobile test` → all pass (839 + 8).

- [ ] **Step 7: Commit.**

```bash
git add apps/mobile/package.json package-lock.json apps/mobile/src/ui/haptics.ts apps/mobile/test/haptics.test.ts apps/mobile/test/support/setup.ts
git commit -m "M10b: expo-haptics and src/ui/haptics.ts, the only file that imports it (feels, the switch, the stand-in click)"
```

---

### Task 2: Thud and the hold buttons buzz

**Files:**
- Modify: `apps/mobile/src/ui/motion.ts`, `apps/mobile/src/ui/Thud.tsx`, `apps/mobile/src/ui/HoldButton.tsx`
- Create: `apps/mobile/test/feel.test.tsx`

- [ ] **Step 1: Write the failing test** `apps/mobile/test/feel.test.tsx`:

```tsx
// M10b: what the player feels (spec decisions 2, 3, 6). The Jest setup mocks src/ui/haptics.ts, so `buzz` here is a
// jest.fn that records each feel, and fake timers place each one in time.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { buzz } from '../src/ui/haptics.ts';
import { HoldButton } from '../src/ui/HoldButton.tsx';
import { THUD_LAND_MS, THUD_SPRING } from '../src/ui/motion.ts';
import { Thud } from '../src/ui/Thud.tsx';

const felt = () => (buzz as jest.Mock).mock.calls.map((c) => c[0] as string);
const wait = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  (buzz as jest.Mock).mockClear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('a thud buzzes as its stamp lands (M10b spec decision 6)', () => {
  it('THUD_LAND_MS is when the spring first reaches full size (plan decision 5)', () => {
    const { damping, mass, stiffness } = THUD_SPRING;
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    const wd = w0 * Math.sqrt(1 - zeta ** 2);
    const land = ((Math.PI - Math.atan(wd / (zeta * w0))) / wd) * 1000;
    expect(Math.abs(land - THUD_LAND_MS)).toBeLessThan(10);
  });

  it('once, its delay and the landing after it appears', async () => {
    await render(<Thud delay={220} haptic="stamp"><Text>+20</Text></Thud>);
    await wait(220 + THUD_LAND_MS - 1);
    expect(felt()).toEqual([]);
    await wait(1);
    expect(felt()).toEqual(['stamp']);
    await wait(2_000);
    expect(felt()).toEqual(['stamp']);
  });

  it('with reduced motion, at the same moment (haptics are a setting of their own)', async () => {
    await render(<Thud delay={220} haptic="stamp" reduceMotion><Text>+20</Text></Thud>);
    await wait(220 + THUD_LAND_MS);
    expect(felt()).toEqual(['stamp']);
  });

  it('never when still, never without a feel, and not once the screen has gone', async () => {
    await render(<Thud still haptic="stamp"><Text>+20</Text></Thud>);
    await render(<Thud><Text>+20</Text></Thud>);
    const left = await render(<Thud delay={220} haptic="stamp"><Text>+20</Text></Thud>);
    await wait(100);
    await left.unmount(); // RNTL 14: unmount returns a promise
    await wait(2_000);
    expect(felt()).toEqual([]);
  });
});

describe('the hold buttons (M10b spec decision 6)', () => {
  it('a tick when the hold starts and the sworn click when it fires; let go early, only the tick', async () => {
    const onDone = jest.fn();
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={onDone} screenReader={false} />);
    const button = screen.getByRole('button', { name: 'Hold to swear' });
    await fireEvent(button, 'pressIn');
    expect(felt()).toEqual(['tick']);
    await wait(1_000);
    await fireEvent(button, 'pressOut');
    await wait(3_000);
    expect(felt()).toEqual(['tick']);
    await fireEvent(button, 'pressIn');
    await wait(2_000);
    expect(felt()).toEqual(['tick', 'tick', 'sworn']);
    expect(onDone).toHaveBeenCalledTimes(1);
    // The click comes first, so it lands with the moment rather than after the next screen's work.
    expect((buzz as jest.Mock).mock.invocationCallOrder.at(-1)!).toBeLessThan(onDone.mock.invocationCallOrder[0]!);
  });

  it('with a screen reader: the sworn click on Confirm (TalkBack speaks the first tap)', async () => {
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={jest.fn()} screenReader />);
    await fireEvent.press(screen.getByRole('button', { name: 'Swear' }));
    expect(felt()).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm the vow' }));
    expect(felt()).toEqual(['sworn']);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails.**

Run: `npm -w @levelmeup/mobile test -- feel`
Expected: FAIL. `THUD_LAND_MS` is undefined (the first test gets `NaN`), `haptic` isn't a prop (no buzz), and the hold
button never buzzes.

- [ ] **Step 3: The landing time.** In `apps/mobile/src/ui/motion.ts`, after `THUD_SETTLE_MS`, add:

```ts
/** When the thud's spring first reaches full size, about 0.1 s in (from THUD_SPRING): the stamp's buzz lands then (M10b). */
export const THUD_LAND_MS = 100;
```

- [ ] **Step 4: `Thud` buzzes.** Replace `apps/mobile/src/ui/Thud.tsx` with:

```tsx
// Stamps thud down (visual spec §3: scale 1.3 to 1) on a stiff spring that overshoots once. It wraps the stamp, so the
// stamp keeps its own rotation. `still` shows the child as it is (Today's streak until it grows). With reduced motion,
// a fade. M10b: `haptic` buzzes as the stamp lands (THUD_LAND_MS after its delay), the same with reduced motion, and
// never for a still piece (spec decision 6).
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { buzz } from './haptics.ts';
import type { Feel } from './haptics.ts';
import { FADE_MS, THUD_FADE_MS, THUD_FROM, THUD_LAND_MS, THUD_SPRING, delayed, timing } from './motion.ts';
import { useReduce } from './useMotion.ts';

export function Thud({ children, delay = 0, still = false, style, testID = 'thud', reduceMotion, haptic }: {
  children: ReactNode;
  delay?: number;
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  reduceMotion?: boolean;
  /** M10b: the feel played as the stamp lands. */
  haptic?: Feel;
}) {
  const reduce = useReduce(reduceMotion);
  const scale = useSharedValue(THUD_FROM);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    opacity.value = delayed(delay, withTiming(1, timing(reduce ? FADE_MS : THUD_FADE_MS)));
    if (!reduce) scale.value = delayed(delay, withSpring(1, THUD_SPRING));
  }, [still, reduce, delay, opacity, scale]);
  // Its own effect (plan decision 4): only these three restart it, and leaving the screen first cancels it.
  useEffect(() => {
    if (still || haptic === undefined) return;
    const landing = setTimeout(() => buzz(haptic), delay + THUD_LAND_MS);
    return () => clearTimeout(landing);
  }, [still, haptic, delay]);
  const moving = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const fading = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (still) return <View testID={testID} style={style}>{children}</View>;
  return (
    <Animated.View testID={testID} style={[style, reduce ? fading : moving]}>
      {children}
    </Animated.View>
  );
}
```

- [ ] **Step 5: `HoldButton` buzzes.** In `apps/mobile/src/ui/HoldButton.tsx`:
  - **Header comment:** append the line `// M10b: a tick when the hold starts, the sworn click as it fires (spec decision 6); nothing when let go early.`
  - **Import:** after the `Button` import, add `import { buzz } from './haptics.ts';`
  - **The screen-reader confirm:** replace

```tsx
      ? <Button label={confirmLabel} variant="commitment" disabled={disabled} onPress={onDone} />
```

  with

```tsx
      ? <Button label={confirmLabel} variant="commitment" disabled={disabled} onPress={() => { buzz('sworn'); onDone(); }} />
```

  - **`start`:** replace

```tsx
  const start = () => {
    // The fill is how long to keep holding, not decoration: it runs even with reduced motion on (M5 review).
    fill.value = withTiming(1, { duration: holdMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never });
    timer.current = setTimeout(() => {
      timer.current = null;
      onDone();
    }, holdMs);
  };
```

  with

```tsx
  const start = () => {
    buzz('tick');
    // The fill is how long to keep holding, not decoration: it runs even with reduced motion on (M5 review).
    fill.value = withTiming(1, { duration: holdMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never });
    timer.current = setTimeout(() => {
      timer.current = null;
      buzz('sworn');
      onDone();
    }, holdMs);
  };
```

- [ ] **Step 6: Run the tests.**

Run: `npm -w @levelmeup/mobile test -- feel` → PASS (6 tests).
Run: `npm -w @levelmeup/mobile test` → all pass (`ui.test.tsx`'s HoldButton tests unchanged).

- [ ] **Step 7: Commit.**

```bash
git add apps/mobile/src/ui/motion.ts apps/mobile/src/ui/Thud.tsx apps/mobile/src/ui/HoldButton.tsx apps/mobile/test/feel.test.tsx
git commit -m "M10b: Thud buzzes as its stamp lands (THUD_LAND_MS); the hold buttons tick and click"
```

---

### Task 3: The moments buzz on rewards

**Files:**
- Modify: `apps/mobile/src/screens/quest/Cleared.tsx`, `apps/mobile/src/screens/Celebration.tsx`,
  `apps/mobile/src/screens/Today.tsx`
- Modify: `apps/mobile/test/feel.test.tsx`

- [ ] **Step 1: Write the failing tests.** In `apps/mobile/test/feel.test.tsx`:
  - **Imports:** add these next to the others:

```tsx
import { ACHIEVEMENTS, ONBOARDING_TEXT } from '@levelmeup/content';
import { project } from '../src/game/project.ts';
import type { ClearedNumbers } from '../src/quest/cleared.ts';
import { Celebration } from '../src/screens/Celebration.tsx';
import { Vow } from '../src/screens/onboarding/Vow.tsx';
import { Cleared } from '../src/screens/quest/Cleared.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { Today } from '../src/screens/Today.tsx';
import { MOMENTS } from '../src/ui/motion.ts';
import { DAY_TWO_NOW, READY_DRAFT, claimedState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';
```

  (Merge `MOMENTS` into the existing `motion.ts` import line.)
  - **Append:**

```tsx
const TWO_UPS: ClearedNumbers = {
  xp: 20,
  statUps: [{ stat: 'strength', from: 11, to: 12, rank: 'D' }, { stat: 'vitality', from: 9, to: 10, rank: 'D' }],
  discipline: true, streak: { from: 9, to: 10 },
  level: { level: 6, xpIntoLevel: 87, xpForLevel: 130 }, levelBefore: { level: 6, xpIntoLevel: 67, xpForLevel: 130 }, recovered: false,
};
const cleared = (numbers: ClearedNumbers) => render(
  <Cleared heading="CORE QUEST · KNEE PUSH-UPS" line="3 sets of 8" numbers={numbers} rating={null} dayOpen waiting={false}
    onRate={jest.fn()} onUndo={jest.fn()} onContinue={jest.fn()} canStepDown={false} onStepDown={jest.fn()} onPain={null} />,
);

describe('the moments buzz on rewards (M10b spec decision 2)', () => {
  it('Quest cleared: the firm click as the XP stamp lands, then one tick for the rank stamps', async () => {
    await cleared(TWO_UPS);
    await wait(MOMENTS.cleared.stamp + THUD_LAND_MS);
    expect(felt()).toEqual(['stamp']);
    await wait(MOMENTS.cleared.rank - MOMENTS.cleared.stamp);
    expect(felt()).toEqual(['stamp', 'tick']);
    await wait(2_000);
    expect(felt()).toEqual(['stamp', 'tick']); // two rank stamps land together: one tick
  });

  it('a quest cleared reopened (no before) shows still and stays quiet', async () => {
    await cleared({ ...TWO_UPS, levelBefore: null });
    await wait(2_000);
    expect(felt()).toEqual([]);
  });

  it('a level-up: the double as "LV n" lands', async () => {
    await render(withStore(testStore({ view: project(serverState(), []), celebrations: [{ kind: 'level', level: 5, from: 4 }] }), <Celebration />));
    await wait(MOMENTS.level.number + THUD_LAND_MS);
    expect(felt()).toEqual(['level']);
  });

  it('an achievement: the firm click as its name lands', async () => {
    await render(withStore(testStore({ celebrations: [{ kind: 'achievement', id: ACHIEVEMENTS[0]!.id }] }), <Celebration />));
    await wait(MOMENTS.achievement.name + THUD_LAND_MS);
    expect(felt()).toEqual(['stamp']);
  });

  it('Today: a tick when the streak grows, never on opening', async () => {
    const NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs 12:00–20:00 UTC
    const view = project(serverState(), []);
    const store = testStore({ view });
    await render(withStore(store,
      <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()}
        onCheckin={jest.fn()} now={() => NOW} />));
    await wait(1_000);
    expect(felt()).toEqual([]);
    const grown = { ...view, character: { ...view.character, streak: { ...view.character.streak, current: view.character.streak.current + 1 } } };
    await act(async () => store.setState({ view: grown }));
    await wait(THUD_LAND_MS);
    expect(felt()).toEqual(['tick']);
  });
});

describe('nothing buzzes for a miss (M10b spec decision 3)', () => {
  it("the Shadow's claimed stamp stays quiet", async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    await wait(5_000);
    expect(felt()).toEqual([]);
  });

  it('"Sworn" adds nothing: the hold\'s click already marked the vow', async () => {
    await render(withStore(testStore({ phase: 'ready', draft: READY_DRAFT }), <Vow onDone={jest.fn()} screenReader />));
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.edit }));
    await fireEvent.changeText(screen.getByLabelText(ONBOARDING_TEXT.vow.edit), 'I will rise.');
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.tap }));
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.confirm }));
    expect(await screen.findByTestId('sworn-thud')).toBeTruthy();
    await wait(2_000);
    expect(felt()).toEqual(['sworn']);
  });
});
```

- [ ] **Step 2: Run them to make sure the reward ones fail.**

Run: `npm -w @levelmeup/mobile test -- feel`
Expected: the Quest cleared, level-up, achievement and Today tests FAIL (nothing buzzes). The reopened and "miss"
tests pass already.

- [ ] **Step 3: Quest cleared.** In `apps/mobile/src/screens/quest/Cleared.tsx`:
  - **Header comment:** append to its last line: ` M10b: a firm click as the XP stamp lands, one tick for the rank stamps (spec decision 2).`
  - **The XP stamp:** replace `<Thud delay={M.stamp} still={!fresh} testID="xp-stamp-thud">` with
    `<Thud delay={M.stamp} still={!fresh} haptic="stamp" testID="xp-stamp-thud">`.
  - **The rank stamps:** replace `{numbers.statUps.map((up) => (` with `{numbers.statUps.map((up, i) => (`, and
    `<Thud delay={M.rank} still={!fresh} testID="rank-thud">` with

```tsx
              <Thud delay={M.rank} still={!fresh} haptic={i === 0 ? 'tick' : undefined} testID="rank-thud">
```

  Then put this comment on the line above that `<Thud`:
  `{/* M10b: the rank stamps land together, so only the first one ticks. */}`

- [ ] **Step 4: The level-up and the achievement.** In `apps/mobile/src/screens/Celebration.tsx`:
  - **Header comment:** append to its last line: ` M10b: the double click as "LV n" lands, the firm click as an achievement's name lands.`
  - Replace `<Thud delay={M.number} testID="level-thud">` with `<Thud delay={M.number} haptic="level" testID="level-thud">`.
  - Replace `<Thud delay={M.name} testID="achievement-thud">` with
    `<Thud delay={M.name} haptic="stamp" testID="achievement-thud">`.
- [ ] **Step 5: Today's streak.** In `apps/mobile/src/screens/Today.tsx`:
  - Replace `<Thud key={streakGrew} still={streakGrew === 0} testID="streak-thud"` with
    `<Thud key={streakGrew} still={streakGrew === 0} haptic="tick" testID="streak-thud"`.
  - **Header comment:** append ` M10b: the streak's flare ticks (spec decision 2).` to its last line.
- [ ] **Step 6: Run the tests.**

Run: `npm -w @levelmeup/mobile test -- feel` → PASS (13 tests).
Run: `npm -w @levelmeup/mobile test` → all pass.

- [ ] **Step 7: Commit.**

```bash
git add apps/mobile/src/screens/quest/Cleared.tsx apps/mobile/src/screens/Celebration.tsx apps/mobile/src/screens/Today.tsx apps/mobile/test/feel.test.tsx
git commit -m "M10b: Quest cleared, the level-up, achievements and Today's streak buzz as their stamps land; nothing for a miss"
```

---

### Task 4: The Haptics switch

**Files:**
- Modify: `packages/content/src/settings.ts`
- Modify: `apps/mobile/src/state/store.ts`, `apps/mobile/test/support/store.ts`
- Create: `apps/mobile/src/ui/Toggle.tsx`
- Modify: `apps/mobile/src/screens/Notifications.tsx`, `apps/mobile/src/screens/Settings.tsx`
- Modify: `apps/mobile/test/store.test.ts`, `apps/mobile/test/settings.test.tsx`

- [ ] **Step 1: The words.** In `packages/content/src/settings.ts`:
  - **Header comment:** append ` M10b: the Haptics switch.`
  - **`SETTINGS_TEXT`:** add after the `game` block:

```ts
  haptics: {
    label: 'Haptics',
    line: 'A click you can feel when a stamp lands or a vow is sworn.',
  },
```

- [ ] **Step 2: Write the failing store tests.** In `apps/mobile/test/store.test.ts`:
  - **The store import:** add `HAPTICS_KEY` to the import list from `../src/state/store.ts`.
  - **A new import:** `import { setBuzzing } from '../src/ui/haptics.ts';`
  - **Append, after the portrait tests:**

```ts
  it('keeps the Haptics switch on the phone, applies it at once, and reads it at boot (M10b decision 4)', async () => {
    const { store, local, kv } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    expect(store.getState().haptics).toBe(true);
    kv.set(HAPTICS_KEY, 'off');
    await store.getState().boot();
    expect(store.getState().haptics).toBe(false);
    expect(setBuzzing).toHaveBeenLastCalledWith(false);
    await store.getState().setHaptics(true);
    expect(store.getState().haptics).toBe(true);
    expect(setBuzzing).toHaveBeenLastCalledWith(true);
    expect(kv.get(HAPTICS_KEY)).toBe('on');
    expect(await local.pending(10)).toEqual([]); // the phone's: nothing goes to the server
    store.getState().stop();
  });

  it('is on when nothing is kept, or the phone cannot read it (M10b decision 4)', async () => {
    const { store, local, deps } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    (deps.kv.getItem as jest.Mock).mockImplementation(async (k: string) => {
      if (k === HAPTICS_KEY) throw new Error('storage');
      return null;
    });
    await store.getState().boot();
    expect(store.getState().haptics).toBe(true);
    expect(setBuzzing).toHaveBeenLastCalledWith(true);
    store.getState().stop();
  });

  it('a switch the phone cannot store still applies (M10b decision 4)', async () => {
    const { store, deps } = await setup([ok(SERVER)]);
    (deps.kv.setItem as jest.Mock).mockRejectedValueOnce(new Error('storage'));
    await store.getState().setHaptics(false);
    expect(store.getState().haptics).toBe(false);
    expect(setBuzzing).toHaveBeenLastCalledWith(false);
    store.getState().stop();
  });

  it("deleting the character keeps the switch: it is the phone's (M10b plan decision 3)", async () => {
    const { store, local, kv } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().setHaptics(false);
    await store.getState().startOver();
    expect(kv.get(HAPTICS_KEY)).toBe('off');
    expect(store.getState().haptics).toBe(false);
    store.getState().stop();
  });
```

- [ ] **Step 3: Write the failing Settings tests.** In `apps/mobile/test/settings.test.tsx`, append:

```tsx
describe('Settings → Game → Haptics (M10b decision 4)', () => {
  const settings = () => <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} version="0.4.0" deviceZone="Asia/Manila" />;

  it('a switch under Your game, on by default, with its line; flipping it applies at once', async () => {
    const store = testStore({ view: project(adjustState(), []) });
    await render(withStore(store, settings()));
    const toggle = screen.getByRole('switch', { name: SETTINGS_TEXT.haptics.label });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText(SETTINGS_TEXT.haptics.line)).toBeTruthy();
    await fireEvent.press(toggle);
    expect(store.getState().setHaptics).toHaveBeenCalledWith(false);
  });

  it('kept off, it shows off, and turns back on', async () => {
    const store = testStore({ view: project(adjustState(), []), haptics: false });
    await render(withStore(store, settings()));
    const toggle = screen.getByRole('switch', { name: SETTINGS_TEXT.haptics.label });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(toggle);
    expect(store.getState().setHaptics).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 4: Run them to make sure they fail.**

Run: `npm -w @levelmeup/mobile test -- store settings`
Expected: FAIL. `HAPTICS_KEY` is undefined, `haptics` and `setHaptics` don't exist, and there is no Haptics switch.

- [ ] **Step 5: The store.** In `apps/mobile/src/state/store.ts`:
  - **Import:** `import { setBuzzing } from '../ui/haptics.ts';` (with the other imports).
  - **The key,** after `PORTRAIT_KEY`:

```ts
/** M10b: the Haptics switch, kept as 'on' or 'off' (spec decision 4); anything else, or nothing, counts as on. */
export const HAPTICS_KEY = 'lmu.haptics';
```

  - **`GameState`,** after `portrait: Figure | null;`:

```ts
  /** M10b: the Haptics switch (Settings → Game), kept on this phone; on unless turned off. */
  haptics: boolean;
```

  and after `setPortrait: …;`:

```ts
  /** M10b: keeps the switch on the phone; it applies at once, even if the phone can't store it. */
  setHaptics: (on: boolean) => Promise<void>;
```

  - **The initial state:** add `haptics: true,` after the line `      portrait: null,` just above `boot: async () => {`.
    That's the store's initial values, not `forget`'s `set`.
  - **`boot`:**
    - **Read the key:** add `hapticsText` to the destructured names and
      `deps.kv.getItem(HAPTICS_KEY).catch(() => null),` as the last entry of the `Promise.all`.
    - **Apply it:** replace `set({ notify: readNotify(notifyText), permission });` with

```ts
        const haptics = hapticsText !== 'off';
        setBuzzing(haptics);
        set({ notify: readNotify(notifyText), permission, haptics });
```

  - **The action,** after `setPortrait`:

```ts
      setHaptics: async (on) => {
        setBuzzing(on);
        set({ haptics: on });
        await deps.kv.setItem(HAPTICS_KEY, on ? 'on' : 'off').catch(() => {});
      },
```

  - **`forget`:** after `await deps.kv.removeItem(PORTRAIT_KEY);` add the comment line
    `// The Haptics switch stays: it is the phone's, not the character's (M10b plan decision 3).`
- [ ] **Step 6: The test store.** In `apps/mobile/test/support/store.ts`:
  - after `portrait: null,` add `haptics: true,`;
  - after `setPortrait: jest.fn(async () => {}),` add `setHaptics: jest.fn(async () => {}),`.
- [ ] **Step 7: The switch row, shared.** Create `apps/mobile/src/ui/Toggle.tsx`:

```tsx
// A switch row (S1 board; M7d): the whole row is the switch, since Android's own is 27 dp tall, under the 44 dp target
// (emulator, M7d row 10). M10b: shared by Settings → Notifications and Settings → Game's Haptics.
import { Pressable, Switch, View } from 'react-native';
import { colors } from '../theme/tokens.ts';
import { Body, Small } from './Text.tsx';

export type ToggleProps = { label: string; line: string; value: boolean; disabled?: boolean; onChange: (on: boolean) => void };

export function Toggle({ label, line, value, disabled = false, onChange }: ToggleProps) {
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={() => onChange(!value)}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <Body weight="bold" style={{ flexShrink: 1 }}>{label}</Body>
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Switch value={value} disabled={disabled} trackColor={{ false: colors.line, true: colors.ember }} thumbColor={colors.chalk} />
        </View>
      </Pressable>
      <Small>{line}</Small>
    </View>
  );
}
```

  In `apps/mobile/src/screens/Notifications.tsx`:
  - **Remove the old row:** delete `type ToggleProps = …` and the whole `function Toggle(…) { … }` (from the line
    `type ToggleProps` to the closing `}` before `export type NotificationsProps`).
  - **Imports:** remove `Switch` from the `react-native` import (`Pressable`, `colors`, `Body` and `Small` are still
    used there), and add `import { Toggle } from '../ui/Toggle.tsx';`.
- [ ] **Step 8: Settings.** In `apps/mobile/src/screens/Settings.tsx`:
  - **Header comment:** append ` M10b: the Haptics switch under Your game.`
  - **Import:** `import { Toggle } from '../ui/Toggle.tsx';`
  - **In the component,** after `const permission = useGame((s) => s.permission);`:

```tsx
  const haptics = useGame((s) => s.haptics);
  const setHaptics = useGame((s) => s.setHaptics);
```

  - **In the Game section,** after `<Button label={SETTINGS_TEXT.game.open} variant="secondary" onPress={onGame} />`:

```tsx
        {/* M10b: kept on the phone and applied at once, so not inside Your game, whose Save goes to the server. */}
        <Toggle label={SETTINGS_TEXT.haptics.label} line={SETTINGS_TEXT.haptics.line} value={haptics} onChange={(on) => void setHaptics(on)} />
```

- [ ] **Step 9: Run the tests.**

Run: `npm -w @levelmeup/mobile test -- store settings notifications` → PASS (the new cases and the Notifications
screen's, unchanged).
Run: `npm -w @levelmeup/content test` → PASS.
Run: `npm -w @levelmeup/mobile test` and `npm run typecheck` → all pass, clean.

- [ ] **Step 10: Commit.**

```bash
git add packages/content/src/settings.ts apps/mobile/src/state/store.ts apps/mobile/test/support/store.ts apps/mobile/src/ui/Toggle.tsx apps/mobile/src/screens/Notifications.tsx apps/mobile/src/screens/Settings.tsx apps/mobile/test/store.test.ts apps/mobile/test/settings.test.tsx
git commit -m "M10b: the Haptics switch in Settings → Game, kept on the phone (lmu.haptics), on by default; the switch row shared"
```

---

### Task 5: The living Shadow's numbers and useAppActive

**Files:**
- Modify: `apps/mobile/src/ui/motion.ts`, `apps/mobile/src/ui/useMotion.ts`, `apps/mobile/test/motion.test.tsx`

- [ ] **Step 1: Write the failing tests.** In `apps/mobile/test/motion.test.tsx`:
  - **Imports:**
    - add `AppState` to the `react-native` import;
    - add `EMBERS, GLOW_SHARE, SHADOW_EYES` to the `motion.ts` import;
    - add `useAppActive` to the `useMotion.ts` import.
  - **Append:**

```tsx
describe("the living Shadow's numbers (M10b spec decision 7)", () => {
  it('the glows sit on the painted eyes, whole inside the frame', () => {
    expect(SHADOW_EYES).toEqual([{ x: 0.488, y: 0.227 }, { x: 0.533, y: 0.227 }]); // measured from shadow.webp, 960 × 540
    for (const eye of SHADOW_EYES) {
      expect(eye.x - GLOW_SHARE / 2).toBeGreaterThan(0);
      expect(eye.x + GLOW_SHARE / 2).toBeLessThan(1);
      expect(eye.y - (GLOW_SHARE / 2) * (16 / 9)).toBeGreaterThan(0); // the glow is square; the frame 16:9
    }
  });

  it('ten embers from a fixed table, starting in its lower half, small and slow', () => {
    expect(EMBERS).toHaveLength(10);
    expect(EMBERS.filter((e) => e.y < 0.5 || e.y >= 1 || e.x <= 0 || e.x >= 1)).toEqual([]);
    expect(EMBERS.filter((e) => e.size < 3 || e.size > 5 || e.rise < 30 || e.rise > 70 || e.ms < 3_000 || e.ms > 5_000)).toEqual([]);
  });
});

function Front() {
  return <Text>{useAppActive() ? 'front' : 'away'}</Text>;
}

describe('useAppActive (M10b plan decision 8)', () => {
  it('in front on opening, away in the background, in front again on return', async () => {
    const listen = AppState.addEventListener as jest.Mock;
    listen.mockClear();
    await render(<Front />);
    expect(screen.getByText('front')).toBeTruthy();
    const change = listen.mock.calls.at(-1)![1] as (state: string) => void;
    await act(async () => change('background'));
    expect(screen.getByText('away')).toBeTruthy();
    await act(async () => change('active'));
    expect(screen.getByText('front')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to make sure they fail.**

Run: `npm -w @levelmeup/mobile test -- motion`
Expected: FAIL. `SHADOW_EYES` and `EMBERS` are undefined, and `useAppActive` is not a function.

- [ ] **Step 3: The numbers.** In `apps/mobile/src/ui/motion.ts`:
  - **The Reanimated import:** change it to `import { Easing, ReduceMotion, withDelay, withRepeat } from 'react-native-reanimated';`
  - **After `delayed`,** add:

```ts
/** A loop that holds even when the phone asks for reduced motion (M10b, as `delayed`): the Shadow picks its own reduced path. */
export function forever(animation: number, reverse: boolean): number {
  return withRepeat(animation, -1, reverse, undefined, ReduceMotion.Never);
}
```

  - **At the end of the file:**

```ts
/** M10b (spec decision 7): the living Shadow. Where the painted eyes are, as shares of the frame (measured from
 * shadow.webp, 960 × 540), and the glow's width as a share of the frame's. */
export type ShadowEye = { x: number; y: number };
export const SHADOW_EYES: readonly ShadowEye[] = [{ x: 0.488, y: 0.227 }, { x: 0.533, y: 0.227 }];
export const GLOW_SHARE = 0.09;
/** The eyes' pulse: opacity from PULSE_FROM to PULSE_TO and back, PULSE_MS each way (a 3-second breath). */
export const PULSE_MS = 1_500;
export const PULSE_FROM = 0.3;
export const PULSE_TO = 0.85;
/** The painting's breath after the creep: 1.5 % larger and back, BREATH_MS each way. */
export const BREATH_MS = 2_500;
export const BREATH_TO = 1.015;

export type Ember = { x: number; y: number; rise: number; drift: number; size: number; ms: number; delay: number; tone: 'ember' | 'vermilion' };

/** The Shadow's embers: a fixed table, never random (like the ink drops), each starting in its lower half and rising
 * `rise` dp over `ms`, drifting `drift` dp sideways, after `delay`. */
export const EMBERS: readonly Ember[] = [
  { x: 0.40, y: 0.78, rise: 52, drift: 4, size: 4, ms: 4_200, delay: 0, tone: 'ember' },
  { x: 0.58, y: 0.66, rise: 38, drift: -5, size: 3, ms: 3_400, delay: 600, tone: 'vermilion' },
  { x: 0.46, y: 0.90, rise: 66, drift: -3, size: 5, ms: 4_800, delay: 1_300, tone: 'ember' },
  { x: 0.63, y: 0.84, rise: 44, drift: 6, size: 3, ms: 3_800, delay: 300, tone: 'vermilion' },
  { x: 0.37, y: 0.62, rise: 30, drift: 3, size: 3, ms: 3_000, delay: 2_100, tone: 'ember' },
  { x: 0.52, y: 0.74, rise: 58, drift: -6, size: 4, ms: 4_500, delay: 900, tone: 'vermilion' },
  { x: 0.66, y: 0.70, rise: 34, drift: -4, size: 3, ms: 3_200, delay: 2_700, tone: 'ember' },
  { x: 0.43, y: 0.68, rise: 46, drift: 5, size: 4, ms: 3_900, delay: 1_800, tone: 'vermilion' },
  { x: 0.55, y: 0.93, rise: 70, drift: 2, size: 5, ms: 5_000, delay: 2_400, tone: 'ember' },
  { x: 0.61, y: 0.60, rise: 32, drift: -2, size: 3, ms: 3_600, delay: 1_500, tone: 'vermilion' },
];
```

  - **The header comment:** append ` M10b: the living Shadow's numbers, and \`forever\` for its loops.`
- [ ] **Step 4: The hook.** In `apps/mobile/src/ui/useMotion.ts`:
  - **Import:** add `import { AppState } from 'react-native';`.
  - **Append:**

```ts
/**
 * M10b: whether LevelMeUp is in front (plan decision 8). A screen that loops stops while it isn't. It starts true: a
 * screen being shown is in front (and React Native's test mock has no current state).
 */
export function useAppActive(): boolean {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setActive(next === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}
```

- [ ] **Step 5: Run the tests.**

Run: `npm -w @levelmeup/mobile test -- motion` → PASS. M10a's "every moment is over in under two seconds" test
lists its moments by name, so the Shadow's loops don't enter it.

- [ ] **Step 6: Commit.**

```bash
git add apps/mobile/src/ui/motion.ts apps/mobile/src/ui/useMotion.ts apps/mobile/test/motion.test.tsx
git commit -m "M10b: the living Shadow's numbers (eyes, pulse, breath, a fixed ember table), forever(), useAppActive"
```

---

### Task 6: The Shadow lives

**Files:**
- Create: `apps/mobile/src/ui/ShadowArt.tsx`, `apps/mobile/test/livingShadow.test.tsx`
- Modify: `apps/mobile/src/screens/ShadowScene.tsx`, `apps/mobile/test/reducedMotion.test.tsx`

- [ ] **Step 1: Write the failing test** `apps/mobile/test/livingShadow.test.tsx`:

```tsx
// M10b (spec decision 7): the living Shadow. Reanimated's functions are spied (a file-level mock) to see which loops start
// and stop; its mock runs nothing, so these check what starts when, not frames.
import { SHADOW_TEXT } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { ReduceMotion, cancelAnimation, useReducedMotion, withRepeat, withTiming } from 'react-native-reanimated';
import { BREATH_TO, EMBERS, PULSE_TO } from '../src/ui/motion.ts';
import { ShadowArt } from '../src/ui/ShadowArt.tsx';

jest.mock('react-native-reanimated', () => {
  const base = require('react-native-reanimated/mock');
  return {
    ...base,
    useReducedMotion: jest.fn(() => false),
    cancelAnimation: jest.fn(),
    withRepeat: jest.fn(base.withRepeat),
    withTiming: jest.fn(base.withTiming),
  };
});

const calls = (fn: unknown) => (fn as jest.Mock).mock.calls as unknown[][];
const timed = (to: number) => calls(withTiming).filter((c) => c[0] === to).length;
const hidden = { includeHiddenElements: true } as const;
const painting = () => screen.getByTestId('shadow-art', hidden);

beforeEach(() => {
  for (const fn of [cancelAnimation, withRepeat, withTiming]) (fn as jest.Mock).mockClear();
  (AppState.addEventListener as jest.Mock).mockClear();
});
afterEach(() => {
  (useReducedMotion as jest.Mock).mockImplementation(() => false);
});

describe('the living Shadow (M10b spec decision 7)', () => {
  it('before the painting loads, only the stand-in eyes pulse: no glows, no embers, no breath (plan decision 7)', async () => {
    await render(<ShadowArt />);
    expect(timed(PULSE_TO)).toBeGreaterThan(0);
    expect(timed(BREATH_TO)).toBe(0);
    expect(screen.queryAllByTestId('eye-glow', hidden)).toEqual([]);
    expect(screen.queryAllByTestId('ember', hidden)).toEqual([]);
  });

  it('once loaded: two glows on the eyes, ten embers rising, and the breath after the creep', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    expect(screen.getAllByTestId('eye-glow', hidden)).toHaveLength(2);
    expect(screen.getAllByTestId('ember', hidden)).toHaveLength(EMBERS.length);
    expect(timed(BREATH_TO)).toBeGreaterThan(0);
    expect(timed(1)).toBeGreaterThanOrEqual(EMBERS.length); // each ember's rise
  });

  it('every loop is endless and holds when the phone asks for reduced motion (the scene picks its own path)', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    expect(calls(withRepeat).length).toBeGreaterThan(0);
    expect(calls(withRepeat).filter((c) => c[1] !== -1 || c[4] !== ReduceMotion.Never)).toEqual([]);
  });

  it('with "Remove animations" on: nothing pulses, rises or breathes, even once loaded', async () => {
    (useReducedMotion as jest.Mock).mockImplementation(() => true);
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    expect(calls(withRepeat)).toEqual([]);
    expect(screen.queryAllByTestId('eye-glow', hidden)).toEqual([]);
    expect(screen.queryAllByTestId('ember', hidden)).toEqual([]);
  });

  it('stops in the background and starts again on return: it never runs unseen', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    const change = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)![1] as (state: string) => void;
    (cancelAnimation as jest.Mock).mockClear();
    (withTiming as jest.Mock).mockClear();
    await act(async () => change('background'));
    expect(calls(cancelAnimation).length).toBeGreaterThanOrEqual(2 + EMBERS.length); // the pulse, the breath, each ember
    expect(timed(PULSE_TO) + timed(BREATH_TO)).toBe(0);
    await act(async () => change('active'));
    expect(timed(PULSE_TO)).toBeGreaterThan(0);
    expect(timed(BREATH_TO)).toBeGreaterThan(0);
  });

  it('hidden from screen readers and touches; the painting keeps its label', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'load');
    const life = screen.getByTestId('shadow-life', hidden);
    expect(life.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(life.props.pointerEvents).toBe('none');
    expect(screen.getByRole('image', { name: SHADOW_TEXT.art })).toBeTruthy();
  });

  it('a painting that cannot load leaves the stand-in eyes, still pulsing', async () => {
    await render(<ShadowArt />);
    await fireEvent(painting(), 'error');
    expect(screen.queryByTestId('shadow-art', hidden)).toBeNull();
    expect(screen.getByTestId('shadow-eyes', hidden)).toBeTruthy();
    expect(timed(PULSE_TO)).toBeGreaterThan(0);
    expect(timed(BREATH_TO)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails.**

Run: `npm -w @levelmeup/mobile test -- livingShadow`
Expected: FAIL, "Cannot find module '../src/ui/ShadowArt.tsx'".

- [ ] **Step 3: Write `apps/mobile/src/ui/ShadowArt.tsx`:**

```tsx
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
```

- [ ] **Step 4: The scene uses it.** In `apps/mobile/src/screens/ShadowScene.tsx`:
  - **Delete:** the doc comment above `function ShadowArt()` and the whole function.
  - **Header comment:** in its last sentence, replace `M10a: the painting creeps closer, the box slams in, the claimed
    stamp thuds.` with `M10a: the painting creeps closer, the box slams in, the claimed stamp thuds. M10b: the painting
    lives (src/ui/ShadowArt.tsx); the claimed stamp stays quiet (spec decision 3).`
  - **Imports:** replace the import block with:

```tsx
import { SHADOW_TEXT, fillText, retreatLine, shadowLine } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadowHold } from '../game/pact.ts';
import { dateKeyLabel } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { MOMENTS } from '../ui/motion.ts';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { ShadowArt } from '../ui/ShadowArt.tsx';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { SlamIn } from '../ui/SlamIn.tsx';
import { MarkStamp } from '../ui/Stamp.tsx';
import { TextField } from '../ui/TextField.tsx';
import { Body, Label, Small } from '../ui/Text.tsx';
import { Thud } from '../ui/Thud.tsx';
```

  Everything else in the scene (`T`, `CONTROL`, `ShadowSceneProps`, `ShadowScene`) stays as it is.
- [ ] **Step 5: The reduced-motion contract adds `withRepeat`.** In `apps/mobile/test/reducedMotion.test.tsx`:
  - **The mock:** add `withRepeat: jest.fn(base.withRepeat),` to the file-level mock.
  - **Imports:** add `withRepeat` to the Reanimated import, and `import { ShadowArt } from '../src/ui/ShadowArt.tsx';`.
  - **`beforeEach`'s list:** becomes `[withDelay, withRepeat, withSequence, withSpring, withTiming]`.
  - **The first test:** after `await render(<SpeedLines burst />);`, add

```tsx
    await render(<ShadowArt />); // M10b: the living Shadow's loops
    await fireEvent(screen.getByTestId('shadow-art', hidden), 'load');
```

    and after its `withSpring` assertion add

```tsx
    expect(calls(withRepeat).length).toBeGreaterThan(0);
    expect(calls(withRepeat).filter((c) => c[4] !== ReduceMotion.Never)).toEqual([]);
```

  - **The describe's title:** becomes `'the phone\'s setting never cuts a piece short (M10a decision 1, review; M10b)'`.
- [ ] **Step 6: Run the tests.**

Run: `npm -w @levelmeup/mobile test -- livingShadow reducedMotion motion feel` → PASS. M10a's Shadow tests still
pass: `shadow-creep` moves, the creep waits for `load` (exactly one `withTiming(CREEP_TO)`), and a reduced scene is
still.
Run: `npm -w @levelmeup/mobile test` and `npm run typecheck` → all pass, clean.

- [ ] **Step 7: Commit.**

```bash
git add apps/mobile/src/ui/ShadowArt.tsx apps/mobile/src/screens/ShadowScene.tsx apps/mobile/test/livingShadow.test.tsx apps/mobile/test/reducedMotion.test.tsx
git commit -m "M10b: the Shadow lives: glowing eyes, rising embers, a breath after the creep; stopped in the background, still with reduced motion"
```

---

### Task 7: The bench's Haptics section (development builds only)

**Files:**
- Modify: `apps/mobile/src/dev/routes/motion.tsx`

- [ ] **Step 1: The section.** In `apps/mobile/src/dev/routes/motion.tsx`:
  - **Header comment:** append ` M10b: a Haptics section (each feel, a hold button) and a way to the living Shadow.`
  - **Imports:**
    - change `import { useGameStore } from '../../state/store.ts';` to
      `import { useGame, useGameStore } from '../../state/store.ts';`;
    - add `import { FEELS, buzz } from '../../ui/haptics.ts';`, `import type { Feel } from '../../ui/haptics.ts';` and
      `import { HoldButton } from '../../ui/HoldButton.tsx';`.
  - **In `MotionBench`,** after `const store = useGameStore();`, add `const haptics = useGame((s) => s.haptics);`.
  - **After the "An achievement" button** (the last child of `ScreenScroll`), add:

```tsx
      <SectionTitle title="Haptics" />
      <Small>
        {haptics
          ? 'Each button plays its feel; a development build logs it as [haptic] and the feel (adb logcat -s ReactNativeJS).'
          : 'Haptics are off in Settings → Game, so these stay quiet.'}
      </Small>
      {(Object.keys(FEELS) as Feel[]).map((feel) => (
        <Button key={feel} label={`Feel: ${feel}`} variant="secondary" onPress={() => buzz(feel)} />
      ))}
      <HoldButton label="Hold to feel" tapLabel="Tap to feel" confirmLabel="Feel the sworn click" onDone={() => {}} />
      <Button label="The living Shadow (Shadow preview)" variant="secondary" onPress={() => router.push('/dev/shadow')} />
```

- [ ] **Step 2: Check it stays out of a release bundle.**

```bash
npm run check:bundle
npm -w @levelmeup/mobile test -- scan
npm run typecheck
```

Expected: "Bundle scan: … no secrets, no developer code."; the scan tests pass; typecheck clean.

- [ ] **Step 3: Commit.**

```bash
git add apps/mobile/src/dev/routes/motion.tsx
git commit -m "M10b: the motion bench's Haptics section (each feel, a hold button) and a way to the living Shadow"
```

---

### Task 8: Version 0.4.0 and every check

**Files:**
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: The version.** In `apps/mobile/app.json`, change `"version": "0.3.0"` to `"0.4.0"` and
  `"versionCode": 3` to `4`.
- [ ] **Step 2: Every check.**

```bash
npm test
npm run typecheck
npm run check:functions
npm run check:portable
npm run check:bundle
```

Expected:
- **Tests:** rules 450 and server unit 512, as on main. Content: 1,108 or a few more if a content test lists every text.
  App: 839 plus about 35, all passing.
- **Typecheck:** clean.
- **The functions check:** passes, unchanged.
- **The portable check:** ok.
- **`check:bundle`:** no secrets, no developer code.

- [ ] **Step 3: Commit.**

```bash
git add apps/mobile/app.json
git commit -m "M10b: version 0.4.0 (versionCode 4)"
```

---

### Task 9: An independent review

**Files:** whatever the review fixes.

- [ ] **Step 1: The review.** Dispatch a fresh reviewer subagent (superpowers:requesting-code-review), giving it the
  spec, this plan and the range from 3eb0c44 to HEAD. Ask it to check:
  - **The one import:** only `src/ui/haptics.ts` imports expo-haptics; nothing can throw out of a buzz or wait on one.
    The stand-in logic doesn't loop.
  - **When it buzzes:**
    - each moment buzzes once, at its time;
    - still and reopened pieces never buzz;
    - nothing buzzes for a miss;
    - leaving a screen cancels a pending buzz;
    - the switch is read at boot and applied at once.
  - **The hold buttons:** the sworn click comes before `onDone`; an early release gives only the tick; the screen-reader
    path works.
  - **The living Shadow:**
    - every loop uses `ReduceMotion.Never` and `-1` repeats;
    - every loop is cancelled on unmount, in the background, and with reduced motion;
    - nothing draws before `load` but the stand-in;
    - the overlays sit inside the creeping frame, out of reach of touch and screen readers;
    - the worklets capture only serialisable values (the ember table rows, numbers).
  - **The switch:** the `Toggle` move didn't change Notifications' behaviour; the Settings row's 48 dp target and
    labels.
  - **The bench:** it stays out of a release bundle.
- [ ] **Step 2: Fix what it finds.** Fix Critical and Important findings, each with a test. Record Minor ones in the As
  built or the roadmap. Rerun Task 8's checks, then commit the fixes.

---

### Task 10: The owner's yes, the development build, the emulator, then the pilot APK

**Files:** `docs/device-verification-checklist.md` (results).

- [ ] **Step 1: Ask once,** in plain words:
  - **The ask:** the EAS development build (free tier) with expo-haptics, installed on the emulator over 998b72c0. Its
    versionCode 4 installs over it and keeps Vera.
  - **Why:** the emulator rows need it.

  Wait for the yes. Nothing below runs before it.
- [ ] **Step 2: The development build.**
  - **Build:** `npx eas-cli@latest build --platform android --profile development` from `apps/mobile`. Record the build
    id.
  - **Install:** download its APK into the scratchpad and run `adb install -r <apk>`.
  - **Run:** start Metro as in M10a. For timings, serve the production bundle (`--no-dev --minify`).
- [ ] **Step 3: The M10b emulator rows** (Task 11's checklist, rows 1–9).
  - **Each buzz:** read with `adb logcat -v time -s ReactNativeJS:I` (the `[haptic] …` lines), next to a screen
    recording (`scratchpad/m10a/rec.py`), so each buzz lines up with its stamp landing.
  - **The Shadow:** Developer → Shadow preview → Scene, recorded. Use `dumpsys gfxinfo com.dannytist.levelmeup` (reset,
    then read after 60 s) for its frame cost.
  - **"Remove animations":** set the three animation scales to 0, force-stop and reopen; set them back to 1 afterwards.
  - **Vera's waiting rows:** run any that have come due (M7d row 6, M8b rows 5–6, M9a row 6).
- [ ] **Step 4: Ask for the pilot APK:** the 0.4.0 preview APK on EAS (free tier), for the Find X9 and the friends.
  Wait for the yes.
- [ ] **Step 5: The 0.4.0 preview APK.**
  - **Build:** `npx eas-cli@latest build --platform android --profile preview` from `apps/mobile`.
  - **Record:** the build id and link in the checklist and the pilot guide.
  - **Don't install it on the emulator:** that would replace the development build.

---

### Task 11: Docs, the checklist, As built

**Files:**
- Modify: `docs/device-verification-checklist.md`, `docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`,
  `docs/superpowers/specs/2026-10-10-levelmeup-visual-design.md`, `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md`,
  `apps/mobile/README.md`, `CLAUDE.md`, `docs/pilot.md`, this plan.

- [ ] **Step 1: The checklist.** Append to `docs/device-verification-checklist.md`:

```markdown
## M10b — Haptics and a living Shadow

Rows 1–9 on the emulator with the new development build (Claude); the emulator can't be felt, so each buzz is read from
the development log (`adb logcat -v time -s ReactNativeJS:I`, lines `[haptic] …`) beside a screen recording. Rows 10–15
on the Find X9 with the 0.4.0 preview APK (the owner). "Remove animations" as in M10a (restart the app after changing
it).

| # | Check | Result |
|---|---|---|
| 1 | Developer → Motion bench → Haptics: each Feel button logs its feel once; the hold button logs `tick` on press and `sworn` at two seconds, and only `tick` when let go early. | |
| 2 | Bench → Quest cleared: `stamp` about 0.32 s and one `tick` about 0.6 s after it opens, as the XP stamp and the rank stamp land in the recording. Bench → Level up to 5: `level` at about 0.3 s. An achievement: `stamp` at about 0.2 s. | |
| 3 | Settings → Game: "Haptics" under "Voice, rhythm and minutes", on. Off: rows 1–2 log nothing; still off after a force-stop and reopen; on again. At font 2.0 the row wraps, nothing is cut off, and the whole row flips it. | |
| 4 | "Remove animations" on: row 2's buzzes come at the same times. | |
| 5 | Vera's real quest cleared: `stamp`, then `tick`. The cleared quest reopened: nothing. | |
| 6 | Developer → Shadow preview → Scene: the stand-in's eyes pulse until the painting shows; then the glows sit on the painted eyes and pulse (about 3 s), embers rise and fade in the lower half, and after the 4-second creep the painting breathes. | |
| 7 | The scene, then Home for 10 s and back: it carries on. Open for 60 s with the production bundle: `dumpsys gfxinfo` janky frames under 5 %. | |
| 8 | "Remove animations" on: the scene is still: no glows, embers or breath, and the stand-in's eyes don't pulse. | |
| 9 | `adb shell dumpsys vibrator_manager` after row 1: record whether the emulator lists the haptics (rows 1–5 rely on the log either way). | |
| 10 | Find X9: install the 0.4.0 APK over 0.3.0; the character is still there; Settings → About shows Version 0.4.0. | |
| 11 | Find X9: clear a quest. A firm click as the XP stamp lands and a light tick as the rank stamp lands, in time with what you see. Reopened: nothing. | |
| 12 | Find X9: the next level-up or achievement (when it comes): a stronger double click as "LV n" lands, a firm click as an achievement's name lands, felt although they show over everything. When a sync raises the streak while Today is open: one light tick. | |
| 13 | Find X9: Settings → Game → Haptics off: a quest cleared is silent; on again. With the phone's own touch feedback off (Settings → Sound & vibration → Vibration & haptics), silent too, with the app's switch on. | |
| 14 | Find X9: the pact's hold button (when the pact can be raised): press briefly and let go: one light tick, nothing signed. | |
| 15 | Find X9: the Shadow's scene, when it comes: the eyes glow, the embers rise, it breathes, smoothly at 120 Hz; left open a minute, the phone doesn't warm noticeably. | |
```

- [ ] **Step 2: The roadmap.** In `docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`:
  - **Replace row 10b** with:

```markdown
| 10b | **Haptics and a living Shadow** | expo-haptics (the one new native module) through `src/ui/haptics.ts`: a firm click as Quest cleared's XP stamp lands, a tick for the rank stamps, a double click on a level-up, a click for achievements, a tick for the streak, and the vow's and pact's hold; nothing for a miss; a Haptics switch in Settings → Game (on, kept on the phone). The Shadow lives in code over its painting (glowing eyes, rising embers, a breath), stopped in the background, still with reduced motion; Rive and a video loop turned down (owner, 2026-10-14). Version 0.4.0. No server change. | `2026-10-14-m10b-haptics-living-shadow.md` |
```

  - **Add a "Carried forward from M10b" section:** the review's Minor findings and the emulator's notes.
- [ ] **Step 3: The visual spec.** In `docs/superpowers/specs/2026-10-10-levelmeup-visual-design.md`, §3's Motion
  bullet: after `*M10a: built (… spec 2026-10-14-m10a-motion-design.md).*` add
  ` *M10b: the one loop is the Shadow's scene while it's open (its eyes, embers and breath); haptics land with the
  reward stamps and the hold buttons (spec 2026-10-14-m10b-haptics-living-shadow-design.md).*`
- [ ] **Step 4: The architecture.** In `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md`, the stack table's
  Animation row: append ` *M10b: expo-haptics for haptics, imported only by \`src/ui/haptics.ts\`.*` to its second
  cell.
- [ ] **Step 5: CLAUDE.md.** Replace
  `Only \`apps/mobile/src/notify/os.ts\` imports \`expo-notifications\` (M7d); a new native module needs a new EAS build.`
  with
  `Only \`apps/mobile/src/notify/os.ts\` imports \`expo-notifications\` (M7d) and only \`apps/mobile/src/ui/haptics.ts\`
  imports \`expo-haptics\` (M10b); a new native module needs a new EAS build.`
- [ ] **Step 6: The app's README.** In `apps/mobile/README.md`, add after the Motion bullet:

```markdown
- **Haptics and the living Shadow** (M10b): `src/ui/haptics.ts` is the only file that imports expo-haptics. Its `buzz`
  plays a feel (`stamp`, `tick`, `level`, `sworn`) on Android's own haptic engine when Settings → Game → Haptics is on
  (`lmu.haptics`, on by default). `Thud`'s `haptic` buzzes as a stamp lands; `HoldButton` ticks and clicks. A
  development build logs each buzz (`[haptic] …`); the Jest setup mocks the file. `src/ui/ShadowArt.tsx` is the Shadow's
  living painting (its numbers in `motion.ts`), stopped by `useAppActive` in the background.
```

- [ ] **Step 7: The pilot guide.** In `docs/pilot.md`, the current build becomes 0.4.0 (M10b, haptics and a living
  Shadow), with the EAS build id and APK link from Task 10.
- [ ] **Step 8: As built.** Append an "As built" section to this plan:
  - the commits;
  - the test counts;
  - the deviations;
  - the review's findings and fixes;
  - the emulator's results;
  - the EAS build ids.

  Mark roadmap row 10b built.
- [ ] **Step 9: Commit.**

```bash
git add docs apps/mobile/README.md CLAUDE.md
git commit -m "M10b docs: the checklist's M10b section, roadmap row 10b, the visual spec and architecture notes, README, CLAUDE.md, As built"
```

---

## Self-review (done while writing)

- **Spec coverage:**
  - **Decision 1** (code over the painting): Tasks 5–6.
  - **Decision 2** (the haptic table):
    - Task 2: `THUD_LAND_MS`, `Thud`, `HoldButton`.
    - Task 3: the moments; the rank stamps' single tick; nothing for "Sworn", the wrap flash, reopened pieces or taps.
  - **Decision 3** (no buzz for the Shadow): Task 3's "miss" tests.
  - **Decision 4** (the switch): Task 4, under Your game, applied at once, `lmu.haptics`, the shared `Toggle`, the two
    lines of copy.
  - **Decision 5** (the one file, the feels, fire-and-forget, Android only, the dev log): Task 1. The open check on
    older Androids is plan decision 1.
  - **Decision 6** (on the motion pieces; cancelled on leaving; the same with reduced motion; the screen-reader path):
    Task 2.
  - **Decision 7** (the living Shadow):
    - Task 5: the eyes' place and size, the pulse, the ember table, the breath, `useAppActive`.
    - Task 6: the stand-in's pulse, starting on load, stopping in the background, reduced motion, accessibility,
      `ReduceMotion.Never`.
    - Task 11: the visual-spec exception.
  - **Decision 8** (the kit): Task 7.
  - **Decision 9** (0.4.0 and the builds): Tasks 8 and 10.
  - **Testing:** unit (Tasks 1–6), `check:bundle` (Tasks 7–8), the emulator and Find X9 rows (Tasks 10–11), the review
    (Task 9).
- **Placeholders:** none. Each code step has its code, each run its command and expected result.
- **Names used across tasks:**
  - **Haptics:** `Feel`, `FEELS`, `buzz`, `setBuzzing`.
  - **Motion:** `THUD_LAND_MS`, `forever`, `SHADOW_EYES`, `ShadowEye`, `GLOW_SHARE`, `PULSE_MS`, `PULSE_FROM`,
    `PULSE_TO`, `BREATH_MS`, `BREATH_TO`, `Ember`, `EMBERS`; the hook `useAppActive`.
  - **Pieces and props:** `Thud`'s `haptic`; `Toggle` (`label`, `line`, `value`, `disabled`, `onChange`).
  - **Store:** `haptics`, `setHaptics`, `HAPTICS_KEY`. **Copy:** `SETTINGS_TEXT.haptics.label` / `.line`.
  - **Test ids:** `eye-glow`, `ember`, `shadow-life`, `shadow-eyes`, with M10a's `shadow-art` and `shadow-creep` kept.

  Each is defined before a later task uses it.
