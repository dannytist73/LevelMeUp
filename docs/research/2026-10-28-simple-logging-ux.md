# Simple logging UX: Train, Read, Eat (research, 2026-10-28)

**In short:** the apps people like make the common action a single tap on numbers that are already filled in. They
keep the rest timer one tap away, they note a best set quietly, and they never scold. Food logging fails mostly
because it takes too long and makes people feel guilty. Reading apps work best with short chapters, a clear "where
am I", and a nudge that backs off. The 15 small changes in §5 follow from that. The top 5 are starred.

**About the sources:** Reddit could not be opened from here, and searches limited to Reddit returned blogs instead.
User complaints therefore come from review aggregators, app forums and two peer-reviewed studies. Vendor and
competitor blogs are flagged where used. No page tried to give me instructions.

## 1. Workout loggers

- **Prefill and tick.** Hevy fills an exercise with last time's sets, weights and reps
  ([Hevy](https://www.hevyapp.com/features/track-workouts/)). Its "previous" column can follow any session, or only
  this routine ([settings](https://www.hevyapp.com/features/workout-settings/)). Liftosaur prefills the prescribed
  numbers, so most sets are one tick ([overview](https://www.liftosaur.com/blog/posts/liftosaur-overview/)).
- **The rest timer starts on the tick.** Strong runs 2:00 automatically, set per exercise (warm-ups can differ),
  with a full-screen view and Skip ([Strong](https://help.strongapp.io/article/231-rest-timer)). Hevy's lock-screen
  timer does ±15 s and Skip ([Hevy help](https://help.hevyapp.com/hc/en-us/articles/35649846517399)).
- **Entering numbers.** Strong opens its own keyboard on the weight field, with a plate-calculator button
  ([Strong](https://help.strongapp.io/article/169-plate-calculator)). Liftosaur rounds suggested weights to the plates
  you own. No source compares steppers with keyboards, so the +/- idea in §5 is my inference.
- **Best sets.** Hevy flags a new best when you tick the set, and its save screen shows bests, total volume and sets
  ([Hevy](https://www.hevyapp.com/features/track-workouts/)). Liftosaur's moment is quieter: "weight goes up next
  time". Hevy also has a keep-screen-awake setting.
- **Complaints.**
  - Paywalls: Strong's free tier is capped at 3 routines and its plate calculator is PRO
    ([App Store](https://apps.apple.com/app/id464254577)). Fitbod gives 3 free workouts
    ([TechRadar](https://www.techradar.com/health-fitness/fitbod-app-review)).
  - Clutter (weak evidence): a pushed social feed and needing a connection in Hevy
    ([AlternativeTo](https://alternativeto.net/software/hevy-workout-tracker/about)), and Boostcamp is "confusing to
    navigate" ([Garage Gym Reviews](https://www.garagegymreviews.com/boostcamp-review)).
  - Lost data: Boostcamp dropped weights, reps and notes on a bad connection
    ([reviews](https://justuseapp.com/en/app/1529354455/boostcamp-gym-workout-planner/reviews)). Our offline-first log
    matters.

## 2. Swapping an exercise, gym or home

- **Boostcamp is the model** ([feature page](https://www.boostcamp.app/features/swap-exercises)).
  - The list shows the coach's alternatives, then similar exercises, then search.
  - The planned exercise is marked **Original**, so you can switch back.
  - You choose **Just This Workout** or **This and Future Workouts**.
  - The prescription carries over, "not the logged weight". It recommends long-term swaps so history builds in one
    place.
- **Others.**
  - MyFitCoach: "Replace once / permanently", per training day
    ([help](https://intercom.help/myfitcoach/en/articles/5433134-do-replaced-exercises-stay-in-the-plan-for-future-training-weeks)).
  - Fitbod: changing equipment rebuilds the whole workout and replaces your edits
    ([help](https://help.fitbod.me/hc/en-us/articles/42333470514455-Why-did-my-workout-change-Understanding-workout-refreshes)).
    Avoid that.
  - StrengthLog: a swapped exercise starts on the old one's weights
    ([help](https://help.strengthlog.com/help-article/similar-exercises/)). That's a wrong-load risk.
- **Our plan already does the good parts** (same slot, its own history, "Just today / Keep for this block"). Add each
  option's last numbers, and an "Original" mark.

## 3. Food logging

- **Quick add is fastest.** MacroFactor's own test counts every tap
  ([FLSI 2025](https://macrofactor.com/fastest-food-logger-2025/)).

  | How you log | Taps |
  |---|---|
  | Quick-add calories | 3 |
  | Barcode | 5 |
  | Re-add a saved serving | 6 |
  | Search | 10 |

  MacroFactor also remembers your last serving, and Favorites log in one tap
  ([help](https://help.macrofactorapp.com/en/articles/257-favorite-foods)).
- **Copy a meal, not a day.** Cronometer's "Copy Previous Day" pastes everything
  ([support](https://support.cronometer.com/hc/en-us/articles/360018032812)), and users then delete what they didn't
  eat ([forum](https://forums.cronometer.com/discussion/comment/9974)). MyFitnessPal tested a one-swipe "copy
  yesterday's meal" ([case study](https://www.behance.net/gallery/34917723/MyFitnessPal-Smart-Copy)).
- **Tone.** MacroFactor promises "no warnings, red numbers, or shaming"
  ([App Store](https://apps.apple.com/app/id1553503471)).
- **Why people quit.**
  - Time is the top reason (14 of 38 lapsed users). People want to log when it suits them, a kind tone and no "red
    zone" ([JMIR 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10337335)).
  - Tedium, forgetting ("once the habit is broken… it's hard to start again"), guilt, and packaged food being easier
    to log than home cooking ([Cordeiro et al., CHI 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4755274)). Their
    fixes: plan for imperfect logging, surface favorites, allow rough entries.
- **For Plus later:** in an NIH test, photo apps missed about a third of a meal's energy
  ([HealthDay](https://www.healthday.com/health-news/nutrition/how-accurate-are-photo-based-calorie-apps-4-are-put-to-the-test)).
  Keep "check before saving".

## 4. Reading apps

- **Short chapters, clear progress.**
  - Imprint: about 2-minute chapters, then a fill-in-the-blank summary and a quiz
    ([Fueled](https://fueled.com/blog/imprint-lets-learn-visually/)).
  - Headway: shelves In Progress, Saved and Finished, and a daily goal of only 3 key points
    ([Headway](https://makeheadway.com/blog/how-to-make-the-most-of-headway/)).
  - Kindle: shows time left in the chapter ([BGR](https://www.bgr.com/2166895/tips-reading-more-kindle/)), though one
    reader felt hurried by it ([essay](https://medium.com/p/cb9992565c60)).
- **Offline is often paid.** It's Blinkist Premium
  ([Blinkist](https://www.blinkist.com/pt/magazine/posts/blinkist-vs-headway-app-best-book-summaries)) and Deepstash
  Pro, per a competitor ([Nibble](https://nibble-app.com/blog/deepstash-review)). Free offline books set us apart.
- **Streaks and nudges.**
  - Headway resets your streak on a missed day, and a reviewer calls its reminders nagging
    ([review](https://element8.ae/blogs/headway-app-review-is-it-really-worth-the-investment)).
  - Breaking a streak lowers the chance people keep going, and showing the broken streak makes it worse
    ([Silverman & Barasch](https://www.psychologytoday.com/us/blog/ulterior-motives/202306/how-broken-streaks-sap-motivation)).
  - Kindle counts weeks in a row
    ([Good e-Reader](https://goodereader.com/blog/kindle/kindle-reading-insights-is-an-excellent-system-that-monitors-reading-habits)).
  - Duolingo stops unanswered reminders, though in a guilt-trip tone
    ([Medium](https://debugger.medium.com/duolingo-needs-to-chill-8f1832745ca0)).
  - Android: ask for the notification permission when the user turns the reminder on
    ([guide](https://developer.android.com/develop/ui/views/notifications/notification-permission)).
- **Haptics.** Use them occasionally, tie each one to a clear action, and make them optional
  ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)). Android's `CONFIRM`
  is "short and light" ([Android](https://developer.android.com/develop/ui/views/haptics/haptic-feedback)).

## 5. Ranked improvements (all client-side)

★ = top 5. "No clutter" means it adds interaction without adding a new screen or element that is always visible.

| # | What | Why (source) | Effort | No clutter? |
|---|---|---|---|---|
| 1★ | **Tick = done at the shown numbers.** Each set row shows this week's target weight and reps, filled in. Tapping a number edits only that number. | Hevy, Liftosaur (§1) | S | Yes, fewer taps |
| 2★ | **Quick add on Eat:** name (optional), calories, protein, Save | Fastest entry; time is the top reason to quit (§3) | S | Yes, inside the log box |
| 3★ | **Rest bar: −15 s / +15 s / Skip**, also in the notification. It starts on the tick, timed per exercise. | Hevy, Strong (§1) | S | Yes, only while resting |
| 4★ | **Recent foods as one-tap chips** at the last amount. Long-press to change it. | MacroFactor, Cordeiro (§3) | S | Yes, replaces search |
| 5★ | **Finish screen:** time, sets, new bests, and "Next week: Squat 62.5 kg" with Keep or Change | Hevy's save screen, Liftosaur (§1); shows our progression rule | M | Yes, one end screen |
| 6 | **Weight − / + buttons** (44 dp), 2.5 kg / 5 lb steps (1 kg for dumbbells). Tapping the number opens the keyboard. | Strong keyboard, Liftosaur rounding; the steppers are my inference | M | Mostly; check at large font sizes |
| 7 | **Quiet "New best" label** on the set row, with one light `CONFIRM` haptic and no confetti. Haptics can be turned off in Me. | Hevy, Apple HIG (§1, §4) | S | Yes |
| 8 | **Swap sheet:** each option shows its last numbers. "Original" is marked. Targets carry over; the weight doesn't. | Boostcamp (§2) | S | Yes, the sheet exists |
| 9 | **"Same as yesterday" per meal**, not the whole day | Cronometer, MFP (§3) | S | Yes |
| 10 | **Neutral numbers on Eat:** "1,450 of 2,000 kcal", no red; going over is just a number | MacroFactor, JMIR (§3) | S | Yes |
| 11 | **Log any day:** open yesterday and add a meal, with no "missed" badge | JMIR, Cordeiro (§3) | S | Yes |
| 12 | **"Chapter 3 of 8 · about 4 min"**, worked out from the card count, not reading speed. Reopening resumes at the exact card. | Imprint, Headway, Kindle (§4) | S | Yes |
| 13 | **End-of-chapter card:** one key line to save, then "Next chapter" or "Done for today" | Imprint, Headway (§4) | M | Yes, one card |
| 14 | **A nudge that steps back:** one reminder naming the chapter. After 7 ignored days it pauses, and Today says so once, kindly. Ask for the permission when it's switched on. | Duolingo minus the guilt; Android guide (§4) | S | Yes |
| 15 | **Weeks, not streaks, on Today:** "2 of 3 workouts this week", "Read on 4 days this week". It resets quietly; nothing is "lost". | Silverman & Barasch, Kindle (§4) | S | Yes |

**Also:** keep the screen awake while a workout is open (Hevy setting). `expo-keep-awake` is already in
`apps/mobile/package.json`, so it's S and needs no new build.

**Accessibility for all of the above:**
- "102.5 kg × 12" wraps at 200% font size and is never cut off.
- Steppers and chips are at least 44 dp.
- The end of a rest is announced to screen readers.
- With reduced motion on, animations become plain changes.
