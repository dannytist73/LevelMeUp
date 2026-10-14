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
| 6 | Force-close, airplane mode on, reopen: Today appears at once from the cache, with "Offline · will sync" in the header. | Pass (local Metro, Wi-Fi and data off; see above) | Covered by M9b row 2 | Store test (cache before network) |
| 7 | Still offline, Developer → Complete (sample) on a quest: Today shows it cleared with "Will sync"; the XP bar and the stat move at once. | Pass: XP 0 → 10 of 30, Strength 22 → 12 XP to the next point, "1 waiting" | Covered by M9b row 2 | Projection contract test; store test |
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
| 1 | Fresh install: the app opens on "Signal found" (Awakening); no sign-in screen; no guest sign-in is made until the analysis. | Pass: opens on "Signal found", no sign-in screen; live guests 2 before, 2 after the whole interview, 3 right after the analysis (2026-10-11) | Covered by M9b row 11 | Store test (a sync never makes a guest) |
| 2 | The interview at the default font size: the progress bars match the screens (6, or 7 with Learn or Focus); Continue waits for each screen's answers; the mind screen appears only for Learn or Focus; sleep 8:00 AM → wake 4:00 PM shows "turns over at 12:00 PM". | Pass: 6 bars, 7 with Learn ("Step 3 of 7"); Continue waits on each screen; the mind screen asks only the picked goal's question; 8:00 AM / 4:00 PM shows "turns over at 12:00 PM" (2026-10-11) | Covered by M9b row 11 | Flow and screen tests |
| 3 | Safety check: one "Yes" shows "Gentle start"; the reveal's routine says exercise stays gentle; day 1 on Today has only walks and stretches for exercise. | Pass: one Yes shows "Safety check · Gentle start"; the routine says "Exercise stays gentle for now"; day 1 (a Mage) had no exercise quest (2026-10-11) | Covered by M9b row 11 | Server and content tests (gentle start) |
| 4 | Analysis online: the reveal appears within 15 s, in the chosen voice. | Pass: the reveal after 12 s, Claude-written, in the Mentor voice; numbers as the rules say (Strength 7, Wisdom 6 from reading most days) (2026-10-11) | Covered by M9b row 11 | Live test (Claude-written reveal) |
| 5 | Analysis offline (local Metro, Wi-Fi and data off): "needs a connection… answers are kept"; back online, Try again gives the reveal. | Pass: offline (Wi-Fi and data off) the analysis says it needs a connection and keeps the answers; back online, Try again gave the reveal in 11 s (2026-10-11) | | Store and screen tests |
| 6 | Reveal: Change class → Mage: class, stats (the +2 moves to Wisdom) and routine change; Fix an assumption → Body → another training answer → the analysis runs again; Today then shows the corrected character. | Pass after finding 1: Change class → Mage moved the +2 to Wisdom (8) and rewrote the record and routine; Fix → Body → "Most weeks" rebuilt it (Strength and Vitality 6); Today showed the corrected Mage (2026-10-11) | | Live test (redo); DB test (restart_player) |
| 7 | Vow: letting go before 2 s does nothing; a 2-second hold swears it ("Sworn"); with TalkBack on, Swear then Confirm. | Pass: a 1 s hold does nothing, a 2.6 s hold swears it ("Sworn"); the TalkBack tap-then-confirm path only in the HoldButton tests (2026-10-11) | | HoldButton tests |
| 8 | Save → "Not now · begin Day 1": Today shows day 1 (light); the back button then leaves the app instead of returning to the interview; Settings shows "Playing as a guest" with "Save with Google". | Pass: Today shows day 1 (light); Back leaves the app; Settings shows "Playing as a guest." with "Save with Google" (2026-10-11) | Covered by M9b row 11 | Screen tests |
| 9 | Largest font size and largest display size: no cut-off text on the eleven onboarding screens. | Pass: all eleven onboarding screens at font 2.0 and density 540, nothing cut off (the time steppers stack, the minute choices wrap) (2026-10-11) | | No `numberOfLines` (text tests) |
| 10 | Remove animations on: every onboarding screen works; nothing needed is animated. | Pass: every screen works with the three animation scales at 0; the vow's fill still runs (about 60 % at 1.3 s) (2026-10-11) | | — |
| G1 | Spike 2 (Task 10): Developer → Save with Google links the guest: same user id, now not anonymous, a Google identity. | — | Covered by M9b row 8 | google.ts tests |
| G2 | After G1 (signed in with Google, no character): the onboarding skips the Save screen after the vow and opens Today. | — | | Route logic |
| G3 | Clear storage → Awakening → "Saved a character before? Sign in with Google" → the G2 character on Today. | — | Covered by M9b row 8 | Store test (restore) |
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
| 1 | Every quest card on Today opens its quest screen: picture (or the ink fallback), title in the player's voice, target, why, steps, safety lines; Back returns to Today. | Pass: every card opens its quest (core rep log, check-off, one sentence, reading); the ink fallback picture, title, target, why, steps and safety lines; Back returns to Today (2026-10-11) | Covered by M9b row 4 | Quest and Today screen tests |
| 2 | A check-off quest: Mark cleared → "Quest cleared" with the XP stamp, Discipline for the core quest, the streak line when today now counts, the XP bar; Today shows "Cleared +XP"; after the sync no "Will sync". | Pass: Mark cleared → Quest cleared; the core shows Discipline · today counts and 0 → 1 DAYS; a single side quest shows neither (not a streak day yet); Today shows "Cleared +10" and 1 / 2; "Will sync" gone after the sync (2026-10-11) | Covered by M9b row 4 | Quest, Cleared and store tests |
| 3 | A timer quest: Start, lock the phone for 2 minutes, unlock: the time moved on; leave the app and come back: still counting; Claim unlocks at 80 %; the server accepts it (no "timer_short" notice). | Pass after finding 3: a 5-minute focus timer: locked 2 minutes → 02:53; home screen a minute → 04:27 and "Ready to claim"; Claim → the server accepted it ("First Trial" arrived, no notice) (2026-10-11) | Covered by M9b row 5 | Timer and payload tests (server check) |
| 4 | A rep log: −/+ per set, add and remove sets, log less than the target; the server accepts it. | Pass: − twice on set 2 (8), Add a set (copies 8), Remove the last set, logged 10 + 8; accepted (2026-10-11) | Covered by M9b row 4 | Panel and payload tests |
| 5 | One sentence: logged; the server accepts it. | Pass: "The walk in the sun felt good." logged and accepted; the second side quest made today count (0 → 1 DAYS) (2026-10-11) | Covered by M9b row 4 | Panel and payload tests |
| 6 | Rating: Right shows first; Easy or Too hard sends; "Too hard" shows its note; reopening the quest after a sync shows the chosen rating. | Pass: Right shows first; Too hard sends and shows its note; reopened after the sync, Too hard is still selected (2026-10-11) | Covered by M9b row 4 | Cleared and quest tests |
| 7 | Undo: the quest is open again and the XP goes back; after the sync it stays undone. | Pass: Undo opens the quest again and the XP goes back (0 / 30); after the sync it stays undone; an undone timer starts again from 00:00 (2026-10-11) | Covered by M9b row 4 | Quest test |
| 8 | Level-up and achievements: the first completion of a new character shows "First Trial" after the sync; crossing a level shows "LEVEL UP"; Continue dismisses each. | Pass after finding 2: "First Trial" after the first sync; reaching 30 XP showed LEVEL UP · LV 2 after the sync; Continue (or Back) dismisses each (2026-10-11) | Covered by M9b row 4 | Store and Celebration tests |
| 9 | Offline (airplane mode): a completion shows "Quest cleared" and "Will sync"; back online it syncs. | Pass: Wi-Fi and data off: undo and re-clear showed Quest cleared and "Will sync"; back online it synced in about 10 s, no level change (2026-10-11) | Covered by M9b row 2 | Store tests |
| 10 | Largest font and display size: quest screen, the four panels, "Quest cleared", the overlay: nothing cut off. | Pass after finding 1: font 2.0 and density 540: the quest screen, rep log, one sentence, timer, Quest cleared and the overlay; nothing cut off (2026-10-11) | | No `numberOfLines` |
| 11 | Remove animations: every step works. | Pass: the three animation scales at 0: opening, logging and Quest cleared all work (2026-10-11) | | — |
| 12 | After the art upload: pictures on the core card and quest screens; in airplane mode after they loaded once, they still show (cache); a key without a picture shows the ink fallback. | Pass (v2): the focus picture on the core card and the sit-to-stand picture on its quest screen; offline after a restart both still show from the cache; before the upload every card showed the ink fallback (2026-10-11) | Covered by M9b row 2 | QuestArt and manifest tests |
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
| 2 | Real boundary: airplane mode before the day ends; open the app after the boundary → the offline line and the day's quests; clear one; airplane mode off → it syncs, no notice, the quest stays cleared with its XP, ids are the server's. | Pass (emulator, test character Uma, America/Caracas; day 1 ended 2026-10-12 08:00 UTC): networking off before the end; Day 2 (Mon 12 Oct) appeared offline about 10 s after the end with the offline line (Walk, Sit-to-stands, Reading); Walk cleared offline (+10, Discipline +5, "Will sync"); networking on: the app synced by itself, no notice, Walk stayed cleared with its XP (10 / 30), First Trial celebrated, the offline line gone, swaps offered (the server's ids) | Covered by M9b row 2 (offline play on the phone; the day boundary itself passed on the emulator) | `store.test.ts`, live test (quests by slot) |
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
| 5 | The next day: the result shows once (recovered, or the shield or reset line); *Rise Again* celebrates. | Partly (Uma, day 3, 2026-10-13 08:01 UTC): "You took the day back. Your streak holds." with Got it, once; the streak 1. *Rise Again* was earned at 08:00:12 by the day-end sync while the app showed the developer screen; the app was force-stopped at 08:01 before Today showed it, so its celebration (kept in memory, M6a decision 8) wasn't seen; it is listed on Character. A level-up and an achievement celebrated in order later the same morning. | | `advance.test.ts`, pgTAP `test_advance_replays_and_settles` |
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

Emulator unless marked. The test character Uma (kept from M7a for its row 5; a fresh one would have replaced her on the
emulator), deleted with row 8 after that row (which tests the delete screen itself).

| # | Check | Result |
|---|---|---|
| 1 | Settings shows Account (the guest card, "Delete my character"), Game ("Voice, rhythm and minutes", "Training"), Sync and About. | Pass (emulator, test character Uma, after the deploy and a full reload, 2026-10-12): Account (the guest card, "Delete my character"), Game ("Voice, rhythm and minutes", "Training"), Sync, About |
| 2 | Your game shows the current voice, day end, minutes and difficulty; Save stays off until something changes. | Pass: System voice, "4:00 AM", 25 minutes and Steady selected; Save dimmed until a change |
| 3 | A new voice saved: Today's quest words change at once; Your game shows the saved values after the sync. | Pass: Questmaster saved; Save closed the screen, "1 waiting" then synced; Your game showed Questmaster after the sync; Today's core quest read "The first march" (was "Walk") with a Questmaster why-line |
| 4 | 10 minutes shows "Workouts need 25 minutes…" (a Warrior); saved, the next day has a 10-minute budget (Find X9: a real day boundary). | Partly: 10 minutes shows "Workouts need 25 minutes a day or more…" (Warrior) and lights Save; not saved (Uma kept at 25). The next day's budget: Find X9 |
| 5 | A new day end: the next day ends at the new time, or moves toward it within 20–28 hours (Find X9: a real day boundary). | |
| 6 | The rest panel offers "Rest today" and "Rest tomorrow"; "Rest tomorrow" shows "Tomorrow is a rest day"; the next day shows the rest banner (Find X9 for the next day). | Partly: the panel offers "Rest today" and "Rest tomorrow"; "Rest tomorrow" showed "Tomorrow is a rest day: your streak is safe…" at once and after the sync, no notice. The next day: pass (Uma's day 3, 2026-10-13 08:01 UTC: "Rest day: your streak is safe today. The quests stay open as a bonus.") |
| 7 | Late rest: networking off, "Rest today"; after the day ends, networking on: the day closed as a rest day (Chronicle: rest; no check-in) (Find X9: a real day boundary). | |
| 8 | Delete my character (a guest): the words, the second tap; then the onboarding; the leftovers check finds no profile for that guest. | Pass (2026-10-14, release 0.2.0): Uma deleted through Settings → Delete my character → Delete everything → "Yes, delete my character"; the onboarding opened. The leftovers check (read only) found 0 rows for her id in all ten `levelmeup` tables and in `auth.users`. |
| 9 | Delete for a Google-saved character shows the Google line (Find X9, a throwaway saved character, never the owner's). | |
| 10 | At the largest font, Your game and Delete wrap with nothing cut off. | Pass: font 2.0 and density 540: Settings, Your game (the minutes wrap to two rows) and Delete (both steps, "Yes, delete my character" on two lines) wrap with nothing cut off |
| 11 | Unit tests only: the sign-in guard (no guest when the storage fails) and the sign-in-lost card in Settings. | Pass (unit tests): the guard (a failing write, a value that doesn't come back, a cipher that can't seal, a key the vault doesn't keep) and the sign-in-lost card in Settings |
| 12 | "Rest tomorrow", then the app stays closed all of that day: the next open shows no check-in and the streak held (Find X9: two real day boundaries). | |

### What the emulator found (M7b, 2026-10-12)

1. After "I just didn't" and its recovery quest cleared, Today still said "Clear the recovery quest today and your streak
   survives." It now says "You took the day back. Your streak holds when today ends." once the recovery quest is
   cleared (d7961d7, a screen test).
2. Not a bug: "configured linking in multiple places" after a display-size change (a development warning, as in M6a
   and M6b); the emulator's launcher stopped responding once after the density reset.


## M7c — Accountability

Emulator unless marked. A real "I just didn't" needs a missed day: the Find X9, or a test character kept across a day
boundary. The Shadow preview (Developer → Shadow preview) shows the screens without one.

| # | Check | Result |
|---|---|---|
| 1 | Settings → Game shows "Accountability Pact · Off"; the Pact shows the three levels, "Preview the Shadow" and the five rules. | Pass (emulator, test character Uma, after the deploy, 2026-10-12): "Accountability Pact · Off" under Game; the Pact shows the three levels in full, "Preview the Shadow" (its box with the claim and mark lines) and the five rules on the paper panel |
| 2 | Hold to sign level 1: Settings then shows "The Shadow · level 1" and "It starts with your next quest day."; Off is one tap and takes effect at once. | Pass: held 2.6 s, the Pact closed, Settings showed "The Shadow · level 1" and "It starts with your next quest day." at once, synced (0 waiting); Level 0 → "Turn off the Pact" (one tap, "This takes effect now…") showed Off at once and synced |
| 3 | The reveal after "real stakes" shows "Read the pact"; signed there, the reveal says it starts on day 2, and Settings shows it after the onboarding. | Pass (2026-10-14, Vera): after "Real stakes" the reveal shows "Read the pact"; signed at level 1 there, the reveal says "Pact signed: The Shadow · level 1. It starts on day 2."; after the onboarding, Settings shows "Accountability Pact · The Shadow · level 1". |
| 4 | Preview, level 1: Today shows the Shadow mark, the Shadow's line and "Yesterday belongs to the Shadow…", the recovery quest first; the scene shows the claim, the stamp, the note field and "Take back the day". | Pass (Shadow preview over Uma's day): the dashed "Shadow mark" tag, "Yesterday belongs to the Shadow…", the Shadow's box with the mark line, "The Shadow's claim", Recovery listed before the core quest; the scene: "Pact · level 1", the dark panel with ember eyes, "Claimed · Sun 11 Oct", the claim and mark lines, "Take back the day · 5 min", the note ("Kept. Only you can see it."). With Uma's real recovery quest cleared, the release line and no mark |
| 5 | Preview, level 2: the Trial panel above the side quests, both sealed; a sealed card opens the focus session. | Pass: "Trial of Stillness" panel above "Side quests 0 / 2", both cards sealed (quiet cards, "Sealed" chip); the reading not sealed; a sealed card opens the focus session |
| 6 | The focus session: the clock counts with the app in front and the screen stays on; Home pauses it; back, it goes on; "End session" keeps the minutes. | Pass: the clock counts with the app in front; Home for 12 s: 15 s of wall time, the clock moved 3 s (08:42 → 08:39); back, it goes on; "End session" returns to Today. The window keeps the screen on (KEEP_SCREEN_ON), but a development build always does (Expo's withDevTools keep-awake), so the trial's own release is the unit test's, and the screen sleeping after it is a release-build check (Find X9). The minutes kept: unit tests (the preview's store keeps nothing). The screen sleeping after the session (a release build): covered by M9b row 10. |
| 7 | Preview, paused: the Shadow's retreat line only. | Pass: Today paused: no mark, no Shadow box, M7a's line, Recovery first; the scene (preview's Scene button): "Enough for now. I step back while you find an easier pace." and "Back to today" only |
| 8 | At the largest font, the Pact, the scene, Today after a miss and the focus session wrap with nothing cut off. | Pass after a fix (font 2.0, density 540): the scene, the focus session, the Pact and Today after a miss wrap with nothing cut off, except the sealed card's "Sealed" chip, which ran past the card's edge: fixed (18052d8, the row wraps and the title column shrinks), rechecked at 2.0 and at normal size. Minor: the Pact's title breaks inside "Accountability" at the largest display size (nothing cut off; carried forward) |
| 9 | A real missed day under a level 1 pact, answered "I just didn't": the scene opens once by itself, the note is kept, the mark goes when the recovery quest is cleared (Find X9 or a kept test character). | |
| 10 | Level 2 on a real missed day: the side quests stay sealed until 10 minutes; a call during the session pauses it; they open after (Find X9). | Covered by M9b row 10 |
| 11 | Unit and database tests only: only "I just didn't" sets it off; never for a day that began before the signing; one a day; paused after 3 in 7; off lifts it; the server never refuses a completion for the seal. | Pass: unit tests (server 376, app 688) and db:test after the deploy (adjust.sql 112 assertions in 16 functions, including the review's guards); live 40/40 (39 in the full run, the pact's first test again alone after its time limit was raised to 120 s) |
| 12 | The focus session left open across the day's end (or the pact lowered while it runs): the clock stops and the screen may sleep. | Partly: unit test (the hold goes mid-session: the clock stops, keep-awake released); the screen sleeping needs a release build (Find X9). The screen sleeping (a release build): covered by M9b row 10. |

### What the emulator found (M7c, 2026-10-12)

1. At the largest font the sealed card's "Sealed" chip ran past the card's edge (the title column kept its width);
   fixed in 18052d8 and rechecked.
2. The Shadow preview showed Uma's real cleared recovery quest instead of its own, and no stamp: the preview now
   replaces a real recovery quest, dates the claim, and has a Scene button (9370b76). Development only.
3. Not a bug: a development build keeps the screen on all the time (Expo's `withDevTools`), so the trial's keep-awake
   can only be seen ending on a release build.
4. Minor: "The Accountability Pact" breaks inside "Accountability" at the largest display size (density 540); nothing
   is cut off.
5. The live run: every `lmu-sync` call took 11-15 s from the laptop (the gateway answers in about 150 ms), so the
   pact's six-call test passed its 60 s limit; it now has 120 s (9370b76). The time per call has grown slowly since M6
   (408 s for 29 tests in M6c, 605 s for 36 in M6e, 764 s for 40 now); worth profiling before the pilot.

## M7d — Notifications

Emulator unless marked. The development build with `expo-notifications` (Task 11). Developer → Notifications lists the
plan and shows a copy of the first one in 10 seconds; `adb shell dumpsys alarm | grep -A3 com.dannytist.levelmeup` shows
the times the phone holds.

| # | Check | Result |
|---|---|---|
| 1 | Settings shows Notifications: "Morning briefing · Off", "Evening reminder · Off", "Only if the core quest isn't done", and "Change notifications". | Pass (emulator, Android 16, test character Uma in America/Caracas, development build 998b72c0, 2026-10-12): "Morning briefing · Off", "Evening reminder · Off", "Only if the core quest isn't done" and "Change notifications" under Notifications |
| 2 | Turning on the briefing shows "Allow notifications?"; "Not now" leaves it off; "Allow notifications" brings Android's prompt; Allow turns it on with "7:30 AM" and the time stepper. | Pass: the briefing showed "Allow notifications?" with its line; "Not now" left it off and the phone unasked (POST_NOTIFICATIONS still not granted); "Allow notifications" brought Android's "Allow LevelMeUp to send you notifications?"; Allow turned the briefing on with "7:30 AM" and its stepper, and timer alerts came on with it |
| 3 | Deny twice (or `pm revoke`): the screen says notifications are off in the phone's settings; "Open phone settings" opens LevelMeUp's page; no prompt anywhere else, ever. | Pass, with a note: after `pm revoke` and the user-fixed flag the app reads "may ask" (Expo learns "for good" only when it asks), so the first switch shows the System's card; Allow → Android refuses without a prompt → within a second the screen says notifications are off in the phone's settings and the switches are disabled; "Open phone settings" opens LevelMeUp's App info (Notifications · Off). No prompt at launch or anywhere else. With them off the plan is empty (0 planned) and the phone's alarms were cleared |
| 4 | A briefing at its time (a time a few minutes ahead, or the developer screen's copy): the title "Day N · Morning briefing", the voice's line; on a planned rest day "Day N · Rest day". | Pass: the developer list held 6 briefings (day 2's 07:30 had passed): "Day 3 · Rest day" (Uma planned the rest) in the Questmaster's words, days 4-8 rotating their lines; `dumpsys alarm` held the same 6 at 07:30 Caracas (RTC_WAKEUP, inexact); the 10-second copy posted 11 s later on "Reminders" in ember; tapping it opened Today |
| 5 | The evening reminder is planned while the core quest is open and gone once it is cleared (the developer list and `dumpsys alarm`). | Pass (2026-10-14, Vera, emulator in GMT): the evening reminder on at 8:00 PM planned today 20:00 and tomorrow 20:00 (`dumpsys alarm`); once the core quest was cleared, only tomorrow's. |
| 6 | A running quest timer: with the app in the background, the alert comes at its time; pausing removes it; tapping it opens the quest. | Pending: Vera's day 1 has no timer quest; with her next one. |
| 7 | A notification due while the app is open shows as a banner. | Partly: due with the app open, it is posted (status bar and shade) but shows no banner: "Reminders" is default importance (decision 6) and Android shows banners only for high importance ("Quest timers", row 6) |
| 8 | The phone's settings list the channels "Reminders" and "Quest timers"; the status-bar icon is the silhouette, not a white square. | Pass, the icon improved for the next build: the channels "Reminders" (importance 3) and "Quest timers" (4) are listed; the status-bar icon is the LV silhouette, not a white square, but about half the size of the others (the adaptive icon's padding): a cropped 96 px `notification-icon.png` is in the config (633f853) and shows from the next build |
| 9 | Deleting the character (or starting over) leaves nothing planned (`dumpsys alarm`, the developer list). | Pass (2026-10-14): Uma's 6 planned alarms (`dumpsys alarm`) were 0 after the deletion. |
| 10 | The largest font: the Notifications screen and Settings' section wrap with nothing cut off; each switch and time stepper is at least 44 dp tall (`uiautomator dump`). | Pass after two fixes (font 2.0, then 1.0): the switches were Android's own, 27 dp tall, so each row is now the switch, 48 dp; the title broke inside "Notifications", so the header wraps and it moves under Back (both 633f853). Everything else wraps with nothing cut off; Settings' section too |
| 11 | Unit tests, the typecheck and the bundle scan pass. Nothing is planned before the player turns one on, even where the phone allows notifications from install (Android 12 and older; unit tests). | Pass: content 1076, rules 449, server 376, app 742; typecheck and bundle scan clean; nothing planned before the player opts in (unit tests) |
| 12 | Find X9: the briefing and the evening reminder at their real times over two days; the rest-day briefing; a timer alert with the screen off; the Shadow's reminder on a real Trial day; reminders after a reboot without opening the app (ColorOS). | Covered by M9b rows 4, 5, 7 and 10 |

### What the emulator found (M7d, 2026-10-12)

1. Android's switch is 27 dp tall, under the 44 dp target: each row is now the switch (48 dp), the native one only
   drawn (633f853).
2. At the largest text the title broke inside "Notifications": the header wraps, so it moves under Back (633f853).
3. The status-bar icon (the adaptive monochrome icon) is small: a cropped 96 px icon is in the config for the next build.
4. Expo learns that notifications are refused for good only when it asks: turned off in the phone's settings, they read
   as "may ask", and one more tap (the System's card, then Allow) shows the refused card. Nothing else ever asks.
5. A reminder due while the app is open goes to the shade without a banner (default importance, decision 6); only timer
   alerts are high importance.
6. The phone holds every reminder as an inexact alarm with a window of up to an hour (`dumpsys alarm`, Android 16): on a
   sleeping phone it may come that late. The screen now says "sometimes by up to an hour"; the Find X9 measures the real
   lateness (row 12).
7. Once, right after Allow under the user-fixed flag, the refused card showed only after the screen was opened again; a
   clean retry showed it within a second. Not reproduced.

## M8b — Reading

Emulator unless marked. The M7d development build (998b72c0) through Metro, no new build. Server: 0015 and functions v17
(2026-10-13 07:19 UTC); article-9 (psychology, "The progress principle") published 07:19 UTC.

| # | Check | Result |
|---|---|---|
| 1 | Developer → Reader sample: the board D3 layout; "Erdős" and "≈" show; sources open in the browser; at the largest font nothing is cut off. | Pass (emulator, Android 16, 2026-10-13): label, "6 MIN · WISDOM +10 XP", "DISCIPLINE AND HABITS", title, summary, sections with [1] / [1] [2], the System's box, the numbered takeaways, "To think about", "Your takeaway, one sentence", "Claim +10 XP" (disabled until a sentence), the sources "1. How are habits formed · example.org". "≈" and "Erdős" render (the phone's font for the missing glyphs). A source opened Chrome (its first-run screen), Back returned to the reader. Font 2.0: everything wraps, nothing cut off; font back to 1.0. |
| 2 | Today, on a day without an article: the reading card says the reading waits; no Read. | Pass: Uma's day 2 (built before 0015) shows "Today's reading" with the quiet card "Today's reading opens once the daily articles arrive. Nothing is lost while it waits." and no button; it wraps at font 2.0. |
| 3 | A new day after an article is published: the card shows its title and minutes; Read opens the reader; a takeaway claims +10 XP; "Quest cleared" without a rating; Read again. | Pass after two fixes (Uma's day 3, a planned rest day, got article-9): the card "The Progress Principle: Why Small Wins Keep You Going", "6 min · Wisdom +10 XP · one takeaway", Read; the reader with its 14 sources and their hosts; "Small daily progress keeps me going." claimed +10 XP ("Cleared", no rating, Read again, Undo); the sync brought Level 2 and *First Page*; Read again shows "Your takeaway" and no claim. Fixed (e9aea5b): the cleared heading said "TODAY'S READING · TODAY'S READING" (now the topic), and the card's Read again opened the cleared screen rather than the article. |
| 4 | The Chronicle the next day: "Past readings" lists it with its date; opening it shows the takeaway. | Pass (2026-10-14, release 0.2.0): Uma's Chronicle → Past readings lists "Tue 13 Oct. The Progress Principle: Why Small Wins Keep You Going"; opening it shows "Past reading · Tue 13 Oct" and "Your takeaway: Small daily progress keeps me going." |
| 5 | A Mage at level 5 or more: Insight under the reading card; choosing a topic shows "Tomorrow's reading: …"; the next day's article is from that topic. | Pending: needs a Mage test character at level 5 and published articles in several topics |
| 6 | Airplane mode across the day boundary (M6e): the offline day has the next day's article and it opens; after reconnecting, the server keeps it. | Pending: with the new test character, once several articles are published |

## M9a — Class art

Emulator unless marked. The M7d development build (998b72c0) through Metro, no new build. Art: `lmu-art/class-v1`.

| # | Check | Result |
|---|---|---|
| 1 | Developer → Portraits: all 24 portraits (each class, both figures, levels 1, 5, 10) and the Shadow load in their frames; at the largest font nothing overlaps. | Pass (emulator, 2026-10-13 10:15 UTC): all 24 and the Shadow loaded; at 2× text Character's Switch portrait grows and its label stays whole, nothing overlaps. Before the upload (09:15 UTC) the frame kept the emblem with Switch portrait under it. |
| 2 | Character: the painted portrait of the test character's class and tier in the tilted frame; Switch portrait swaps the figure at once, and the choice is still there after the app restarts. | Pass: Uma (Warrior, level 2, not the Women's program) showed `warrior-a-1`; Switch portrait showed `warrior-b-1` at once, still there after a force-stop and restart. |
| 3 | Airplane mode after row 2: Character still shows the painted portrait (the phone's cache). | Pass: airplane mode on, then a cold start; the portrait came from the cache. Toggling airplane mode let automatic time zone reset the emulator to GMT: restored to America/Caracas (Uma's), automatic time zone off. |
| 4 | Developer → Shadow preview: the painted Shadow in the scene's 16:9 panel, the mark stamp and the Shadow's words below. | Pass: Developer → Shadow preview → Scene: the painted Shadow fills the 16:9 panel, "Claimed · Mon 12 Oct" and the Shadow's words below. |
| 5 | A new test character: the reveal shows the class portrait under the class name; Switch portrait there carries to Character. | Pass (2026-10-14, Vera): the reveal shows the woman Warrior under the class name; Switch portrait there shows the man, and Character shows the man. |
| 6 | A level-up to 5 (or 10): the new portrait and "Your portrait has changed." | Partly (2026-10-14): Developer → Motion bench → Level up to 5 with Vera showed the level-5 portrait and "Your portrait has changed." In play, a level-up to 5 still waits. |
| 7 | A pact holding the day (the Shadow's mark): the dark corner over the painted portrait. | Pass in the developer gallery (one marked portrait, added for this row): the corner edged in ember over the picture, the ink frame on top. No test character is under a pact; Character uses the same component. |

## M9b — The pilot build (Find X9, the preview APK)

One pass on the owner's phone with the pilot APK (EAS `preview`, version 0.2.0). It carries its own code, so it opens
offline, and it has no developer screens. Install it over the development build from the build link: the phone keeps
its data. Each row lists the earlier Find X9 rows it covers; those rows say "Covered by M9b row N".

| # | Check | Covers | Result |
|---|---|---|---|
| 1 | Install over the development build: the character, the vow and the portrait choice are still there. Settings → About shows Version 0.2.0 and no Developer button. | M4 release rows | |
| 2 | With Wi-Fi and mobile data off, close the app and open it again: Today shows the day from the phone, with its quest pictures. Log a quest, turn the network back on: it syncs, and nothing is lost. | Spec §5 offline completion; M4 rows 6–7; M6a rows 9 and 12; M6e row 2 | |
| 3 | Sync now on mobile data and on Wi-Fi: about a second each (Settings' sync line). | M7c speed | |
| 4 | A full day: the morning briefing at its time; clear the core quest (the evening reminder is cancelled), a side quest and the reading; rate one, undo it and clear it again; the XP bar and the level move. | Spec §5 a full day, notifications; M6a rows 1, 2, 4–8; M7d row 12 (briefing, evening) | |
| 5 | A timer quest with the screen off: the alert comes at its full time; tapping it opens the quest. | M6a row 3; M7d row 12 (timer) | |
| 6 | The largest font (Settings → Display) and Remove animations (Accessibility): Today, a quest, Character, Settings and Your data and privacy read in full; nothing is cut off; the level-up still shows. | Spec §5 largest font, reduced motion | |
| 7 | Restart the phone without opening LevelMeUp: tomorrow's briefing still comes (ColorOS). Note how late it comes while the phone sleeps (the M7d exact-alarm question). | M7d row 12 (reboot, timing) | |
| 8 | Save with Google (an account listed as a Google test user): Settings says Saved with Google. | M5 rows G1, G3 | |
| 9 | Open `levelmeup://dev` from a note or browser link: Today opens. | M9b decision 3 | |
| 10 | With a pact at level 2 on a real "I just didn't" day: the focus session runs with the screen off and on, and afterwards the screen sleeps again (a release build). | M7c rows 6, 10 and 12; M7d row 12 (the Shadow's reminder) | |
| 11 | A fresh onboarding on the pilot build (a friend's phone, or the Find X9 after Settings → Delete my character, the owner's choice): the interview, the safety check, the reveal within 15 s, the vow, Not now → Today day 1. | Spec §5 onboarding; M5 rows 1–4 and 8 | |

Rows from earlier sections that wait for a character's progress (Stillness and Dawn Ritual at a Monk's level 5 and 10,
Vanish at a Rogue's level 10, a step down after "Too hard" on a later day) stay in their sections and run on the pilot
build when a character gets there.

### What the emulator found (M9b, 2026-10-13)

The preview APK (EAS build `2d297063`, version 0.2.0, versionCode 2) installed over the development build on the
emulator with `adb install -r`: Success, the same signing key, and Uma's character kept (Day 3, level 2 Warrior).

- Settings → About: "LevelMeUp is not medical advice.", "Version 0.2.0" and "Your data and privacy"; no Developer
  button (row 1's release part).
- `levelmeup://dev` and `levelmeup://dev/portraits` open Today (row 9).
- Your data and privacy at font 2.0: every section wraps in full, nothing cut off, down to "Questions" (row 6's page).
- Wi-Fi and mobile data off (`svc`, not airplane mode, so the time zone stays), the app force-stopped and opened:
  Today from the phone with "Offline · will sync" and the core quest's picture from the cache; back online it synced
  by itself within about 5 s (row 2's first half; nothing was logged offline, to keep Uma's day for M8b row 4).
- Sync now: "Syncing…" showed for about 1.0 s (a screen recording at 20 frames a second), against 11–15 s before M9b
  (row 3 on the emulator's network).
- Before the APK, the development build through Metro still opened Developer, Portraits and Self-check (25 of 25), so
  the stubs load the screens in development.

The emulator now runs the release build. Rows that need the developer screens (M9a rows 5–6 in the gallery, the
previews) need the development build again: EAS build `998b72c0` installs only as a downgrade (versionCode 1), so a
new development build would be cleaner.

## M10a — Motion

Rows 1–11 on the emulator with the development build (Claude), rows 12–15 on the Find X9 with the 0.3.0 preview APK (the
owner): EAS build `38704cd8`, https://expo.dev/artifacts/eas/yYxOmdvQcXFf9da6UWG4gQTkSpcMh-5ECAnGmD1mLmE.apk. "Remove animations": Settings → Accessibility → Remove animations (on the emulator:
`adb shell settings put global transition_animation_scale 0`, and `window_animation_scale`, `animator_duration_scale`).
Reanimated reads it at launch: force-stop and reopen LevelMeUp after changing it.

| # | Check | Result |
|---|---|---|
| 1 | Developer → Motion bench → Pieces: the panel slams in; the three stamps thud (the middle one in a splash of ink); the lines burst; the first bar fills 40 → 87 as the count runs; the second fills to the end, flashes, and fills 0 → 30; the last line rises. Replay plays them all again. | Pass (2026-10-14, screen recordings at 50 ms a frame): the panel slams in; the stamps thud from about 1.3× and faint; ink around the middle one; the lines burst; the first bar fills 40 → 87 with its count (40, 56, 61, … 87); the second fills to the end, flashes, empties and fills to 30/150; the line fades in rising. Replay plays them again. |
| 2 | The bench with "Reduced motion: on": every piece only fades, no ink, both bars and the count at their end values at once. | Pass (2026-10-14): with the switch on, one faint frame of each piece at its final size and place, then whole; bars and count at their end values; no ink, no flash, no burst. |
| 3 | Bench → Quest cleared: lines burst and the title slams in; at about 0.2 s the stamp thuds in ink; the panel slams in and the rank stamp thuds; the bar fills 67 → 87 with the count. Continue, pressed mid-moment, works at once. | Pass (2026-10-14) after a fix: the title slams, the stamp thuds, the panel slams, the rank thuds, the bar fills 67 → 87 with the count; Continue pressed 0.3 s in returned at once. The ink first hid behind the stamp (drops from the centre, fading as they came out); now they start past its edge, stay whole for half the flight and are 5–12 dp (60031c1). In the development build each moment sat about 0.4 s before moving; with Metro serving the production bundle the title moved within about 0.1 s. |
| 4 | Bench → Quest cleared, with a level-up: the bar fills to the end, flashes, fills from empty; the line reads LV 7 and counts from 0. | Pass (2026-10-14): the bar fills 117/130 to the end, flashes, empties and fills to 7/150; the line reads LV 7 and counts 0 → 7. |
| 5 | Bench → Level up to 5: lines burst, LEVEL UP slams in, LV 5 thuds in a bigger splash, the portrait rises (with a character), the System's line slams in. Bench → An achievement: the lines stay still, the label slams in, the name thuds, its words fade in. Each one replays when opened again. | Pass (2026-10-14, Vera): lines burst, LEVEL UP slams, LV 5 thuds in a 16-drop splash, the level-5 portrait rises, the System's line slams in, "Your portrait has changed." fades. The achievement (the bench's and a real "First Trial" after Vera's first quest): still lines, the label slams, the name thuds, the words fade. Both played again when opened again. |
| 6 | "Remove animations" on (app restarted): rows 3–5 only fade; no ink, no flash, the bar and the count at their end values. Set back to 1 afterwards. | Pass (2026-10-14; the three animation scales at 0, the app force-stopped and reopened): Quest cleared, the level-up and the achievement only fade, still one after another (the review's delay fix); no ink, no flash, no burst; the bar at 87 and the line "LV 6 · 87 / 130 XP" from the start. Scales set back to 1. |
| 7 | A new test character: the reveal's lines burst once and the class panel slams in; the vow's "Sworn" thuds. | Pass (2026-10-14, Vera): the reveal's header lines come in over about 0.2 s and hold; "WARRIOR" slams in from a little high and large. The vow's "Sworn" thuds from about 1.3×, centred where it lands. |
| 8 | A real quest cleared: the moment as row 3. Back on Today the bar already shows the new XP, and opening Today again replays nothing. Reopening the cleared quest shows its screen still (the owner, 2026-10-14). | Pass (2026-10-14, Vera's core quest): the moment as row 3, then "First Trial"; Today already showed 10 / 30 XP and stayed still when reopened; the cleared quest reopened still. A side quest in the production bundle: title at about 0.1 s, stamp at 0.25 s, panel at 0.4 s, bar 10 → 20. |
| 9 | The Shadow's scene (when a test character has one): the painting creeps closer over about four seconds, once; the box slams in; the claimed stamp thuds. | Pass (2026-10-14, Developer → Shadow preview → Scene, the real scene with a made-up miss) after a fix: the box slams in, "Claimed · Tue 13 Oct" thuds, the painting grows over four seconds. On the first, slow download the painting showed only after about 3.5 s, with the creep nearly over; the creep now starts when the painting has loaded (93ee89f). |
| 10 | Largest font and display size: on Quest cleared and the level-up, nothing is cut off once the stamps settle; the title fits. | Pass (2026-10-14; font 2.0, display density 560): Quest cleared with a level-up and the level-up read in full once settled; the title fits; the stamp clears the heading; both scroll to Continue. Reset to 1.0 and 420. |
| 11 | TalkBack on Quest cleared: the bar reads the new value, and the level line its final number, even mid-count. | Partly (2026-10-14): the accessibility tree (uiautomator) after the moment: the bar "Level 6 progress", the line's label "LV 6 · 87 / 130 XP". uiautomator waits for the screen to settle, so it can't read mid-count; the unit test covers the label mid-count. TalkBack itself on the Find X9. |
| 12 | Find X9: install the 0.3.0 APK over 0.2.0; the character is still there; Settings → About shows Version 0.3.0. | |
| 13 | Find X9: clear a quest. The moment feels smooth at 120 Hz and not slow; buttons react during it. | |
| 14 | Find X9: the next level-up (when it comes) as row 5. When a morning sync raises the streak while Today is open, the flame thuds once. | |
| 15 | Find X9: "Remove animations" on and the app reopened: only fades. | |

### What the emulator found (M10a, 2026-10-14)

- **Two fixes from watching it move** (frame grabs of screen recordings; the unit tests can't see either):
  - the ink splash hid behind the stamp (60031c1);
  - the Shadow's creep was nearly over before a slow first download showed the painting (93ee89f).
- **Development build timing:** each moment sat about 0.4 s before moving. With Metro serving the production bundle
  (`--no-dev --minify`) the same moment moved within about 0.1 s: the pause is the development build's, not the
  motion's. Row 13 on the Find X9 is the real check.
- **The modal's first frame:** the level-up and achievement content shifts down about 17 dp on the modal's first frame
  (with or without motion; before M10a it showed at once, so the shift was visible; now that frame is nearly clear).
  Carried to the roadmap.
- **The emulator now:** the development build 998b72c0 (versionCode 1), after uninstalling 0.2.0 (Android refused the
  downgrade); the test character **Vera** (a guest Warrior, the Women's program at level 1 with the man's portrait
  switched in, the Shadow pact from day 2, the evening reminder at 8:00 PM and timer alerts on); GMT; animation scales
  1; font 1.0; density 420. Expo's floating Tools button sits over the Settings gear: it was turned off in the
  developer menu.

## M10b — Haptics and a living Shadow

Rows 1–9 on the emulator with the development build `6fa0bb39` (0.4.0, versionCode 4; Claude, 2026-10-15). The emulator
can't be felt, so each buzz is read from the development log (`adb logcat -v time -s ReactNativeJS:I`, lines
`[haptic] …`) and from Android's own list of vibrations (`adb shell dumpsys vibrator_manager`, "Recent vibrations"),
beside screen recordings stamped with the device clock (`screenrecord --bugreport`). Rows 10–15 on the Find X9 with
the 0.4.0 preview APK (the owner): EAS build `c3633921`,
https://expo.dev/artifacts/eas/eCz9h2pozxdRQADTQ5IEPIVVj6sXpQaGZS_qNc5jubs.apk. "Remove animations" as in M10a (restart
the app after changing it).

| # | Check | Result |
|---|---|---|
| 1 | Developer → Motion bench → Haptics: each Feel button logs its feel once; the hold button logs `tick` once the press settles (0.1 s) and `sworn` two seconds later, and only `tick` when let go early. A swipe that starts on the hold button and scrolls the list: nothing. | Pass (2026-10-15) after a fix: each Feel button logged its feel once; a still hold (`input motionevent` down, 2.8 s, up) logged `tick`, then `sworn` 2.06 s later; let go at 0.8 s, only `tick`; a quick tap, one `tick`; two swipes that started on the button and moved the list, nothing. The first fix for the review's scroll finding (a 100 ms timer of the button's own) still ticked: React Native holds a press's end back until 130 ms after it began, so the scroll's end came after the timer. Pressable's own press delay never starts a press that a scroll takes (fb5d3cf). |
| 2 | Bench → Quest cleared: `stamp` as the XP stamp lands and one `tick` as the rank stamp lands, in the recording. Bench → Level up to 5: `level` as "LV 5" lands. An achievement: `stamp` as its name lands. | Pass after a fix: each moment logs its feels once, in that order. In the development build the buzzes played before the screen was even drawn (its slow first frame, M10a). In the production bundle (row 5) every click still led its stamp by 0.1–0.12 s: the wait was a JS timer, started as the screen was made, before Android drew it and started the stamp. The buzz now waits on the animation clock with the stamp (86f0055): the achievement's click then landed within about 15 ms of its name; the XP stamp's about 60 ms before the landing in the recording, which lags the screen by 2–4 frames and skipped the stamp's fall. The level-up's double click: 151 ms apart (designed 120). |
| 3 | Settings → Game: "Haptics" under "Voice, rhythm and minutes", on. Off: rows 1–2 log nothing; still off after a force-stop and reopen; on again. At font 2.0 the row wraps, nothing is cut off, and the switch's row (its label and switch, 48 dp) flips it. | Pass (2026-10-15): there, on. Off: the four Feel buttons, a full hold and Quest cleared logged nothing and Android played nothing; still off after a force-stop and reopen; on again. At font 2.0 the line wraps to two lines, nothing cut off; the label row flips it, as in M7d (the line beneath isn't part of it). Font back to 1.0. |
| 4 | "Remove animations" on: row 2's buzzes still come. | Pass (2026-10-15; the three scales at 0, the app restarted): Quest cleared logged `stamp` then `tick` and only faded; the level-up `level`; the achievement `stamp`. Scales back to 1. |
| 5 | Vera's real quest cleared: `stamp` (and `tick` when a stat rises). The cleared quest reopened: nothing. | Pass (2026-10-15, production bundle): her side quest "A good thing": a click (Confirm) as the stamp landed, then her level-up to 2: the double click. No `tick`: this quest raised no stat, so no rank stamp. Today's reading: a click, then the achievement "First Page": a click. Reopened: still, and nothing played. |
| 6 | Developer → Shadow preview → Scene: the stand-in's eyes pulse until the painting shows; then the glows sit on the painted eyes and pulse (about 3 s), embers rise and fade in the lower half, and after the 4-second creep the painting breathes. | Pass (2026-10-15): screenshots: the glows centred on the painted eyes, dim to bright and back; the embers in a new place each time, in the lower half; the breath measured as a 1.4–1.5 % swing in the painting's scale (each shot matched against a reference). Offline, with the image cache cleared, the stand-in's eyes pulsed (their red 118 → 213 → 118). |
| 7 | The scene, then Home and back three times (10 s, 3 s, 3 s): it carries on, the eyes still pulse fully and the breath is still full (review). Open for 60 s: `dumpsys gfxinfo` janky frames under 5 %. | Pass (2026-10-15): the breath 0.9940–1.0080 before the trips and 0.9940–1.0090 after; the glow's brightness 53–66 before and after. 60 s open: 3,544 frames, 2.31 % janky. In the development bundle (the Shadow preview is developer-only), with another emulator running alongside. A first reading of 99.7 % janky was the emulator itself (2.5 GB with 1 GB swapped out; scrolling was as slow): restarted, scrolling 1.67 %. |
| 8 | "Remove animations" on: the scene is still: no glows, embers or breath, and the stand-in's eyes don't pulse. | Pass (2026-10-15): two frames in 9 s of recording (screenrecord writes a frame only when the screen changes); no glows or embers. |
| 9 | `adb shell dumpsys vibrator_manager` after row 1: record whether the emulator lists the haptics. | Pass (2026-10-15): it lists each one (usage TOUCH, LevelMeUp, `performHapticFeedback`): `stamp` is constant 16 (Confirm, played as a click), `tick` 4 (Clock tick, a texture tick), `sworn` 0 (Long press, a heavy click), `level` 0 then 16. The production bundle has no log, so rows 2 and 5 were timed from this list. |
| 10 | Find X9: install the 0.4.0 APK over 0.3.0; the character is still there; Settings → About shows Version 0.4.0. | |
| 11 | Find X9: clear a quest. A firm click as the XP stamp lands and a light tick as the rank stamp lands, in time with what you see. Reopened: nothing. | |
| 12 | Find X9: the next level-up or achievement (when it comes): a stronger double click as "LV n" lands, a firm click as an achievement's name lands, felt although they show over everything (review). When a sync raises the streak while Today is open: one light tick; never while another tab or screen is in front. | |
| 13 | Find X9: Settings → Game → Haptics off: a quest cleared is silent; on again. With the phone's own touch feedback off (Settings → Sound & vibration → Vibration & haptics), silent too, with the app's switch on. | |
| 14 | Find X9: the pact's hold button (when the pact can be raised): press for a moment and let go: one light tick, nothing signed. Start a scroll on it: nothing. | |
| 15 | Find X9: the Shadow's scene, when it comes: the eyes glow, the embers rise, it breathes, smoothly at 120 Hz; left open a minute, the phone doesn't warm noticeably. | |

### What the emulator found (M10b, 2026-10-15)

- **Two fixes the unit tests couldn't see:**
  - the hold button's scroll guard: React Native's 130 ms minimum press beat a timer of our own; the tests now touch
    through React Native's own press logic (`test/support/touch.ts`) (fb5d3cf);
  - the reward buzzes led their stamps by about 0.1 s in the production bundle; they now wait on the animation clock
    (`after` in `motion.ts`) (86f0055).
- **How the buzzes were read:** the development log, Android's vibration list (which also works in the production
  bundle and gives each buzz's start to the millisecond), and recordings stamped with the device clock. The recordings
  lag the screen by a few frames, so they place a buzz to within about 50 ms, not better: row 11 on the Find X9 is the
  real check.
- **The emulator now:** the development build `6fa0bb39` (0.4.0, versionCode 4) installed over 998b72c0; **Vera** at
  level 2 (her side quest "A good thing" and today's reading cleared, the achievement "First Page"); restarted on
  2026-10-15 (it had run out of memory); GMT; animation scales 1; font 1.0. Another emulator (`kai_test`, not
  LevelMeUp's) was started alongside it during the checks, so commands named `emulator-5554`.
