# M10a — Motion — Design

**Date:** 2026-10-14 · **Status:** draft for the owner's review
**Branch:** `m10a-motion` (from `m9b-pilot-build` 7237ff7)
**Implements:** the visual spec's motion rule (§3: "panels slam in (about 180 ms); stamps thud down (scale 1.3 to 1);
speed lines only on the reveal, level-ups and quest cleared. With reduced motion on, fades only") and §5 ("Reanimated's
`useReducedMotion()` switches every animation to a fade"); the MVP spec's "complete quests (reward animation)" (§1.2).
**Source of the ideas:** John Kim, "AI App Animations is Hard Until You Learn This" (YouTube `f-Ar8mwm3kQ`). Only its
description and chapter list were read, not the transcript. Its toolbox: keyframes, springs, gestures, physics, SVG
paths, layout transitions, skeletal rigs, shaders, particles, flipbooks, Rive and Lottie, and composing them into one
moment.

## Plain summary

Today the app hardly moves. The core quest card slams in, and the hold buttons fill. Everything else just appears:
- the XP bar jumps to its new width;
- the "+20 XP" stamp is simply there;
- the level-up screen is a still page.

M10a makes the big moments feel like a manhwa panel landing:

- **Quest cleared.** The speed lines burst out and "QUEST CLEARED" slams in. Then the XP stamp thuds down with a
  splash of ink, and the stats panel slams in under it. Last, the XP bar fills from where it was to where it is now,
  and the "62 / 130 XP" line counts up with it. If you levelled up, the bar fills to the end, flashes and starts again.
- **Level up.** The speed lines burst, "LEVEL UP" slams in, and "LV 5" thuds down like a stamp, with a bigger splash.
  At levels 5 and 10 the new portrait rises in, then the System's line slams in.
- **Achievements** slam and thud in the same way, without the splash. Their speed lines stay still, since the visual
  spec moves speed lines only for the reveal, level-ups and quest cleared.
- **The reveal.** The speed lines burst once and your class panel slams in.
- **The Shadow.** Its painting creeps slowly closer, its box slams in, and the "claimed" stamp thuds down.
- **The vow.** The "Sworn" stamp thuds down.
- **Today.** When a sync adds XP while you're looking (the morning's first sync, for example), the bar fills to the
  new value. When the streak grows, the flame flares once.

The rules:
- Nothing loops.
- Everything is over in under two seconds, except the Shadow's slow creep (four seconds, once).
- No button ever waits for an animation.

With the phone's "Remove animations" setting on, every one of these becomes a plain fade, or nothing:
- the bar shows its value at once;
- the ink splash doesn't appear.

**What M10a needs:**
- **No new library.** It uses what's installed: Reanimated 4.5.1 and react-native-svg 15.15.4.
- **No new native build.** The existing development build runs it.
- **Nothing on the server:** no deploy, and no migration.
- **No new words:** nothing new for the player to read.
- **No cost.**
- **One thing that needs your yes:** a new pilot APK (0.3.0) at the end, so friends get it. It's on the EAS free tier.

## Decisions

These are Claude's recommendations. The owner reviews them in this document before the plan is written.

1. **Scope: the visual spec's motion rule, applied to the moments that matter.**
   - **What M10a does:** the moments above, built from the video's toolbox with what's installed:
     - keyframes (the slam);
     - springs (the thud);
     - particles (the ink splash);
     - composing them into timed sequences (each moment).
   - **What waits for M10b** (one new development build and one new pilot APK for both):
     - haptics (expo-haptics);
     - an animated Rive Shadow.

     Both are new native modules, so each is an architectural decision for the owner.
   - **Left out** (see "Not in M10a"):
     - layout transitions;
     - SVG path drawing;
     - gesture tilt;
     - shaders;
     - video;
     - idle loops.
2. **Approach: a few motion pieces in `src/ui/`, each composed per moment.**
   - **Considered and turned down:**
     - **Reanimated's ready-made entering presets** (`ZoomIn`, `FadeIn`…). They save a little code but look generic. Under reduced
       motion they skip the animation rather than fade, against the visual spec.
     - **Lottie files.** They would need a native module, the work M10b is for, and someone would have to draw the
       animations.
   - **Our own pieces** keep the ink-panel look, give every piece one tested reduced-motion path, and let each moment
     set its own timing.
3. **The pieces** (each takes a `delay` and a `reduceMotion` override, as `SlamIn` does today, for tests and the kit):

   | Piece | Moves | With reduced motion |
   |---|---|---|
   | `SlamIn` (exists; gains `delay`) | Drops 16 px, scales 1.04 → 1, opacity 0 → 1, 180 ms ease-out | Opacity 0 → 1, 180 ms |
   | `Thud` (new) | Scale 1.3 → 1 on a stiff spring, one small overshoot, settled in about 250 ms; opacity 0 → 1 in the first 80 ms. It keeps the stamp's own rotation. | Opacity 0 → 1, 180 ms |
   | `SpeedLines` (gains `burst`) | The whole drawing scales 0.6 → 1 and fades in to its opacity, 400 ms ease-out. It moves as one view, never line by line. | Fades in, 180 ms. Without `burst` it stays still, as today (awakening, analysis). |
   | `InkBurst` (new) | 12 drops (16 for a level-up) fly out from the centre of what it wraps and fade out, about 600 ms. The drops are ink, vermilion and chalk dots, 3–9 px. Their angles, distances and sizes come from a fixed table, never `Math.random`, so every run and every test is the same. | Not drawn |
   | `XpBar` (gains `from`) | Given `from` (the level and XP it showed before), fills from there to the new value, 700 ms ease-out. Without `from` it shows the value at once, as today (stat bars, timers, the trial). Across a level: to full (450 ms), a 120 ms chalk flash, empty, then to the new value (400 ms). | Shows the new value at once |
   | `useCountUp` (new hook) | A number counts from one value to another in step with the bar, on the JavaScript thread (about 40 renders). Across a level it counts only the last part, from 0 to the new value. | The final number at once |

   - **What stays the same:** the shared timings live in one file (`src/ui/motion.ts`), next to the hook that reads the
     phone's setting (`useReducedMotion`, overridable).
   - **Accessibility values:** the bar's `accessibilityValue` and the counted line's accessibility label are always the
     final value, so a screen reader never hears a number in passing.
4. **The moments and their timing** (milliseconds from the screen opening):

   | Moment | Sequence |
   |---|---|
   | Quest cleared (board D2) | 0: speed lines burst, the title slams in · 220: the XP stamp thuds, ink bursts from it · 380: the stats panel slams in; each rank stamp thuds 120 later · 600: the bar fills, the level line counts up |
   | Level up (Celebration) | 0: speed lines burst · 100: "LEVEL UP" slams in · 200: "LV n" thuds, a 16-drop ink burst · 450: at levels 5 and 10, the portrait rises 12 px and fades in (300 ms) · 600: the System's line slams in |
   | Achievement (Celebration) | The speed lines stay still · 0: the label slams in · 100: the name thuds · 350: the description and the title earned fade in |
   | The reveal | 0: speed lines burst · 150: the first panel under the header slams in |
   | The Shadow (board F2) | 0: the painting scales 1 → 1.06 inside its frame over 4 s, once; the Shadow box slams in · 300: the claimed-day stamp thuds |
   | The vow | The "Sworn" stamp thuds when it appears |
   | Today | Animate on change, never on opening, so returning to Today doesn't replay anything. The bar fills when a sync changes the XP while Today is shown. When the streak's number grows, the flame and the number thud once. |

   - **Never gated:** Continue, Undo and the rating buttons work from the first frame. An animation never holds back
     input or a screen change.
   - **Stopping:** leaving a screen mid-animation simply stops it (Reanimated cancels it when the view unmounts).
5. **XP going down never animates.**
   - **When:** an undo, or an offline day the server rebuilt, can lower the XP.
   - **What happens:** the bar shows the lower value at once. Losing XP is never dramatised (rule: "red means reward or
     commitment, never a miss").
   - **The rule:** a fill animates only up, or up across one level.
   - **More than one level:** a single quest's XP can't cross two levels at today's curve, but if it ever does, it
     wraps once and shows the end state.
6. **Quest cleared knows where the bar was.**
   - **What changes:** `clearedSummary` (`src/quest/cleared.ts`) already gets the snapshot from before the completion,
     and it now returns that level and XP too (`levelBefore`, null without a snapshot).
   - **Without one:** no fill, just the value.
   - **No server change:** the numbers stay the phone's projection, as in M6a.
7. **Today remembers the last value it showed**, in a small `usePrevious`-style hook.
   - **On opening:** nothing moves.
   - **On a change:** the bar fills from the old value.
   - **On a level change:** it wraps.
8. **Performance budget.**
   - **Where it runs:** every animation runs on the UI thread (Reanimated worklets). The one exception is the count-up,
     which is about 40 small renders, once.
   - **Speed lines:** they animate as one view's transform, not 36 lines.
   - **The ink burst:** at most 16 plain `Animated.View`s. That's well inside what the architecture allows without
     Skia: "Skia only if Phase 4 needs glow/particles".
   - **No loops:** nothing runs while the player isn't watching a moment, so it costs nothing in battery between moments.
9. **The kit (developer only) gets a Motion section.** It has a Replay button for each piece and each moment:
   - a sample Quest cleared, with and without a level-up;
   - a sample level-up at level 5;
   - a sample achievement;
   - a switch to force reduced motion.

   The kit is already left out of the release build (M9b's `check:bundle`). The emulator and the Find X9 judge the feel
   there.
10. **Version and release.**
    - **The version:** 0.3.0, versionCode 3.
    - **Server:** no change, so `MIN_APP_VERSION` stays 0.1.0.
    - **The pilot:** gets the new APK only with the owner's yes. Friends on 0.2.0 keep working.

## Not in M10a

| Idea from the video | Why not now |
|---|---|
| Haptics (a thud on stamps, a pattern on a level-up) | A new native module (expo-haptics) and a new build. It's M10b, with the owner's yes. |
| Rive: a breathing Shadow, idle class portraits | A new native module, plus art authored in Rive's editor. It's M10b, and its React Native library needs checking against Expo SDK 57 / RN 0.86 first. |
| Layout transitions (cards settling, the recovery quest sliding up) | Today changes while it's behind the quest screen or before it opens, so the player would never see the transition. |
| SVG path drawing (the class emblem inking itself) | Since M9a the emblem shows only while a portrait loads or can't. |
| Gesture tilt on the portrait | It needs gesture-handler as a direct dependency (native). It's a later idea. |
| Shaders, video flipbooks | A big library for a small gain. Clips would add download size and generation cost. |
| Idle loops (a flickering flame, a pulsing Shadow) | Constant motion on the main screen distracts and drains a little battery. Rive's idle states in M10b do it better if wanted. |
| Sound | Not asked for. It would need its own settings row and quiet-hours rules. |

## Testing

- **Unit tests** (Jest, like the rest of the app):
  - **The pure helpers** in `motion.ts`:
    - the fill's segments (up, across a level, down, more than one level);
    - the ink burst's fixed drops: the same every call, all inside the burst's radius, and 12 or 16 of them.
  - **Each piece with reduced motion forced on:** only opacity in its style, no transform; `InkBurst` renders nothing;
    `XpBar` shows the final width.
  - **Accessibility:** `XpBar`'s `accessibilityValue` and the counted line's label are final from the first render.
  - **The data:** `clearedSummary` returns `levelBefore`. Today passes the bar its previous value only after a change,
    tested by re-rendering with new XP.
  - **No regressions:** existing screen tests keep passing. The motion pieces wrap content without changing what's
    found by label or role.
  - **The Jest setup:** Reanimated's Jest mock runs animations straight to their end, so the tests check structure and
    the reduced path, not frames.
- **The release bundle:** `check:bundle` still passes with the kit's new section.
- **On the emulator** (the development build, with no new native module):
  - the kit's Motion section, at normal speed and with "Remove animations" on;
  - a real quest cleared, on a new test character.

  The emulator runs the 0.2.0 release build now. M8b row 4 and Uma's deletion come first, then the development build
  goes back on. Its lower versionCode means `adb install -r -d` or a reinstall.
- **On the Find X9** (the owner's rows, added to the checklist):
  - it feels smooth at 120 Hz;
  - nothing moves with "Remove animations" on;
  - a screen reader reads the final values;
  - the largest font size doesn't clip a thudding stamp.
- **Review:** a code review after the build, as in every milestone.

## The owner's part

1. Review this spec (now).
2. After the build: say yes, or not yet, to the 0.3.0 pilot APK on EAS (free tier).
3. Run the new M10a rows on the Find X9 when it suits.
