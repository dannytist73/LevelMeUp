# Polish loop, 2026-10-20 (M17, branch `m17-polish`)

**In plain words.** The owner asked for a six-hour "Ralph loop" of continuous improvement: a better design, a smoother
app, what needs building, what needs fixing, and database changes where they help. Screens shouldn't feel cramped; they
should be laid out so people actually use them. A bolder redesign is allowed (owner, 2026-10-20). The loop started at
00:45 UTC and runs until about 06:45 UTC.

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
| 12 | Edit screens: Save in a bar at the bottom (Your game, Training; check-in's Answer too). Not done: Class, Book (their commit flows differ), "Discard changes?" on Back | O5, N14 | partly |
| 13 | Character: stats in two columns; achievement words beside their stamps. The portrait stays large (it is the reward) | O7 | done |
| 14 | Loading looks like empty on Library and Chronicle: skeletons | O8 | done |
| 15 | Delete character: "Keep my character" is the main button; deletion an outline | O9 | done |
| 16 | Spacing tokens (4/8/12/16/24/32) and one section rhythm | N11, O10 | open, S–M |
| 17 | Font scale caps at 1.3×: Chip and SectionTitle now follow to 2× (stamps and steppers keep their caps: fixed shapes) | O-6 | done |
| 18 | Headings for TalkBack on every tab and screen title; check-in follow-ups at heading size | O-15 | done |
| 19 | Plus, Trial and Vanish rise from the bottom; the Shadow's scene fades in | O14 | done |
| 20 | Workouts: a finished exercise folds to one line, the next one's steps open; the "gets harder" line lives in the steps | N5 | done |
| 21 | Deck: on Your turn the bottom row is Claim, above the keyboard. Drag on the UI thread: item 34 | N9 | done |
| 22 | Full-article reader: Claim needs two taps with the keyboard open (`keyboardShouldPersistTaps`) | N8 | done |
| 23 | Tomorrow's topic picker as one row | N12 | open, S |
| 24 | Quest rows' second line 14 pt (a global 14 wrapped Up next's safety line, so it's per row) | N13 | done |
| 25 | "I felt pain" and "Change today" as one row under Up next | N1 | done |
| 26 | Plus offer right after the Reveal, before the first quest (a product decision: ask the owner) | O1 | ask |
| 27 | Launch waits on a token refresh over the network (blank screen after the splash) | perf 1 | done |
| 28 | Today's header jumps with "Syncing…" on every tap | perf 2 | done |
| 29 | Each tap redraws every open screen ~3×: reuse the view when nothing changed; tabs watch only "offline" | perf 3, 5 | done |
| 30 | lmu-sync: ~95 sequential round trips; pipeline the reads, one-statement asPlayer, skip reloads when quiet | perf 4 | done, deployed |
| 31 | Action-triggered syncs: a debounce | perf 13 | dropped: the scheduler already folds a request made during a run into one more run; a debounce would delay every tap |
| 32 | Prefetch the portrait; warm the day's sounds | perf 10, 11 | done |
| 33 | Partial indexes for the per-sync counts | perf 13 | deferred: migrations must be numbered without gaps and 0020+ belongs to the studio session; cheap today |
| 34 | Deck card drag on the JS thread (needs gesture-handler: a native module, a new build) | perf 6, N10 | later |
| 35 | React Compiler: not safe yet (clock reads in render) | perf 8 | later |

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
