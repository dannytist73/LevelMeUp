# Polish loop, 2026-10-20 (M17, branch `m17-polish`)

**In plain words.** The owner asked for a six-hour "Ralph loop" of continuous improvement: a better design, a smoother
app, what needs building, what needs fixing, and database changes where they help. Screens shouldn't feel cramped; they
should be laid out so people actually use them. A bolder redesign is allowed (owner, 2026-10-20). The loop ran from
00:45 to about 06:45 UTC.

What came out of it, in short:

- **Today reads in one look.** A shorter header; System notes are one card each; the quest to do now, with its Begin
  button, fits on the first screen even with a check-in waiting; "I felt pain" and "Change today" share a row; a pull
  down syncs; checking off a side quest clicks, fills, fades and lets the rows below glide up.
- **The main button is always in reach.** Timers (Start, Pause, Claim), Cleared (Next), the Reveal (Accept), the check-in
  (Answer), Your game and Training (Save) and the reading deck's last card (Claim) keep their one button at the bottom.
- **Less to scroll.** Workouts fold each finished exercise to one line; Settings is grouped cards; Character's stats sit
  in two columns; the Library shows five past readings.
- **Smoother and quicker.** Launch no longer waits on the network; a tap no longer redraws every screen three times; tabs
  cross-fade; the server reads a player in one go (syncs measured at about 0.5 to 0.7 s).
- **New:** a kind weekly recap on the first open of a week; a level-up names the ability it unlocks.
- **Checked:** two independent code reviews (everything they found is fixed), the screens at 2× text, with animations
  off, and for unlabelled buttons; every test suite and the live server tests pass.

**The owner's yes for this loop (2026-10-20):** deploy migrations and functions once every local test passes (then
`db:test` and the live tests); a development build on this PC now and a 0.9.0 preview APK at the end. Everything else in
CLAUDE.md still holds (Vera is look-only on the emulator; the wedding's `public` schema is never touched).

## How each turn of the loop works

1. Pick the most valuable open item in the backlog below.
2. Change it test-first where it is logic; for layout, change it and check it on the emulator (development build).
3. Run the app's tests and the typecheck (and the server's tests when the server changed).
4. Commit, push, and log it below with how it was verified.
5. Every few items, an independent review of the diff; fix what it finds.

## Backlog (most valuable first; updated as the loop learns)

Sources: my own pass on the emulator (0.8.0, Vera look-only), two read-only UX audits of the current code (the daily
loop: N1–N15, P1–P3; everything else: O1–O15, A–C), a performance audit, and web research. "S/M/L" is the effort.

| # | Item | Source | Status |
|---|---|---|---|
| 1 | Up next's Begin bar: its label sat at the top of the bar (a wrapping row with no `alignContent`) | emulator | done |
| 2 | Tab bar: the active pill is round on Today but square on the other tabs; now a layer that grows in | emulator | done (device check) |
| 3 | Chronicle: square day cells (the last square shapes) and 31 drawings a month | emulator, O-20 | done |
| 4 | Today: System notes as one card with answers inside, a quiet edge (N6); shorter header; wider picture so Begin stays above the fold (N1) | emulator, N1, N6 | done (device check) |
| 5 | One tab header on all four tabs, with the Settings gear on each (Settings opens only from Today) | O3, O6 | done |
| 6 | Timer quests: the bottom bar is Start, then Pause, then Claim (not a disabled Claim); the live-notification offer below the clock | N2 | done |
| 7 | Cleared: Next in a fixed bottom bar; smaller stamp; Back to Today as a link | N3 | done |
| 8 | The rest timer redraws the whole log 4×/s: tick inside the rest bar, once a second | N4 | done |
| 9 | Motion: rows, the snackbar, folding sections and Done today animate in and out (reduced motion: none); the XP bar grows by `scaleX`, not width | N7, N15 | done |
| 10 | Onboarding Reveal: Accept pinned in a bottom bar; Change class and Fix together; portrait capped | O2 | done |
| 11 | Settings: grouped cards with rows and dividers; sync as one row; "N waiting" only when N > 0 | O4, B | done |
| 12 | Edit screens: Save in a bar at the bottom (Your game, Training; check-in's Answer too); "Leave without saving?" on Back (item 56). Not done: Class, Book (their commit flows differ) | O5, N14 | mostly |
| 13 | Character: stats in two columns; achievement words beside their stamps. The portrait stays large (it is the reward) | O7 | done |
| 14 | Loading looks like empty on Library and Chronicle: skeletons | O8 | done |
| 15 | Delete character: "Keep my character" is the main button; deletion an outline | O9 | done |
| 16 | Spacing tokens (4/8/12/16/24/32) and one section rhythm | N11, O10 | not done, on purpose (item 55: the differences are 2 dp; the screens now share BottomBarFrame, Group and TabTop) |
| 17 | Font scale caps at 1.3×: Chip and SectionTitle now follow to 2× (stamps and steppers keep their caps: fixed shapes) | O-6 | done |
| 18 | Headings for TalkBack on every tab and screen title; check-in follow-ups at heading size | O-15 | done |
| 19 | Plus, Trial and Vanish rise from the bottom; the Shadow's scene fades in | O14 | done |
| 20 | Workouts: a finished exercise folds to one line, the next one's steps open; the "gets harder" line lives in the steps | N5 | done |
| 21 | Deck: on Your turn the bottom row is Claim, above the keyboard. Drag on the UI thread: item 34 | N9 | done |
| 22 | Full-article reader: Claim needs two taps with the keyboard open (`keyboardShouldPersistTaps`) | N8 | done |
| 23 | Tomorrow's topic picker as pills | N12 | tried, then reverted at the second review: pills hid what each topic covers |
| 24 | Quest rows' second line 14 pt (a global 14 wrapped Up next's safety line, so it's per row) | N13 | done |
| 25 | "I felt pain" and "Change today" as one row under Up next | N1 | done |
| 26 | Plus offer right after the Reveal, before the first quest (a product decision: ask the owner) | O1 | ask |
| 27 | Launch waits on a token refresh over the network (blank screen after the splash) | perf 1 | done |
| 28 | Today's header jumps with "Syncing…" on every tap | perf 2 | done |
| 29 | Each tap redraws every open screen ~3×: reuse the view when nothing changed; tabs watch only "offline" | perf 3, 5 | done |
| 30 | lmu-sync: ~95 sequential round trips; pipeline the reads, one-statement asPlayer, skip reloads when quiet | perf 4 | done, deployed; quiet syncs measured 0.5-0.7 s on the emulator (M9b measured about 1.0 s; not a controlled comparison) |
| 31 | Action-triggered syncs: a debounce | perf 13 | dropped: the scheduler already folds a request made during a run into one more run; a debounce would delay every tap |
| 32 | Prefetch the portrait; warm the day's sounds | perf 10, 11 | done |
| 33 | Partial indexes for the per-sync counts | perf 13 | deferred: migrations must be numbered without gaps and 0020+ belongs to the studio session; cheap today |
| 34 | Deck card drag on the JS thread (needs gesture-handler: a native module, a new build) | perf 6, N10 | later |
| 35 | React Compiler: not safe yet (clock reads in render) | perf 8 | later |
| 36 | Today redraws on every sync start and end | perf 3 | done |
| 37 | Class change fades the current class to 2.45:1; an empty Codex is one small line | O11, emulator | done |
| 38 | Body limits (knees, back…) can't be changed after onboarding: a safety gap. Needs the `adjust` SQL function, so a migration | 2026-10-15 audit | proposed: needs a migration number agreed with the studio session |
| 39 | Dev previews (Shadow, check-in, offline) crashed: their made-up state lacked fields Today reads since M12 | emulator | done |
| 40 | Tabs snap: cross-fade (none with reduced motion) | own pass | done |
| 41 | Library's empty lessons card had a button duplicating today's card above it | emulator | done |
| 42 | Pull down on Today to sync; a check-off gives a stamp's click; the check circle fills before the row fades | research §1, §5 | done |
| 43 | lmu-sync waits for Auth before its first read: run them together (nothing used unless Auth confirms) | perf 4d | done, deployed (v29), live 51/51; no clear gain over the noise (0.5-0.7 s either way) |
| 44 | Long titles leave one word alone on the last line: balanced line breaks for titles and headings | emulator | done |
| 45 | Weekly recap: the first open of a new week says how last week went (kind; waits for a pending check-in) | research §4 | done |
| 46 | Second review: pain hidden during a confirm (fixed, tested), fold not announced (fixed), and 5 minor (fixed; topic pills reverted) | review | done |
| 47 | Level-up names the class ability it unlocks | emulator | done |
| 48 | Deck cover: the top bar repeated the title | N9 | done |
| 49 | Library: five past readings, Show all for the rest | O12 | done |
| 50 | Character and Chronicle opened with a small grey word; now a title like Today and Library (Character's is the name) | own pass | done |
| 51 | Minutes a day: numbers sat left in their boxes | own pass | done |
| 52 | Change today's confirmation had bright buttons under Up next: a System card with quiet answers | old audit 1 | done |
| 53 | System cards captured their colours at load (wrong under a Plus look) | own catch | done |
| 54 | Design critique (a designer agent on 15 screenshots): Safety after the log as a filled card; disabled buttons as quiet outlines; a sentence-sized takeaway box; Today's check-in card asks only the question; quiet System narration; even side-by-side buttons; switch rows; option-card markers (radio/checkbox) and lighter edges; "0 of 2 shields"; long reading titles at heading size; quieter portrait switch and ranks; onboarding's sign-in split; Training row summary; and five small ones | critique | done |
| 56 | Back with unsaved changes in Your game and Training asks first (Android's dialog); Save leaves without asking | O5 | done |
| 57 | Third review: disabled edge too strong; Enter closed the Shadow's note (now only one-line fields); recap said "starts today" mid-week; week marks now read as the Chronicle reads them; old recap keys pruned; snackbar edge; check-in gap line back on Today; recap waits while the Shadow's card shows; Settings test fixed | review | done |
| 58 | Screens not yet polished: Your look's locked frames wear the Plus pill (colours said "Plus" twice); Book and a locked Vanish name themselves in the bar; Notifications' switches as one group, each time with its switch | own pass | done |
| 59 | The Codex drew all its lessons (up to 200) on opening: now a list drawn as it scrolls, with the status band; a dev preview holds 200 | perf | done |
| 60 | A 360 dp phone (many budget Androids): Today's System card stacked "Answer" and "Later" (and even halves squeezed longer answers onto two lines); answers are now sized to their words and stack only when they don't fit. Library, Character, Chronicle, Settings, the workout log and the deck fit as they are | narrow pass | done |
| 61 | Settings' note "Only if the core quest isn't done" floated under the plan group: now says it is the evening reminder | narrow pass | done |
| 62 | Character's stats on a 360 dp phone: the rank sat beside some stats' points and wrapped under others, so the two columns' bars didn't line up; the rank now starts the line under each bar (also shorter at normal width) | narrow pass | done |
| 63 | Pull down to sync worked on Today only; now on all four tabs through one hook (a failed sync ends the spinner instead of rethrowing) | own pass | done |
| 64 | Fourth review (no critical or important findings): Codex rows redrew or remounted on every update (now stable); tests for a locked look's spoken "Plus" and for ScreenList's band; Your game, Training and Vanish's chooser name themselves in the bar like the other Settings and ability screens (Class, Pact and Delete keep their large titles: they are decisions) | review | done |
| 65 | A tap on the tab already shown did nothing; now it scrolls that tab back to the top (still with reduced motion) | own pass | done |
| 66 | Onboarding's "Your day": the wake and sleep steppers sat side by side at 150 dp each, so "7:00 AM" broke onto two lines on a 411 dp phone; they now stack on a phone (side by side only where there's room). The other question steps read well | onboarding pass | done |
| 67 | Seen in development only: changing the emulator's display size reloads the app's code mid-write, and the next start's first database transaction fails once ("cannot start a transaction within a transaction"), so Today shows "quests aren't here yet" until the next sync. Release builds never reload the code (no expo-updates, no reload call), so no change | onboarding pass | noted, not a bug in release |
| 68 | Second design critique (a designer agent on 22 current screenshots). Taken: the Account card could wait forever when the first read of local records failed (now known either way; test-first); one 12-hour clock everywhere ("Last synced 03:51" was the only 24-hour time); no lone last words in the plan row and "your line saved"; the deck's top bar kept its height from the cover to card 2 (it jumped on the first swipe); the safety check counts answers up ("0 of 7 answered"); Codex's Take out sits with its own card; a lock beside locked abilities; "Within reach" as a small heading | critique 2 | done |
| 69 | Critique 2 items not taken: selected option cards as tonal instead of paper (the paper card is the Lantern look the owner chose); the pain screen's order (gentle movement leads when one fits: spec M6b decision 6, a safety choice for the owner); the check-in card's answers and Begin's two sizes (one bright button per screen, and the XP is meant to be quieter); deck counters, Codex card redesign, Library thumbnails, link styles, onboarding sign-in as a text button (bigger changes than this loop's last hour); deleting the evening note | critique 2 | not done, on purpose |
| 55 | Critique items not taken: a spacing scale (2 dp differences); marking missed days on the calendar (the Chronicle never shows a miss, M6d); one place for XP; the onboarding chapter counter | critique | not done, on purpose |

## Waiting on the owner (proposed, not done)

1. **Change body limits after onboarding** (knees, lower back, shoulders, wrists). Today a player who hurts a knee in
   week 3 can only report pain day by day; the limit that shapes every workout can't be added. It needs the `adjust` SQL
   function to accept a limits change and replan the day, so a migration. Migrations must be numbered without gaps, and
   0020+ is the studio session's (M15), so the number has to be agreed first. Recommended next: yes, as M18.
2. **Story Deck drag on the UI thread.** Dragging a card runs on the JS thread (PanResponder), so it can stutter while a
   sync lands. The fix is `react-native-gesture-handler` (a new native module: a download and a new build). Recommended:
   yes, with the next native change.
3. **React Compiler.** Would cut needless redraws app-wide, but several screens read the clock while drawing (timers, the
   day's end), which the compiler could freeze. Needs those files marked first and a device pass. Recommended: later.
4. **The Plus offer right after the Reveal** (before the first quest). It doesn't show yet (Plus isn't on sale). Research
   says most trials start on install day; the UX audit says it costs first-session momentum. Your call when Plus goes on
   sale.

## Log

| Time (UTC) | Item | What changed | Verified |
|---|---|---|---|
| 00:50 | 1, 2 | `alignContent: 'center'` on the Begin bar and the Then rows; the tab pill as an always-there layer that grows in | app tests 55/55; device: next build |
| 00:52 | 3 | Rounded day cells; plain days draw nothing; the paused hatch only where needed | screens tests |
| 01:00 | 4 | `SystemCard`; Today's header 50 dp shorter; picture 2.6:1, cropped from the bottom; "Up next" in the card's line | emulator (dev build): Begin in view with a check-in waiting |
| 01:03 | 5 | Settings gear on every tab (`TabTop`); tab titles are headings | emulator: gear and round pill on Chronicle |
| 01:05 | 27–29 | Launch no longer waits on the account; refresh keeps unchanged objects; tabs watch "offline" only; no "Syncing…" in the header | app tests 1173/1173 |
| 01:12 | 30 | lmu-sync reads pipelined; quiet syncs read once; achievements in the reply's transaction | server unit 585/585; deployed (lmu-sync v28); live 51/51 |
| 01:15 | 8, 9 (bar), 22 | Rest bar ticks alone; XP bar scales; taps land with the keyboard up | app tests |
| 01:17 | 6 | Timer: Start → Pause → Claim in the bar; offer under the clock | app tests 1174/1174 (new bar test) |
| 01:19 | 7 | Cleared's bar | emulator (motion bench): Continue pinned, all on one screen |
| 01:23 | 9 | `Appear`/`Glide` on Today's rows, folds, the snackbar | emulator: Change today folds open; app tests 1174/1174 |
| 01:25 | 10 | Reveal's Accept bar | app tests (new bar test) |
| 01:28 | 11 | Settings as grouped cards | emulator: three screenshots |
| 01:30 | 13, 15, 17, 18 | Stats in two columns; Delete's buttons; headings; font caps | emulator; app tests |
| 01:33 | 12 (part) | `BottomBarFrame`: Save pinned on Your game and Training | emulator: Training |
| 01:36 | 14 | Skeletons on Library and Chronicle | app tests (new Chronicle test) |
| 01:40 | 20 | Workout exercises fold when done | emulator (workout preview); app tests (new fold test) |
| 01:45 | review | Independent review: no Critical; 1 Important (calendar cells marked later never drew), 5 Minor; all fixed | app tests 1176/1176 |
| 01:48 | 19, 24, 25 | X screens rise from the bottom; rows at 14 pt; pain and Change today in one row | emulator: Today |
| 01:51 | 21 | Deck's Claim in the bottom row on Your turn | emulator: Vera's deck paged to Your turn (nothing typed or claimed) |
| 01:54 | 12 (part) | Check-in's Answer pinned; Pact gets Back; Library's repeated heading gone | emulator: check-in (not answered) |
| 01:57 | QA | Today, Settings, Character at 2× text: everything wraps, nothing cut | emulator screenshots |
| 01:59 | 23, 36 | Topic pills; Today ignores syncs over a usable day | app tests |
| 02:01 | 37 | Class cards readable; Codex empty state | emulator |
| 02:05 | 39 | Dev previews open again | emulator (Shadow preview and scene) |
| 02:08 | 30 | Sync timing in dev builds: quiet syncs 0.5-0.7 s | Metro log, 7 syncs |
| 02:11 | 40, 41 | Tab cross-fade; Library duplicate button | emulator; app tests |
| 02:17 | 42 | Pull to refresh; check-off haptic | emulator (spinner and a logged sync) |
| 02:19 | 43 | Auth and first read together | server unit 585/585; deployed v29; live 51/51 |
| 02:22 | 42, 44 | Check circle fills; balanced title breaks | emulator (Library title) |
| 02:27 | 45 | Weekly recap | app tests (week.test, Today) ; emulator shows "Last week: 1 of 5 days cleared." |
| 02:29 | 46 | Second review fixes | app tests 1184/1184 (new pain-confirm and fold tests) |
| 02:32 | 47 | Ability on level-up | emulator (motion bench: "New ability: Second Wind") |
| 02:35 | QA | Accessibility sweep: every tappable on the tabs and screens has a label; Remove animations on: all works | emulator |
| 02:40 | 48, 49 | Deck cover title; past readings | app tests |
| 02:43 | 50, 51 | Tab titles; centred minutes | emulator; app tests 1186/1186 |
| 02:45 | build | Candidate 0.9.0 preview APK started (WSL) | BUILD OK 02:56 (from c5d2e67) |
| 02:49 | 52, 53 | Confirm card; colours read at draw time | emulator (Rest day confirm, then Not now) |
| 02:54 | 54 (part 1) | Safety, disabled buttons, takeaway box, check-in card, quiet narration, even buttons | emulator: Today, quest, Training, deck; app tests 1186/1186 |
| 02:58 | 54 (part 2) | Switch rows, check-in screen card, sign-in split, Character, shields, titles, option edges | emulator: Settings, Character, Today, Library, onboarding |
| 03:00 | 54 (markers) | Radio and checkbox markers | emulator: Training, check-in |
| 03:02 | 54 (small) | Kept lessons count, workout steps size, Cleared lines, Training row | app tests |
| 03:07 | 56 | Leave guard | emulator: changed a choice, Back asked, Leave left; Vera's Training unchanged |
| 03:12 | 57 | Third review fixes | app tests 1187/1187, content 1170/1170, typecheck clean |
| 03:20 | 58 | Look, Book, Vanish, Notifications | emulator (look only), 2x font: no truncation; app tests |
| 03:25 | 59 | Codex list | new test (a full Codex draws fewer than 200 rows); emulator: 200-lesson preview scrolled; scan marker added |
| 03:30 | 60, 61 | Narrow-phone pass | emulator at 360 dp (density 480, then reset): Today, Library, Character, Chronicle, Settings, workout, deck; app tests 1188/1188 |
| 03:34 | 62, 63 | Stats rows; pull on every tab | emulator: stats at 360 dp and normal width; a pull on Library showed the spinner and a 0.5 s sync in the log; hook tests; app tests 1190/1190 |
| 03:39 | 64 | Fourth review fixes | app tests 1191/1191; emulator: Your game, Training, Codex preview |
| 03:40 | 65 | Tab tap to top | emulator: Character scrolled down, its tab tapped, back at the top; other tabs still switch; app tests 1192/1192 |
| 03:45 | 66, 67 | Onboarding pass | emulator, look only (Analysis not opened: it creates a character): welcome, goals, body, rhythm (fixed), safety; Your game and Notifications steppers unchanged |
| 04:03 | 68, 69 | Second critique | app tests (store, screens, deck, onboarding, settings) and content 1170/1170; emulator: Settings account card, deck bar, Codex, Character |
