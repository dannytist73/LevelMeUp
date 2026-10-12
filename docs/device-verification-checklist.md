# LevelMeUp — Device verification checklist

Checks only a real phone can prove, batched per milestone (CLAUDE.md §4). Test phone: the owner's Oppo Find X9
(ColorOS). **Never Expo Go** (it crashes on this phone before app code runs; Reanimated/worklets, found in MAINARC).
Since 2026-10-11 Claude also runs every row on an Android emulator first (below), so the phone pass is short.

## How to run a development build

1. Install the development build APK from the EAS link (Expo dashboard → levelmeup → Builds), once per native change.
2. On the laptop, from the repo: `npm run app` (Metro with `--tunnel`; the router blocks phone-to-laptop LAN).
3. Open LevelMeUp on the phone; it lists the running Metro server (or scan the QR code / enter the tunnel URL).
4. The development build draws a round **tools button** (a gear) over the top right corner, on top of Today's own
   Settings gear. Turn it off once: shake the phone or open the developer menu → **Tools button** off.
5. Optional: with USB debugging on and the phone plugged into the laptop, Claude can take screenshots with
   `adb exec-out screencap -p` and check the visual rows directly.

**Offline rows (6 and 7) can't run over the tunnel**: a development build downloads its code through the tunnel each
time it opens, so with airplane mode on it can't open at all. Run them with the phone on USB and a local Metro
(`$env:NODE_OPTIONS='--dns-result-order=ipv4first'; npx expo start --dev-client --localhost --port 8082` in
`apps/mobile`, then `adb reverse tcp:8082 tcp:8082`, then open `http://127.0.0.1:8082` in the launcher), and turn off
Wi-Fi and mobile data rather than airplane mode. Or leave them to the preview build (M9), which carries its own code.

Build command (from `apps/mobile`): `npx eas-cli@latest build --platform android --profile development`. Always
`eas-cli@latest`: the globally installed eas-cli 20.5.1 is below the `>= 21.0.0` that `eas.json` requires.

### The emulator

Android Studio's emulator on the laptop: AVD `LevelMeUp_Test` (Pixel 7 profile, Android 16, x86_64; the APK carries
x86_64 libraries), driven with `adb` (taps, screenshots, `settings put system font_scale 2.0`, `wm density 540` for the
largest display size, `svc wifi/data disable` for offline, the cutout overlays for a punch hole). It proves the app's
own behaviour on Android and Hermes; ColorOS, the real punch hole and the phone's own settings screens still need the
Find X9.

## M4 — App foundation

| # | Check | Emulator (2026-10-11) | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | Installs as a development build and opens (not Expo Go). | Pass | Pass (owner, 2026-10-11) | — |
| 2 | Developer → Component kit: Black Han Sans headings and Gothic A1 body in all three weights, no missing-glyph boxes (also the dash, quotes, ellipsis, × and →); slanted panels with the vermilion offset, halftone dots, rotated stamps, the narration box's SYSTEM tab and the outlined "INK PANEL" title look like the System board. | Pass. Gothic A1 draws "…" as three centred dots (the font's design, not a missing glyph). | Pass (owner, 2026-10-11) | Component tests (roles, sizes, geometry); glyph coverage test |
| 3 | Developer → Self-check: every line passes (20 time-zone cases on Hermes, device zone, quest library, UUID v4, AES-GCM, SQLite). | Pass, 25 of 25, after finding 1 (AES-GCM failed before it) | Pass (owner, 2026-10-11) | The same cases pass in Node (Vitest and Jest); `expoCipher` test with Android's input rules |
| 4 | First launch: no screen asks to sign in; Today shows "The System is waiting for you." | Pass, after finding 1 (before it: "preparing your trials", sync refused with `no_token`) | Pass (owner, 2026-10-11) | Store and Today tests; live client test (guest sign-in with the publishable key) |
| 5 | Developer → Start a test character: Today shows day 1 with each quest's title, target, why-line, safety line (exercise quests) and XP; the developer screen says whether Claude or the template wrote the reveal. | Pass; "The reveal was written by Claude." | Not run (emulator only) | Today tests; live client test |
| 6 | Force-close, airplane mode on, reopen: Today appears at once from the cache, with "Offline · will sync" in the header. | Pass (local Metro, Wi-Fi and data off; see above) | Not run: M9 preview build | Store test (cache before network) |
| 7 | Still offline, Developer → Complete (sample) on a quest: Today shows it cleared with "Will sync"; the XP bar and the stat move at once. | Pass: XP 0 → 10 of 30, Strength 22 → 12 XP to the next point, "1 waiting" | Not run: M9 preview build | Projection contract test; store test |
| 8 | Airplane mode off: within a minute (or Settings → Sync now) the marks clear, Settings shows "0 waiting", and the numbers match the server's. | Pass, within 30 s | Not run (emulator only) | Engine and scheduler tests; live client test |
| 9 | Largest font size and largest display size (Settings → Display): no cut-off text on Today, Character, Chronicle, Settings, the developer screen or the kit. | Pass after findings 2 and 3 (font 2.0×, display 540 dpi = 320 dp wide) | Pass (owner, 2026-10-11) | No `numberOfLines` in the text components (text tests); tab labels shrink to fit (ui test) |
| 10 | Gesture bar and camera cutout: nothing hides under them; the tab bar sits above the gesture bar. | Pass after finding 4 (gesture navigation; the simulated punch hole didn't show in screenshots) | Pass (owner, 2026-10-11) | ScreenScroll test |
| 11 | Remove animations on (Accessibility): Today's core quest panel appears without the slam. | Pass: the app reads reduce-motion on (logged false with animations, true without) | Not run (emulator only) | SlamIn test with reduced motion |
| 12 | Developer → Delete the test character (type DELETE): the app returns to "The System is waiting for you." | Pass | Not run (emulator only) | Store test; live client test |

### What the emulator found (2026-10-11)

1. **Critical: the guest sign-in was lost on every Android phone.** expo-crypto 57.0.3's `AESSealedData.fromCombined`
   takes only bytes on Android (its types also allow a base64 string). The sealed session couldn't be opened, so it was
   thrown away; every sync then went out without a token (`401 no_token`) and, on an empty phone, made a new guest.
   Fixed: the sealed value is decoded to bytes first (`base64ToBytes`); `expoCipher.test.ts` mocks Android's rule.
   Side effect: the runs before the fix left empty anonymous sign-ins on the live project (no LevelMeUp data).
2. **Tab labels broke mid-word** ("CHARACT/ER") at the largest font and display size. They are single words, so they
   now shrink to fit their tab (`adjustsFontSizeToFit`; Android shrinks as far as needed, iOS stops at 0.6×) instead
   of wrapping.
3. **The outlined title was cut off** ("INK PANE") at the largest display size: SVG text can't wrap, so it now measures
   itself and shrinks to fit.
4. **Scrolled text ran under the status bar** on every screen (headers bleed behind it by design). `ScreenScroll` fades
   in a night band behind the status bar as the page scrolls.

## M5 — Onboarding

Clear the app's storage between runs: Android Settings → Apps → LevelMeUp → Storage → Clear storage. Google rows run
on the Find X9 (the owner signs in to Google there); the rest run on the emulator first.

| # | Check | Emulator | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | Fresh install: the app opens on "Signal found" (Awakening); no sign-in screen; no guest sign-in is made until the analysis. | Pass: opens on "Signal found", no sign-in screen; live guests 2 before, 2 after the whole interview, 3 right after the analysis (2026-10-11) | | Store test (a sync never makes a guest) |
| 2 | The interview at the default font size: the progress bars match the screens (6, or 7 with Learn or Focus); Continue waits for each screen's answers; the mind screen appears only for Learn or Focus; sleep 8:00 AM → wake 4:00 PM shows "turns over at 12:00 PM". | Pass: 6 bars, 7 with Learn ("Step 3 of 7"); Continue waits on each screen; the mind screen asks only the picked goal's question; 8:00 AM / 4:00 PM shows "turns over at 12:00 PM" (2026-10-11) | | Flow and screen tests |
| 3 | Safety check: one "Yes" shows "Gentle start"; the reveal's routine says exercise stays gentle; day 1 on Today has only walks and stretches for exercise. | Pass: one Yes shows "Safety check · Gentle start"; the routine says "Exercise stays gentle for now"; day 1 (a Mage) had no exercise quest (2026-10-11) | | Server and content tests (gentle start) |
| 4 | Analysis online: the reveal appears within 15 s, in the chosen voice. | Pass: the reveal after 12 s, Claude-written, in the Mentor voice; numbers as the rules say (Strength 7, Wisdom 6 from reading most days) (2026-10-11) | | Live test (Claude-written reveal) |
| 5 | Analysis offline (local Metro, Wi-Fi and data off): "needs a connection… answers are kept"; back online, Try again gives the reveal. | Pass: offline (Wi-Fi and data off) the analysis says it needs a connection and keeps the answers; back online, Try again gave the reveal in 11 s (2026-10-11) | | Store and screen tests |
| 6 | Reveal: Change class → Mage: class, stats (the +2 moves to Wisdom) and routine change; Fix an assumption → Body → another training answer → the analysis runs again; Today then shows the corrected character. | Pass after finding 1: Change class → Mage moved the +2 to Wisdom (8) and rewrote the record and routine; Fix → Body → "Most weeks" rebuilt it (Strength and Vitality 6); Today showed the corrected Mage (2026-10-11) | | Live test (redo); DB test (restart_player) |
| 7 | Vow: letting go before 2 s does nothing; a 2-second hold swears it ("Sworn"); with TalkBack on, Swear then Confirm. | Pass: a 1 s hold does nothing, a 2.6 s hold swears it ("Sworn"); the TalkBack tap-then-confirm path only in the HoldButton tests (2026-10-11) | | HoldButton tests |
| 8 | Save → "Not now · begin Day 1": Today shows day 1 (light); the back button then leaves the app instead of returning to the interview; Settings shows "Playing as a guest" with "Save with Google". | Pass: Today shows day 1 (light); Back leaves the app; Settings shows "Playing as a guest." with "Save with Google" (2026-10-11) | | Screen tests |
| 9 | Largest font size and largest display size: no cut-off text on the eleven onboarding screens. | Pass: all eleven onboarding screens at font 2.0 and density 540, nothing cut off (the time steppers stack, the minute choices wrap) (2026-10-11) | | No `numberOfLines` (text tests) |
| 10 | Remove animations on: every onboarding screen works; nothing needed is animated. | Pass: every screen works with the three animation scales at 0; the vow's fill still runs (about 60 % at 1.3 s) (2026-10-11) | | — |
| G1 | Spike 2 (Task 10): Developer → Save with Google links the guest: same user id, now not anonymous, a Google identity. | — | | google.ts tests |
| G2 | After G1 (signed in with Google, no character): the onboarding skips the Save screen after the vow and opens Today. | — | | Route logic |
| G3 | Clear storage → Awakening → "Saved a character before? Sign in with Google" → the G2 character on Today. | — | | Store test (restore) |
| G4 | Clear storage → onboarding as a new guest → Save with the G1 Google account → "already in use"; progress kept; Not now → Today. Then Developer → delete this test character. | — | | google.ts tests (taken) |
| G5 | On Save, open Google's page and close it: "Not saved…", nothing lost. | — | | google.ts tests (cancelled) |

### What the emulator found (M5, 2026-10-11)

1. **After "Fix an assumption", the reveal came back showing the correction list**, not the new result: the analysis
   returns to the same reveal screen, which kept its own "fix" mode. Choosing what to correct now resets it; a screen
   test checks it, and a third emulator run confirmed it.
2. **Security: the Google sign-in's PKCE fell back to "plain".** Metro logged supabase-js's "WebCrypto API is not
   supported": Hermes has no `crypto.subtle` (and no `crypto.getRandomValues`, so the verifier would have come from
   `Math.random`). `src/auth/webCrypto.ts` now supplies SHA-256 and secure random values from expo-crypto before the
   client is made; the warning is gone on the emulator.
3. The reveal's list of strong points was headed "Strength", right under the Strength stat; now "Strengths". The
   developer screen's delete message still described M4's guest-on-sync; reworded.
4. Not a bug: one Questmaster reveal from Claude failed validation ("invalid reveal" in `ai_generations`), so the
   template's words showed, as designed. Before the Google setup, "Continue with Google" shows "Google sign-in didn't
   finish. Your progress is kept…", as designed.

Test data: three test characters were made on the emulator (one per run) and each was deleted from the developer
screen with its guest sign-in; the live project ended with the same 2 guests it started with. The two live-test runs
(one by mistake) left their Claude-call rows without a player, as designed (cost tracking).

## M6a — Quest play

No new build: the M5 development build runs M6a's JavaScript. Rows 1–11 and 13 on the emulator first; rows 1–9 and 12
on the Find X9 (the owner).

| # | Check | Emulator | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | Every quest card on Today opens its quest screen: picture (or the ink fallback), title in the player's voice, target, why, steps, safety lines; Back returns to Today. | Pass: every card opens its quest (core rep log, check-off, one sentence, reading); the ink fallback picture, title, target, why, steps and safety lines; Back returns to Today (2026-10-11) | | Quest and Today screen tests |
| 2 | A check-off quest: Mark cleared → "Quest cleared" with the XP stamp, Discipline for the core quest, the streak line when today now counts, the XP bar; Today shows "Cleared +XP"; after the sync no "Will sync". | Pass: Mark cleared → Quest cleared; the core shows Discipline · today counts and 0 → 1 DAYS; a single side quest shows neither (not a streak day yet); Today shows "Cleared +10" and 1 / 2; "Will sync" gone after the sync (2026-10-11) | | Quest, Cleared and store tests |
| 3 | A timer quest: Start, lock the phone for 2 minutes, unlock: the time moved on; leave the app and come back: still counting; Claim unlocks at 80 %; the server accepts it (no "timer_short" notice). | Pass after finding 3: a 5-minute focus timer: locked 2 minutes → 02:53; home screen a minute → 04:27 and "Ready to claim"; Claim → the server accepted it ("First Trial" arrived, no notice) (2026-10-11) | | Timer and payload tests (server check) |
| 4 | A rep log: −/+ per set, add and remove sets, log less than the target; the server accepts it. | Pass: − twice on set 2 (8), Add a set (copies 8), Remove the last set, logged 10 + 8; accepted (2026-10-11) | | Panel and payload tests |
| 5 | One sentence: logged; the server accepts it. | Pass: "The walk in the sun felt good." logged and accepted; the second side quest made today count (0 → 1 DAYS) (2026-10-11) | | Panel and payload tests |
| 6 | Rating: Right shows first; Easy or Too hard sends; "Too hard" shows its note; reopening the quest after a sync shows the chosen rating. | Pass: Right shows first; Too hard sends and shows its note; reopened after the sync, Too hard is still selected (2026-10-11) | | Cleared and quest tests |
| 7 | Undo: the quest is open again and the XP goes back; after the sync it stays undone. | Pass: Undo opens the quest again and the XP goes back (0 / 30); after the sync it stays undone; an undone timer starts again from 00:00 (2026-10-11) | | Quest test |
| 8 | Level-up and achievements: the first completion of a new character shows "First Trial" after the sync; crossing a level shows "LEVEL UP"; Continue dismisses each. | Pass after finding 2: "First Trial" after the first sync; reaching 30 XP showed LEVEL UP · LV 2 after the sync; Continue (or Back) dismisses each (2026-10-11) | | Store and Celebration tests |
| 9 | Offline (airplane mode): a completion shows "Quest cleared" and "Will sync"; back online it syncs. | Pass: Wi-Fi and data off: undo and re-clear showed Quest cleared and "Will sync"; back online it synced in about 10 s, no level change (2026-10-11) | | Store tests |
| 10 | Largest font and display size: quest screen, the four panels, "Quest cleared", the overlay: nothing cut off. | Pass after finding 1: font 2.0 and density 540: the quest screen, rep log, one sentence, timer, Quest cleared and the overlay; nothing cut off (2026-10-11) | | No `numberOfLines` |
| 11 | Remove animations: every step works. | Pass: the three animation scales at 0: opening, logging and Quest cleared all work (2026-10-11) | | — |
| 12 | After the art upload: pictures on the core card and quest screens; in airplane mode after they loaded once, they still show (cache); a key without a picture shows the ink fallback. | Pass (v2): the focus picture on the core card and the sit-to-stand picture on its quest screen; offline after a restart both still show from the cache; before the upload every card showed the ink fallback (2026-10-11) | | QuestArt and manifest tests |
| 13 | TalkBack: cards are announced as buttons; the rep log's − and + say which set; the timer reads "x of y". | Pass (accessibility tree): cards are android.widget.Button; the steppers read "Set 1, one less"; the timer reads "00:00 of 05:00"; TalkBack itself not driven (2026-10-11) | | — |

### What the emulator found (M6a, 2026-10-11)

1. **"Quest cleared" at the largest text size:** the XP stamp covered the heading and "CLEARED" broke mid-word
   ("CLEA / RED"). The title is now the board's outlined title (D2), shrunk to fit; the stamp sits under the target line;
   the paper panel's first row no longer starts under its slant.
2. **The level-up overlay let taps through** to the screen behind (a tap could have reached Undo) and left that screen in
   TalkBack's reach. It is now a modal: the screen behind can't be touched or reached, and Back dismisses it.
3. **The timer's "mm:ss / mm:ss" wrapped onto two lines** at the default size; the elapsed time is now large with the
   target beside it, read as one "x of y".
4. **The art set's small strength picture showed wall push-ups** on "Sit-to-stands" (its only quest): redrawn as a
   sit-to-stand and published as `lmu-art/v2` (the app reads v2; v1 stays until the owner deletes it).
5. Not bugs: the first sync after a completion took up to 10 s (the function's cold start); undoing and re-logging a
   level-crossing quest shows LEVEL UP again, because the server confirmed the level again.

Test data: two test characters (Kai, Mira) were made on the emulator and deleted from the developer screen.

## M6b — Adjusting the day

No new build: the development build already contains `expo-keep-awake` (Vanish), checked in the emulator's installed
APK (2026-10-11). Rows 1–13 on the emulator first, after the M6b deploy; rows 1–12 on the Find X9 (the owner).

| # | Check | Emulator | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | Today shows "Swap · 1 left", "Hard day" and "Rest day" under the quests (board D1); an exercise core quest has "I felt pain" under its card. | Pass: "Swap · 1 left", "Hard day" and "Rest day" under the quests; "I felt pain" under the Wall push-ups card (2026-10-11) | DayActions and Today tests |
| 2 | Swap from Today: pick a quest, pick an option, "Swap to this": the quest changes at once with "Will sync", the count goes to 0 and the button goes; after the sync it stays. | Pass: picked "One good thing", then "Read two pages": it showed at once with "Will sync" and the swap button went; after the sync it stayed, no notice (2026-10-11) | Swap, projection and live tests |
| 3 | Swap from a quest screen ("Swap this quest"). | Pass: "Swap this quest" opened the sheet on that quest; Dead bugs replaced Wall push-ups in place (2026-10-11) | Quest screen test |
| 4 | Hard day: the confirm explains it; after it every open quest shows "Hard day · half XP", the lighter target and less XP; the banner shows; the button goes. | Pass: the confirm explains it; every open quest showed "Hard day · half XP", 1 set of 10, +5 XP; the reading kept +10; the banner showed; the button went (2026-10-11) | DayActions, projection and live tests |
| 5 | Rest day: the confirm explains it; the banner shows; the quests stay open; the button goes. | Pass: the confirm explains it; "Rest day: your streak is safe today…"; the quests stayed open; the button went (2026-10-11) | DayActions and planner tests |
| 6 | "I felt pain" → gentle movement: the quest becomes a walking or mobility quest; "Resting after pain" lists the exercise. | Pass: the core quest became "Walk 5 minutes" ("Pain reported: gentle movement"); "Resting after pain" listed Push-ups (2026-10-11) | Pain, projection and planner tests |
| 7 | "I felt pain" → rest today: the "Resting after pain" banner; "Rest day" goes. | Pass after finding 3: the "Resting after pain" banner; "Rest day" went; the card shows "Exercise resting" (2026-10-11) | Pain and live tests |
| 8 | A second pain report the same fortnight: the screen leads with "see a doctor or physiotherapist". | Pass: the second report led with "Pain has come up 2 times in two weeks. Please have it checked by a doctor or physiotherapist…" (2026-10-11) | Pain test |
| 9 | Resume: the exercise leaves "Resting after pain". | Pass: "Resume Mobility" took it off the list, also after the sync, and its card lost "Exercise resting" (2026-10-11) | DayActions and live tests |
| 10 | "Too hard" on a ladder quest above its first rung: "Step this exercise down a rung?" → "Yes, ease it": the offer goes and "Eased" shows. | Not run: day 1 is a light day, so every quest sits at its ladder's first rung and nothing can step down; unit tests cover it (Find X9 or a later day) | Quest cleared and planner tests |
| 11 | Character → Change class → pick → "Become a …": Character shows the new class; "Change class" again shows the date it opens. | Pass after finding 1: Monk at once with "Your class change will sync", then "Your next class change opens on Sun 25 Oct" (2026-10-11) | ClassChange, Character and live tests |
| 12 | Largest font size: Today's adjustment buttons wrap, nothing is cut off; TalkBack reads each button. | Pass after finding 2: font 2.0 and density 540: the day's buttons, the confirm and the pain flow wrap; nothing cut off; every button is in the accessibility tree with its label (2026-10-11) | — |
| 13 | Offline: swap, hard day and rest show at once and sync when the network is back. | Pass: Wi-Fi and data off: a hard day showed at once with "Offline · will sync" and "Will sync" on each quest; back online it synced (2026-10-11) | Projection and store tests |

Stillness, Dawn Ritual and Vanish need a level-5 Monk or a level-10 Rogue: unit tests cover them, and a device check
waits until a test character reaches those levels (carried forward).

### What the emulator found (M6b, 2026-10-11)

1. **Class change crashed the app** ("the specified child already has a parent", Fabric on Android) when the picker's
   content changed during its exit animation. A screen that sends a change and then closes (the class picker, the swap
   sheet, the pain flow) now keeps what it shows until it is gone (`src/screens/leaving.ts`). Re-run: no crash.
2. **Words at large sizes:** "Instead: Walk 5 minutes (5 minutes)" now drops the repeat; on a day that is already a rest
   day the pain flow offers "Pause this exercise" instead of "Rest today"; the core ladder is "Core training" ("Core
   rests…" read like the core quest).
3. **After "Rest today" from a quest screen**, the screen still offered "Log it" with no word that the exercise rests:
   it now says "This exercise is resting after pain. Skip it today unless it feels completely fine."
4. Not bugs: "database is locked" once, after a hot reload while the new cache migration ran (the old JavaScript
   instance still held the database; a cold start works, and a real update always starts cold); "configured linking in
   multiple places" after a display-size change (a development warning, seen in M6a too). The hard-day and rest
   confirms open at the bottom of Today, so they need a scroll to read (carried forward).
5. Content (carried to M6c): on a hard day, a title that names minutes ("Walk 5 minutes") keeps the full version's
   number while the target says 3 minutes.

Test data: four test characters (Nova, Vega, Lyra, Orin) were made on the emulator and deleted from the developer
screen; a read-only check found no players left.

## M6c — Kaizen training

No new build: M6c adds no native module. Rows 1–7 on the emulator after the M6c deploy (rows 4 and 8–11 need it);
rows 8–11 need a test character's first strength day (day 3 for a Warrior); row 12 after the v3 art upload. All rows
on the Find X9 (the owner). After the M6c deploy, an app bundle from before M6c can't show a workout quest: run phone
checks from the M6c branch (it contains M5–M6b), or with characters on day 1 or 2.

| # | Check | Emulator | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | Onboarding shows Training after Body; Continue needs equipment (or "Just my body") and a program. | Pass: Training is step 5 of 7, after Body; Continue stays on the step with nothing chosen and with only "Just my body" | | `flow.test.ts`, `onboarding.test.tsx` (Training) |
| 2 | Training is skipped for "I follow my own plan" and after a safety-check "yes". | Not run (Find X9) | | `flow.test.ts` (`stepsFor`) |
| 3 | Rhythm says workouts need 25 minutes a day at 10 or 15. | Pass: the note at 10 and 15 minutes, gone at 25 | | `onboarding.test.tsx` (Rhythm) |
| 4 | Settings → Training shows the setup, saves a change once, and the profile keeps it after a sync. | Pass: Dumbbells saved, synced (0 waiting), and reopened with Dumbbells and No preference from the server | | `adjust.test.tsx` (Training), server `adjust.test.ts`, live test |
| 5 | Developer → Workout preview: every setup lists exercises that use that equipment, with the target, the form cue and the progress line; "How to do it" opens the steps; counters start at the bottom of the range; − and + work. | Pass: bodyweight (wall push-ups, prone Y raises, chair squats), dumbbells (floor press, one-arm row, goblet squat), gym (seated cable row, leg press), bands (band chest press, seated row, squats); counters start at 10; − and + work; the steps open | | `quest.test.tsx` (a workout), content `training.test.ts` |
| 6 | The workout log at the largest font size: nothing cut off, buttons at least 44 dp. | Pass at font scale 2.0: nothing cut off; − and + are 126 px (48 dp) | | — |
| 7 | Titles without numbers: a hard day's walk or reading quest keeps a title that fits the shorter target. | Pass: a hard day on day 1 gave "Neck and shoulder rolls", 2 minutes, and "A good thing", half XP, no numbers in the titles | | content `text.test.ts` |
| 8 | A strength day's core quest is a workout: its card lists the exercises and minutes, with its family picture (or the ink fallback before v3). | Not run (needs a Warrior's day 3; Find X9) | | rules `day.test.ts`, server `advance.test.ts` |
| 9 | Log a workout → Quest cleared, XP, the rating; Undo. | Not run (Find X9) | | `quest.test.tsx`, server `events.test.ts` |
| 10 | Hard day on a workout day: one set of the first two exercises, 7 minutes, half XP. | Not run (Find X9) | | rules `adjust.test.ts` |
| 11 | "I felt pain" on a workout: workouts rest ("Workouts" under resting exercises); Resume brings them back. | Not run (Find X9) | | rules and server pain tests |
| 12 | The beginner rungs show their own pictures (wall, incline and knee push-ups; chair and split squats; dead bugs); the side plank keeps the forearm plank. | Partly: Wall push-ups shows its own v3 picture; the other rungs weren't on screen | | content `art.test.ts` |

### What the emulator found (M6c, 2026-10-12)

Run with the M6e build after the M6c, M6d and M6e deploys (test characters Tess and Uma, deleted afterwards).

1. The v3 pictures: a new player's first launch kept the art list it had cached (v2) until the next launch, so Wall
   push-ups showed the ink panel on day 1. The list is now also fetched after onboarding (fixed on M6e, 8557820). After
   a restart the picture shows.
2. Rows 8–11 need a Warrior's first workout day (day 3), so they stay for the Find X9.

## M6d — Character and Chronicle

No new build: M6d adds no native module. All rows after the M6c and M6d deploys (the M6d app reads the new state's
calendar and growth). Rows 10–11 use Developer → Character preview, so no test character needs level 10. All rows on
the Find X9 (the owner), after M6c's.

| # | Check | Emulator | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | Character: the framed class emblem, the name, the level tag, no title for a new player, total XP and the level bar. | Pass after a fix: the emblem was drawn small in the frame's corner (a nested Svg on Android); now a scaled group, centred (02cb2c3) | | `screens.test.tsx` (Character) |
| 2 | Stats: five bars, "N XP to M", rank stamps, "rank D at 10" where it applies, Discipline's line; at the largest font size nothing is cut off. | Pass: five bars, "22 XP to 8", rank stamps, "grows only from showing up"; at font scale 2.0 nothing cut off | | `character.test.ts`, `screens.test.tsx` |
| 3 | The class path: both abilities with "Level N · M to go" for a new player. | Pass: Second Wind "Level 5 · 4 to go", Unbreakable "Level 10 · 9 to go" | | `character.test.ts` |
| 4 | Achievements: "First Trial" after the first clear, and "N still hidden.". | Pass: the First Trial celebration, then "1 / 27", First Trial and "26 still hidden." | | `screens.test.tsx` |
| 5 | The vow sworn in onboarding shows on Character (a new test character who swears one). | Pass: the sworn vow shows on Character | | `store.test.ts`, `screens.test.tsx` |
| 6 | Chronicle: the three tiles; this month with today's vermilion border; TalkBack reads the date and "today". | Pass: the three tiles, October with the 12th outlined; the cell reads "Mon 12 Oct, today" | | `screens.test.tsx` (Chronicle) |
| 7 | After clearing the core quest, today's cell fills (paper). | Pass: after the core quest, "Mon 12 Oct, today, cleared", filled paper | | `calendar.test.ts` (`todayMark`) |
| 8 | Growth since day 1: the date and "Your first quests are waiting.", then the counts after a clear and a sync. | Pass: "Since day 1 · Mon 12 Oct" and "Your first quests are waiting.", then "0 levels gained, 1 quest cleared, no new rungs yet." | | server `state.test.ts`, live test |
| 9 | The training note: on a character with the default training it shows once on Today; "Set up training" opens Settings → Training; back on Today it is gone, also after a restart. A new character from onboarding never sees it. | Partly: a new character with the default training never sees it (onboarding marks it seen); showing it needs a character from before M6c (Find X9) | | `store.test.ts`, `screens.test.tsx` |
| 10 | Developer → Character preview: the Scholar's Path card with the book, its progress and the finished book; the title; the vow; Chronicle's marks (paper, ink corner, dashed, hatched) and the previous-month button. | Pass: the title, Meditations with "4 sessions · 60 min", the finished book, the vow; paper, ink-corner, dashed and (September) hatched marks; Previous month works. The preview's top bar was white with invisible buttons: fixed (02cb2c3) | | — |
| 11 | The book screen from the preview's "Change book" with a non-Mage character: "Scholar's Path opens for a Mage at level 10." | Pass: "Scholar's Path opens for a Mage at level 10." | | `screens.test.tsx` (book screen) |

### What the emulator found (M6d, 2026-10-12)

Run with the M6e build after the M6c, M6d and M6e deploys (test character Tess, deleted afterwards).

1. The class emblem was drawn small in the top-left corner of its frame: Android didn't honour a nested `<Svg>`'s
   position and size. It is now a group scaled from the 24-unit icon grid, centred in the frame (02cb2c3).
2. The Character preview had no background of its own, so its top bar was white and the Back and tab buttons were
   nearly invisible; it now draws on the night background (02cb2c3).

## M6e — Offline-built days

No new build: M6e adds no native module. All rows after the M6e deploy (the functions). Row 2 needs a real day
boundary: on the emulator only when a test day ends during the session, otherwise on the Find X9 (the owner).

| # | Check | Emulator | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | Developer → Offline day preview: Today with the offline line, real dates and four quests (Hermes runs the builder). | Pass: Day 2 on Tue 13 Oct with the offline line, four quests (Walk, Sit-to-stands, Reading, the article) and the "open once this day reaches the System" line | | `offlineDay.test.ts` |
| 2 | Real boundary: airplane mode before the day ends; open the app after the boundary → the offline line and the day's quests; clear one; airplane mode off → it syncs, no notice, the quest stays cleared with its XP, ids are the server's. | Pass (emulator, test character Uma, America/Caracas; day 1 ended 2026-10-12 08:00 UTC): networking off before the end; Day 2 (Mon 12 Oct) appeared offline about 10 s after the end with the offline line (Walk, Sit-to-stands, Reading); Walk cleared offline (+10, Discipline +5, "Will sync"); networking on: the app synced by itself, no notice, Walk stayed cleared with its XP (10 / 30), First Trial celebrated, the offline line gone, swaps offered (the server's ids) | | `store.test.ts`, live test (quests by slot) |
| 3 | A quest screen open during that sync stays on the same quest (its slot), and a running timer keeps its time. | Pass: the Reading quest screen was open with its timer running (started 08:02:4x UTC) through that sync; afterwards it was still Reading, the timer at 02:02 and counting, now with "Swap this quest" | | `quest.test.tsx`, `offline.test.ts` |
| 4 | Clock ahead (emulator): airplane mode, set the clock a day ahead, open → an offline day; restore the clock, airplane mode off → the `clock_ahead` notice, then the server's day. | Pass: offline with the clock at 13 Oct 05:00 UTC, an offline day 2 after the failed sync timed out (about 30 s of "preparing"); clock and network back → the clock_ahead notice, then the server's day 1 | | live test (`clock_ahead`) |
| 5 | "I felt pain" on an offline day offers rest (pause once the quest is cleared or the day rests, as on any day) and no gentle option; after the sync the exercise is resting, also when the server refused the day. | Pass after a fix: "Rest today" and no gentle option; the phone showed Squats resting and the day rested at once; after the clock_ahead sync Squats was resting on the server too (563b88f: a pain report from a day the server never stored still rests the exercise) | | `project.test.ts`, live test (`quest_changed`) |

### What the emulator found (M6e, 2026-10-12)

Run after the M6e deploy (functions v8, then v9) with test characters Tess (UTC) and Uma (America/Caracas).

1. A pain report on an offline day that the server never stored (the phone's clock was ahead) came back `not_found`, so
   the exercise didn't rest. The server now rests the exercise the phone named whenever the day or the quest isn't the
   one the phone showed (563b88f, functions v9; live test).
2. The offline day appears only after the failed sync ends: with no network the first sync took about 30 seconds to
   give up, and Today said "preparing" meanwhile. Carried forward.
3. The offline day preview had no background of its own (white top bar, invisible buttons): fixed (cc278b3).
4. A brand-new player's quest art was fetched only at the next launch (an M6a gap): it is fetched after onboarding too
   (8557820).

## M7a — The check-in

No new build: M7a adds no native module. All rows after the M7a deploy (migration 0011 and the functions). Rows 1–6
need a missed day on a real day boundary: on the emulator when a test day ends during the session, otherwise on the
Find X9. Rows 7 and 9 need a Warrior at level 5 or a used-up week of rest days.

| # | Check | Emulator | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | After a day with the core quest undone, Today opens with "The day closed. What happened?", the lead names the day, and the streak reads "day streak · paused". | Pass (Uma, after the sync above): "The day closed. What happened?", "Yesterday's core quest wasn't cleared…", "0 day streak · paused" | | `screens.test.tsx`, `checkin.test.ts` |
| 2 | "Later" hides the card; leaving the app and coming back shows it again. | Pass: "Later" hid the card (the streak still paused); Home, then reopening the app showed it again | | `store.test.ts`, `screens.test.tsx` |
| 3 | Each answer shows its line; "sick or injured" asks which; Answer returns to Today; after the sync the card is gone and the streak no longer paused. | Partly: the five answers each show their line; "I was sick or injured" asks "Which was it? Sick / Injured" with the injured note. A protected answer wasn't sent (Uma answered "I just didn't", row 4); its server side is covered by the live test | | `checkin-screen.test.tsx`, `project.test.ts`, server `checkin.test.ts` |
| 4 | "I just didn't": Today says "Clear the recovery quest today…" (and "appears once the System has your answer" before the sync); after it, the recovery quest is under "Recovery", 5 minutes, Discipline +5; clearing it shows "You took the day back. Your streak holds when today ends." | Pass: before the sync "day streak · held today", "Clear the recovery quest today…" and "…appears once the System has your answer"; after it, Recovery: "Recovery quest: walk", 5 minutes, Discipline +5 XP; cleared: "You took the day back. Your streak holds when today ends." (15 / 30 XP) | | `screens.test.tsx`, `quest.test.tsx`, pgTAP `test_adjust_checkin` |
| 5 | The next day: the result shows once (recovered, or the shield or reset line); *Rise Again* celebrates. | | | `advance.test.ts`, pgTAP `test_advance_replays_and_settles` |
| 6 | "I need a lighter load": the next day has the fewer minutes. | | | server `checkin.test.ts`, live test |
| 7 | Second Wind (a Warrior at level 5 whose missed core quest was yesterday's): the choice names the quest; the recovery slot then holds it at full XP. | | | `checkin-screen.test.tsx`, server `checkin.test.ts` |
| 8 | The lighter-plan offer shows once; "Keep my plan" hides it, and it doesn't come back on the next open. | | | `state.test.ts`, `screens.test.tsx` |
| 9 | Over the rest limit, the rest panel offers "Lighten the plan: 25 → 15 minutes a day". | | | `adjust.test.tsx` |
| 10 | Character: Second Wind and Unbreakable read "Ready" or "Ready again in N days". | | | `character.test.ts` |
| 11 | At the largest font, the check-in screen and Today's card keep every word. | Pass (the check-in preview at font scale 2.0): the card, both buttons, the offer, the five answers and the notes keep every word | | |
| 12 | Developer → Check-in preview shows the card and the screen; nothing is sent. | Pass: Today with "day streak · paused", "The day closed. What happened?" and the offer; Answer opens the five answers; "Which was it?" after "sick or injured"; Answer waits for a full answer and returns to Today; 0 waiting afterwards | | |

### What the emulator found (M7a, 2026-10-12, a real day boundary)

Test character Uma (America/Caracas), day 1's core quest left undone, networking off across the 08:00 UTC boundary.

1. On the day built offline after the missed day, Quest cleared said "Streak 0 → 1 days", though the server then held
   the streak for day 1's check-in ("paused"). The phone's offline day now holds the streak too when the day that ended
   needs a check-in (built in M7b, Task 9).
2. Row 5 (the result the next day, *Rise Again*) needs the next boundary (2026-10-13 08:00 UTC): Uma is kept for it.

## M7b — Settings

Emulator unless marked. A fresh test character, deleted at the end with row 8 (which tests the delete screen itself).

| # | Check | Result |
|---|---|---|
| 1 | Settings shows Account (the guest card, "Delete my character"), Game ("Voice, rhythm and minutes", "Training"), Sync and About. | |
| 2 | Your game shows the current voice, day end, minutes and difficulty; Save stays off until something changes. | |
| 3 | A new voice saved: Today's quest words change at once; Your game shows the saved values after the sync. | |
| 4 | 10 minutes shows "Workouts need 25 minutes…" (a Warrior); saved, the next day has a 10-minute budget (Find X9: a real day boundary). | |
| 5 | A new day end: the next day ends at the new time, or moves toward it within 20–28 hours (Find X9: a real day boundary). | |
| 6 | The rest panel offers "Rest today" and "Rest tomorrow"; "Rest tomorrow" shows "Tomorrow is a rest day"; the next day shows the rest banner (Find X9 for the next day). | |
| 7 | Late rest: networking off, "Rest today"; after the day ends, networking on: the day closed as a rest day (Chronicle: rest; no check-in) (Find X9: a real day boundary). | |
| 8 | Delete my character (a guest): the words, the second tap; then the onboarding; the leftovers check finds no profile for that guest. | |
| 9 | Delete for a Google-saved character shows the Google line (Find X9, a throwaway saved character, never the owner's). | |
| 10 | At the largest font, Your game and Delete wrap with nothing cut off. | |
| 11 | Unit tests only: the sign-in guard (no guest when the storage fails) and the sign-in-lost card in Settings. | |
