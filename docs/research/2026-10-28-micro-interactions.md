# Micro-interactions for the base app (research, 2026-10-28)

**In short:** apps that feel good without being games give small feedback tied to the user's own action. That means
an instant press state, a tick that settles in about 0.2 s with one crisp buzz, and bars that move only when a value
changes. They leave out celebration, flashing, urgency and red "over target" warnings. Ideas 1-3 are the top three.

**Sources:** the official guidance is solid. App behaviour comes from vendor help pages. Things 3, Headway and
Imprint publish nothing on this, so I don't cite them. No page tried to give me instructions.

## Shared rules

- **Timing:** about 100 ms for simple feedback, 200-300 ms for a state change, never over 400 ms. Exits run a
  little faster than entrances. Use ease-out, and linear only for time itself
  ([NN/g](https://www.nngroup.com/articles/animation-duration/)).
- **Easing:** M3 "standard", `Easing.bezier(0.2, 0, 0, 1)`
  ([M3 values, Flutter source](https://raw.githubusercontent.com/flutter/flutter/master/packages/flutter/lib/src/material/motion.dart)).
- **Springs:** M3 *standard*, not expressive: position ratio 0.9, stiffness 1400; opacity and colour ratio 1.0,
  stiffness 1600
  ([androidx tokens](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StandardMotionTokens.kt)).
  Reanimated's default mass is 4 ([docs](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/)),
  so pass `mass: 1, stiffness: 1400, damping: 67` or `mass: 1, stiffness: 1600, damping: 80`. Apple: start at 100 %
  damping, and bounce only after a flick ([WWDC18 Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/)).
- **Restraint:** don't animate frequent actions, and never make people wait for motion
  ([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)). Flashing countdown timers are
  a dark pattern ([NN/g](https://www.nngroup.com/articles/animation-purpose-ux/)).
- **Reduced motion:** use fades instead of slides and scaling, tighten springs, and cut repeating animation
  ([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). `useReduce()` in
  `ui/useMotion.ts` already follows the live setting. Haptics stay on, because they are the other channel (HIG Motion).
- **Haptics:** each one gets one fixed meaning, and they stay rare, short and optional
  ([HIG haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)). On Android, use the
  platform constants, and if the only option is a buzzy vibration, use none
  ([Android](https://developer.android.com/develop/ui/views/haptics/haptics-principles)). `buzz()` already does this,
  behind the Haptics switch.
- **Retire** the game pieces: slam, thud, ink splash, level count, Shadow.

## Ranked ideas

**1. ★ Set tick that settles (Train, S).** The row shows a press state on touch-down. On release, the box fills and
the row tints "done" in 200 ms, with one `Confirm` buzz. Unticking makes no buzz.
*Why:* the tick is the core action in Hevy and Strong ([Hevy](https://www.hevyapp.com/features/workout-rest-timer/),
[Strong](https://help.strongapp.io/article/231-rest-timer)). NN/g gives checkbox feedback about 100 ms.
*Reduced:* the box fills instantly, and the buzz stays.

**2. ★ Press states everywhere (all, S).** On touch-down, opacity drops to 0.7 with the effects spring, and primary
buttons also scale to 0.97. Dragging off cancels the press. Targets are at least 44 dp.
*Why:* WWDC18 says to respond on touch-down, confirm on release, and let people cancel.
*Reduced:* opacity only.

**3. ★ Bars that grow to the new value (Eat, Today, S).** After a log, the calorie and protein bars grow from the old
width to the new one in 300 ms, and the number counts up in step. Nothing animates on screen open (`useGrowth`,
`useCountUp` and `fillFraction` already do this). Past the target, the bar stays full and the number shows the
extra in a neutral colour, with no red and no buzz.
*Why:* MacroFactor's "adherence neutral" design drops red numbers and warnings, because shame worsens logging
([MacroFactor](https://macrofactor.com/adherence-neutral/)). Use bars, not rings: Apple forbids ring look-alikes
([HIG](https://developer.apple.com/design/human-interface-guidelines/activity-rings)).
*Reduced:* the bar and number jump to the new value.

**4. Rest timer that starts on the tick (Train, M).** A slim bar drains linearly, with ±15 s and Skip buttons. At
zero there is a two-pulse buzz (different from the tick), an optional sound, and the label reads "Rest done". Nothing
flashes or turns red near the end.
*Why:* Strong starts its timer automatically (2:00) and offers Skip. Hevy has ±15 s, Skip and an alert at zero
([Hevy](https://www.hevyapp.com/features/live-activity/)).
*Reduced:* the bar steps once a second instead of moving smoothly.

**5. Answer check without shaming (Read, S).** The chosen answer highlights within 100 ms. A panel then rises in
250 ms: "Right" plus one line of why, or "The answer is ..." plus the reason, then Continue. A right answer gets
`Confirm`; a wrong one gets no error buzz.
*Why:* Duolingo's feedback banner shows the correct answer and a Continue button
([screens](https://screensdesign.com/apps/duolingo-language-lessons/)). NN/g says feedback belongs next to its trigger
([microinteractions](https://www.nngroup.com/articles/microinteractions/)).
*Reduced:* a 150 ms crossfade.

**6. Quiet finish summary (Train, S).** Rows fade in and rise 8 dp, staggered 50 ms, all done within 500 ms. Each new
best set gets a plain "New best" label. One buzz plays for the whole screen, and there is no confetti.
*Why:* the HIG asks for an end-of-workout summary
([Workouts](https://developer.apple.com/design/human-interface-guidelines/workouts)), and confirmations only where
they matter ([Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)).
*Reduced:* everything appears at once.

**7. Log with undo (Eat, Train, M).** New rows expand in 200 ms and removed rows collapse in 150 ms, using Reanimated
layout animations. A snackbar offers "Logged 2 eggs · Undo". Undo also stays on the row, because time-boxed controls
are hard for some people (HIG).
*Why:* NN/g lists undo as a core job of micro-interactions.
*Reduced:* Reanimated jumps entering rows to their end and skips exits
([docs](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)).

**8. Today reflects, doesn't celebrate (Today, S).** When you come back to Today, a finished card crossfades its
status line ("Done · 42 min") in 200 ms. No buzz (the action happened elsewhere), no counts,
no streaks.
*Why:* a haptic needs a clear cause; status belongs next to its item (HIG).
*Reduced:* the line swaps instantly.

## Haptic map

| Event | Android | iOS (if shipped) |
|---|---|---|
| Set ticked, right answer, workout saved | `Confirm` | `impactAsync(Light)` / `notificationAsync(Success)` |
| Stepper or picker | `Segment_Tick` | `selectionAsync()` |
| Rest over | two pulses | `notificationAsync(Success)` |
| Wrong answer, over target, untick | none | none |

Constants: [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/). Tune them on the Find X9.
