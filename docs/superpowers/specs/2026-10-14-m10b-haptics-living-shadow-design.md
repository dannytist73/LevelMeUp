# M10b — Haptics and a living Shadow — Design

**Date:** 2026-10-14 · **Status:** approved by the owner 2026-10-14 ("spec approved, write the plan")
**Branch:** `m10b-haptics` (from `main` 3eb0c44, after M5–M10a were merged)
**Implements:** roadmap row 10b ("Haptics and a living Shadow"), as decided with the owner on 2026-10-14. It replaces
the roadmap's first idea (a Rive Shadow) with code over the existing painting.
**Builds on:** M10a's motion pieces (`Thud`, `HoldButton`, `src/ui/motion.ts`) and its rule that each piece chooses its
own reduced-motion path.

## Plain summary

M10a made the big moments move. M10b makes two of them felt, and brings the Shadow to life.

- **Haptics.** The phone gives a small physical click when a stamp lands:
  - **Quest cleared:** a firm click as the XP stamp lands, a light tick for each rank stamp.
  - **Level up:** a stronger double click as "LV n" lands.
  - **Achievements:** a firm click as the name lands.
  - **Today:** a light tick when the streak flame flares.
  - **The vow and the pact:** a tick when you start holding, and a long-press click when it's sworn.

  Nothing buzzes for a miss: not the Shadow, not undo, not anything shown still. A **Haptics** switch in Settings
  (on by default) turns them all off, and the phone's own touch-feedback setting still applies.
- **The living Shadow.** In its scene, the painting comes alive in code:
  - **The eyes:** the red eyes glow and slowly pulse.
  - **The embers:** embers rise from its lower half and fade.
  - **The breath:** after its slow creep, the figure breathes.

  It's the one place in the app that keeps moving while it's open. With "Remove animations" on, it stays still, as
  today.

**What M10b needs:**
- **One new native module: expo-haptics** (Expo's own; SDK 57's version). The owner approves it with this spec.
- **One new development build** for the emulator, then **one new pilot APK (0.4.0)**. Both are on the EAS free tier,
  and each needs the owner's yes.
- **No new art:** the living Shadow uses the painting already in `lmu-art/class-v1`.
- **No cost, and nothing on the server:** no deploy, and no migration.
- **Two new lines of copy:** the switch's label and its one-line description.

## Decisions

The owner chose these on 2026-10-14. The details are Claude's recommendations, reviewed in this document.

1. **The living Shadow is code over the painting** (the owner's choice).
   - **Turned down:**
     - **Rive.** Someone would have to rig the Shadow by hand in Rive's editor, and exporting the file needs a paid
       plan (about $9 a month billed yearly, or $17 month to month). It's also a second native library.
     - **A video loop** (an AI image-to-video clip played with expo-video). It's a second native library, a 2–4 MB
       download the first time, and a few dollars of generation.
     - **Haptics only.**
   - **Why code:** the painting already has the parts that should move: the red eyes, the smoke and the embers.
     Reanimated (installed) can bring them alive with no new art, account or cost.
2. **Haptics on rewards and vows** (the owner's choice). The table:

   | Moment | When it buzzes | Feel |
   |---|---|---|
   | Quest cleared (fresh) | the XP stamp lands (220 ms + landing) | **stamp**: a firm click |
   | | each rank stamp lands (500 ms + landing) | **tick**: a light tick |
   | Level up | "LV n" lands (200 ms + landing) | **level**: a stronger double click |
   | Achievement | the name lands (100 ms + landing) | **stamp** |
   | Today | the streak flame thuds (only when the streak grows) | **tick** |
   | The vow and the pact (`HoldButton`) | the press starts / the hold fires | **tick** / **sworn**: a long-press click |

   - **Nothing for:**
     - the "Sworn" stamp (the hold's click already marked it);
     - the XP bar's wrap flash (the level-up has its own);
     - a quest cleared reopened still;
     - plain taps and choices.
   - **"Landing"** is when M10a's thud spring first reaches full size: about 100 ms after it starts (computed from
     `THUD_SPRING`). It becomes one constant, `THUD_LAND_MS`, in `motion.ts`.
   - **Several rank stamps** land together, so only the first one carries the tick: one tick, not a burst.
3. **No buzz for the Shadow** (the owner's choice). A miss is never dramatised: the claimed stamp stays silent, and
   the living painting carries the mood.
4. **A Haptics switch in Settings, on by default** (the owner's choice).
   - **Where:** Settings → Game, just under "Your game". It's not inside "Your game", because that screen sends its
     settings to the server when Save is pressed; this switch works the moment it's flipped.
   - **How it's kept:** on the phone (`lmu.haptics`), never on the server, like the portrait choice (M9a). A new
     phone or a reinstall starts with it on.
   - **The switch row:** the Notifications screen's row (the whole row is the switch, M7d row 10) moves to
     `src/ui/Toggle.tsx` and is shared.
   - **New words:** in `packages/content/src/settings.ts`, the label "Haptics" and the line "A click you can feel when
     a stamp lands or a vow is sworn."
5. **One file talks to expo-haptics: `src/ui/haptics.ts`** (as only `notify/os.ts` imports expo-notifications).
   - **What it does:** it plays a feel (`stamp`, `tick`, `level`, `sworn`) when the switch is on.
   - **Which call:** it uses `Haptics.performAndroidHapticsAsync`, Android's own haptic engine (crisp clicks that need
     no vibration permission), not the `Vibrator`-based `impactAsync`, which Expo's docs advise against on Android.
   - **The feels, as a starting point:**
     - stamp → `Confirm`;
     - tick → `Clock_Tick`;
     - level → `Long_Press`, then `Confirm` 120 ms later;
     - sworn → `Long_Press`.

     They're tuned on the Find X9. The plan checks how expo-haptics handles a constant an older Android lacks
     (`Confirm` is Android 11 and up).
   - **Never in the way:** a buzz is fire-and-forget, and a failure is ignored, so a phone that can't buzz stays
     quiet.
   - **Android only:** the app is Android-first; on another platform, a buzz does nothing.
   - **Developer builds** log each buzz (`[haptic] stamp`), so the emulator, which can't be felt, can check what
     played and when.
6. **The haptics ride on the motion pieces.**
   - **`Thud`** gains `haptic?: Feel`. It plays the feel `THUD_LAND_MS` after its `delay`, from the same effect that
     starts its animation. So:
     - a piece shown `still` never buzzes;
     - a remount (the streak, each celebration) buzzes again;
     - leaving the screen first cancels it.
   - **With "Remove animations" on,** the buzz plays at the same moment: haptics are a separate setting.
   - **`HoldButton`:** a tick on press-in, the sworn click just before `onDone`, and nothing when let go early. With a
     screen reader on (tap, then Confirm), the Confirm press gives the sworn click; TalkBack gives its own feedback
     for the first tap.
   - **Turned down:**
     - **Calling buzzes from each screen:** it copies M10a's timings a second time, and they would drift apart.
     - **A timeline engine running sight and touch together:** more than six moments need.
7. **The living Shadow, in detail** (`ShadowArt` in `src/screens/ShadowScene.tsx`, for both its claim and its step
   back). Everything sits inside M10a's creeping frame, so it moves with the painting.
   - **The eyes:**
     - **What:** two soft red glows (a react-native-svg radial gradient) centred on the painted eyes, at 48.8 % and
       53.3 % across and 22.7 % down (measured from `shadow.webp`).
     - **Size:** about 9 % of the frame's width each.
     - **The pulse:** opacity 0.3 ↔ 0.85, 1.5 s each way (a 3-second breath), easing in and out.
   - **The embers:**
     - **What:** 10 small dots, 3–5 dp, in the ember and vermilion colours.
     - **How they move:** each rises 30–70 dp from the lower half and fades in and out over 3–5 s, staggered, then
       starts again.
     - **Where they come from:** a fixed table in `motion.ts`, like M10a's ink drops (never `Math.random`), so every
       run and every test is the same.
   - **The breath:**
     - **What:** once the 4-second creep (1 → 1.06) ends, the painting swells 1.5 % and settles, 2.5 s each way.
   - **While the painting loads,** the stand-in panel's two ember eyes pulse the same way. If it can't load, they stay.
   - **When it starts:** the glows, embers and breath start when the painting has loaded, as the creep does since
     M10a's emulator check.
   - **When it stops:**
     - leaving the scene stops it;
     - the app going to the background (React Native's `AppState`) stops it, and it starts again on return.

     It never runs where the player can't see it.
   - **A visual-spec exception:** the "nothing loops" rule (M10a) gains one exception, the Shadow's scene while it's
     open. It's recorded in the visual spec's §3.
   - **"Remove animations":** with it on, nothing is drawn or moves. The painting shows as it does today, still.
   - **Screen readers:** the glows and embers are hidden from them (`importantForAccessibility="no-hide-descendants"`,
     `pointerEvents="none"`), and the art keeps its label.
   - **Cost on the phone:** 13 animated views (2 glows, 10 embers and the frame), on the UI thread, on this one screen
     only.
   - **Timing rule:** every timing, repeat and delay uses `ReduceMotion.Never`, as M10a's review required; the scene
     chooses its own reduced path.
8. **The developer kit.**
   - **Motion bench:** it gains a **Haptics** section, with a button for each feel and the switch's state. It also
     links to the existing **Shadow preview → Scene**, which now lives.
   - **Release builds:** the kit stays out of them (`check:bundle`).
9. **Version and release.**
   - **The version:** 0.4.0, versionCode 4.
   - **The server:** no change, so `MIN_APP_VERSION` stays 0.1.0.
   - **The builds, each with the owner's yes:**
     - **The development build (EAS, development profile):** it replaces the emulator's 998b72c0. Its new
       versionCode installs over it.
     - **The preview APK (preview profile):** friends on 0.3.0 keep working until they get it.

## Not in M10b

| Idea | Why not now |
|---|---|
| Rive (a rigged Shadow, idle portraits) | Needs hand rigging in Rive's editor and a paid export; the code Shadow comes first (decision 1). |
| A video loop of the Shadow | A second native library, a download and a generation cost (decision 1). |
| A buzz on every tap and choice | The owner chose rewards and vows only; constant clicks get busy. |
| A buzz for the Shadow or for undo | A miss is never dramatised (decision 3). |
| Sound | Not asked for. It would need its own settings row and quiet-hours rules (as in M10a). |
| iOS haptics | The app is Android-first; `src/ui/haptics.ts` is the one place to add them later. |
| Living class portraits | The roadmap's Rive idea for portraits; only the Shadow was asked for. |

## Testing

- **Unit tests** (Jest; `expo-haptics` mocked):
  - **Each moment** plays its feel once, at its time (Jest's fake timers):
    - Quest cleared: stamp at 320 ms, tick at 600 ms;
    - the level-up's double;
    - the achievement's stamp;
    - the streak's tick only when it grows;
    - the hold's tick and sworn click.
  - **Never:**
    - a still or reopened piece;
    - the Shadow's scene;
    - the "Sworn" stamp;
    - a hold let go early.
  - **The switch:** off means no calls; it's kept under `lmu.haptics` and read back on start; it's on when nothing is
    kept or storage fails.
  - **Leaving before the moment** cancels the buzz. A failed buzz is ignored.
  - **"Remove animations" on** still buzzes at the same times. M10a's `reducedMotion.test.tsx` contract ("every timing,
    spring, delay and sequence runs with `ReduceMotion.Never`") extends to `withRepeat` and the Shadow.
  - **The living Shadow:**
    - before the painting's `load`, only the stand-in's eyes pulse; the glows, embers and breath wait for it;
    - nothing is drawn with reduced motion;
    - the ember table is fixed and inside the frame;
    - the overlays are hidden from accessibility;
    - `AppState` going to the background cancels the loops, and coming back restarts them.
  - **No regressions:** every existing test keeps passing.
- **The release bundle:** `check:bundle` still passes, with no developer code and no secrets.
- **On the emulator** (the new development build, with Vera):
  - each moment's buzzes are checked in the developer log (`adb logcat`, `[haptic] …`) against the screen recording;
  - `dumpsys vibrator_manager` is tried as a second check (unverified whether the emulator records haptics);
  - the living Shadow is checked in screen recordings (`scratchpad/m10a/rec.py`): eyes, embers, breath, the background
    pause, and "Remove animations" still;
  - the switch, at font 2.0.
- **On the Find X9** (the owner's rows, added to the checklist):
  - each moment feels right (the feels are tuned here);
  - the switch silences them;
  - the phone's own touch feedback, turned off, silences them too (unverified on ColorOS);
  - the Shadow looks right at 120 Hz, and battery or heat don't change noticeably with the scene left open for a minute.
- **Review:** a code review after the build, as in every milestone.

## The owner's part

1. Review this spec (now).
2. After the build: say yes, or not yet, to the development build on EAS (free tier) for the emulator.
3. After the emulator check: say yes, or not yet, to the 0.4.0 pilot APK on EAS (free tier).
4. Run the new M10b rows on the Find X9 when it suits.
