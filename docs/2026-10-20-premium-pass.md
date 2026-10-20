# Premium pass: what would make LevelMeUp feel premium (2026-10-20)

**In short.** A talk by Tim Gabe, "The Psychology of Premium Apps"
([video](https://www.youtube.com/watch?v=8EAYZe6y3I8)), argues that any team with AI tools can now make screens that
look good, so good-looking screens no longer set an app apart. People call a product premium when it gives them proof
that someone thought it through. That proof shows up in three places:

1. **The everyday states AI tools skip.** After every action the player should know three things: it worked, they can
   take it back, and what to do next.
2. **Screens that agree with each other.** The person who uses the app daily sees screen 80 next to screen 1. Limits
   should be stated exactly, with a count and the date they reset. The talk's example: "2 of 2 sessions used ·
   refreshes 1 Nov", not "You've used all your sessions".
3. **The worst moments.** A failure handled well can leave people happier than if nothing had gone wrong (the "service
   recovery paradox"). Chrome's offline dinosaur is the classic example. The test: break the app on purpose (no
   signal, a failed payment, empty lists) and design those screens as carefully as the success screens.

We checked LevelMeUp against all three with three read-only code audits (2026-10-20). The core loop already meets
the bar:

- Checking a quest off confirms it, offers Undo and shows the next step.
- The missed-day check-in is shame-free.
- Plus failures and denied notification permission recover well.

The gaps are at the edges. In a few places the app can **silently lose a player's work**, or **go quiet when
something fails**. Screens also describe the same thing in different words.

**Recommendation:** build Part A and Part B now. Both are app-only: no migration and no server deploy. Then build Part
C. The four server questions at the end need your yes.

## Status (2026-10-21, branch `premium-pass`)

The owner chose "A + B now, then C" and "allow 7 days" for offline days. Everything below is built, tested and
committed on `premium-pass`. That branch is not merged into `main` yet.

**Built:**
- **A1 to A7:**
  - Drafts are saved on the phone.
  - A sign-in that ends no longer wipes anything.
  - A refused sync is shown on Today.
  - Undo gives the log back.
  - Every screen has its own crash fallback with Go to Today.
  - Offline days are built one after another, up to 7, and Today says until when they count.
  - A save that fails says so.
- **B1 to B7:**
  - An app-wide note confirms actions that close their own screen, and Today's and the Codex's Undo use it too.
  - Class change asks for confirmation once more.
  - Check-in answers are acknowledged.
  - Buttons show a working state (busy labels).
  - The re-read deck ends with a Done button.
  - Plus restore wording is clearer.
- **C1 to C4:**
  - Swaps read "1 of 2 left" with when they come back.
  - The rest limit names the next date a rest is allowed.
  - Cooling abilities stay in view.
  - Chronicle explains shields.
  - Quests use one completion verb and "+N XP" everywhere.
  - The level line reads the same everywhere.
  - Pushed screens have titled top bars, and loading uses skeletons.
  - Destructive choices use quiet buttons.
  - Stray copy moved into the content package. The account box no longer over-promises.

**Server, deployed with the owner's yes:**
- **Migration 0020:** the late window grows from 48 hours to 7 days. The studio session gave up its claim on 0020 and
  up, so new migrations continue from 0021.
- **lmu-sync v32** carries three changes:
  - `restOpens`, so the rest limit can name a date.
  - The `more` signal, so the server closes days with the last request of a long outbox.
  - A phone-built day older than the window is applied at the time it was built.
- **Checks:** the database tests passed on live. `lmu-articles-studio` was checked afterwards by the studio session.

**Tests:** rules 476, content 1180, server unit 621, app 1239, plus the typecheck and the function check.

**Reviews:** two independent reviews (data safety, UI and copy) found one critical issue and 6 important ones. All
are fixed, and each fix has a test. The test for the "pain on a built day" fix was confirmed to fail without the fix.

**Emulator** (development build, Vera look-only, outbox left empty):
- The app boots on the new code, and every tab draws.
- Settings: Sync now shows "Syncing…" while it works.
- The crash test shows the screen's own fallback, and Go to Today works.
- The note sits above the phone's bar.
- The offline preview shows "Connect by Thu 29 Oct, 4:00 AM…".
- The class change asks for confirmation with the date.
- The new swap counts, level line, shield rule and titled top bars all show.

**Still open:**
- The phone checks in `docs/device-verification-checklist.md`, section "Premium pass".
- The live suite wasn't run: it spends on Claude for the reveal.
- Two known follow-ups:
  - **Spacing scale and Deck:** a spacing scale, and moving the Deck onto the UI kit.
  - **Notes on screens behind:** the note doesn't yet follow screen focus. Over a screen that sits on top of a quest,
    it floats a little high.
- Server questions 2 to 4 below.
- **Abuse risk:** a modified app could backfill up to a week of phone-built days, up from 2. Claims are self-reported
  anyway, and a cap per sync would bound it if that ever matters.

**What sets LevelMeUp apart.** Most habit apps treat failure as an error message. LevelMeUp has a narrator, the
System, which lets failure become a moment inside the game, the way Chrome's offline page did. A lost connection
could read: "The signal is faint. Everything you do is written on this phone and reaches the System when it returns.
Connect by Thu 22 Oct, 4:00 AM so yesterday counts." The missed day is a habit app's worst moment, and LevelMeUp's
check-in already handles it better than most apps. The plan below extends that standard to every other failure.

---

## Part A. Never lose the player's stuff (worst moments, highest value)

| # | What the player sees now | What they should see | Where |
|---|---|---|---|
| A1 | The workout log (ticked sets, changed reps) is kept only in memory. If Android closes the app mid-workout, it's gone. The same goes for the reading takeaway, the one-sentence quest answer and the Shadow note on Done. | Drafts are saved to the phone as the player types. On return: "Picked up where you left off." The Shadow note is kept on Done. | `screens/quest/logDrafts.ts:5`, `reading/drafts.ts`, `Quest.tsx:311`, `ShadowScene.tsx:89-96` |
| A2 | When the server confirms the sign-in has ended, the phone is wiped with no word. Unsent actions are lost and the player lands in onboarding. A Google-saved player gets the same treatment. | Never wipe without asking. Show a card instead: "Your sign-in ended on this phone. Your character is safe." A Google-saved player gets [Sign in with Google again]; a guest is told plainly what starting again discards ("3 unsent actions"). | `state/store.ts:582-586` (`session_ended` → `forget()`); `store.ts:89-91` (the guest-only "sign-in lost" copy) |
| A3 | Some refusals stop syncing with no retry and nothing on Today: a rate limit (429), a timeout (408), or another unusual refusal. Quests say "Will sync" forever. An ended day says "The next day is on its way." Only Settings mentions it. | 429 and 408 retry like a network error. Anything else shows a note on Today: "2 actions haven't reached the System yet. They're safe on this phone. [Try again]". | `sync/scheduler.ts:57-70`, `sync/engine.ts:93` |
| A4 | "Logged by mistake? Undo" on the Cleared screen resets a timer to zero and the rep counts to the targets. | Undo returns the player to the log exactly as they claimed it. Snackbar: "Undone · XP returned". | `Cleared.tsx:224`, `Quest.tsx:206,229-230`, `RepLog.tsx:41` |
| A5 | The crash screen offers only "Try again", which redraws the same broken screen. Errors go to `console.error` only. The local-records failure screen says just "Close the app and open it again." | Add **Go to Today** and a short error id. The records screen says the player's data is on the phone and what to try. | `screens/Crashed.tsx:13`, `app/_layout.tsx:141` |
| A6 | Offline for more than a day: from day 2, Today says "Today's quests come with the next sync". Work that reaches the server more than 48 hours late is refused afterwards, though it was marked "Will sync". | Give the deadline before it passes: "Still offline. Yesterday's quests count if you connect by Thu 22 Oct, 4:00 AM." (Making them count for longer is server question 1.) | `game/offlineDay.ts:57`, `content/play.ts:182-183`, `game/notices.ts:9` |
| A7 | A failed save on the phone is silent. The check circle says "{title} cleared" even if the save failed. Check-in, Swap, Pain and Book swallow errors without a word. | "Couldn't save that on this phone. Try again." No "cleared" unless the save worked. | `Today.tsx:256-257`, `Swap.tsx` catch, `Book.tsx:51` |

## Part B. Every action says: it worked, here's how to take it back, here's what's next

Reuse the app's best pattern: the check-off's "{title} cleared · Undo" snackbar.

| # | Action | Add |
|---|---|---|
| B1 | Swap, Save training, Your game, Pact, Book | A snackbar after saving: "Swapped to {title}" / "Saved · applies from your next quest day". On failure, say so instead of just turning the button back on. |
| B2 | Class change (locks for 14 days, one tap, no confirm) | Confirm in two steps: "Your next change opens {date}". Then: "You're a Rogue now. Tomorrow is built for it." |
| B3 | Check-in answers (sick, emergency, too hard) | Show the outcome line that already exists in `CHECKIN_TEXT.answers[x].outcome` (e.g. "Streak paused · lighter tomorrow") as a one-time card. |
| B4 | Lighten the plan, Remind me, Show it (offers that vanish without a word) | "Now 20 min a day from your next quest day. Change it in Daily plan." If Android refuses the reminder prompt, say so. |
| B5 | Network buttons (Save with Google, Restore purchases, Sync now, Delete) | One `busyLabel` on `Button`: "Saving…", "Checking Google Play…", "Up to date". After a deletion, the first screen says "Your character and its data were deleted." |
| B6 | Re-read deck, last card | A Done button, not only the X. |
| B7 | Plus restore failure | "Couldn't reach Google Play to check. Nothing changed." When nothing is found: "Bought with another Google account? Switch accounts in the Play Store, then Restore again." |

## Part C. One product, not 80 screens

**C1. State every limit with a count and a reset date.** This is the talk's "2 of 2 · refreshes 1 Nov" lesson.

| Limit | Now | Should be |
|---|---|---|
| Shields | "0 of 2 shields"; the 7-day rule is in no copy | "1 of 2 shields · next in 3 days" |
| Swaps | "Swap · 1 left"; at 0 the button vanishes | "1 of 2 swaps left · resets 4:00 AM"; at 0 it stays visible, disabled, with the reason |
| Rest days | "You've rested twice in the last 7 days…" | "Next rest day opens Thu 22 Oct" |
| Abilities | Disappear from Today while on cooldown | Shown disabled with "Ready Sat 24 Oct" |
| Check-in window | "Your streak stays paused until you answer." | Add the date the window closes |
| Codex | Silently drops the oldest lesson after 200 | Say so as the limit nears |

**C2. One way to say each thing.**

- **Level and XP:** five formats today across Today, Cleared, Character, Day done and the class path. Use one line.
- **Counts:** one format, "X of Y", everywhere. The Deck now shows "3 / 7" and "2 of 4" on the same screen.
- **Completion words:** eight verbs today. Use one family built on "cleared", always followed by "+N XP".
- **Same idea, different words:** "Back to Today" vs "Back to today". "Takeaway" vs "line". "Article" vs "reading".

**C3. One pattern per kind of screen.**

- **Top bar:** five pushed screens use an empty top bar plus a separate title. Use the titled bar everywhere, and use
  `kind="close"` for the Deck.
- **Empty and gone states:** one empty-state component (`StateNote`) for every empty or gone state.
- **Loading:** skeleton placeholders for every load. Retire "The System is preparing your trials."
- **Destructive confirms:** one component, with "keep" bright and the destructive choice quiet. Today Book does the
  opposite.

**C4. Housekeeping that keeps it consistent.**

- **Stray copy:** move the text in Settings, `notices.ts` and `syncLine.ts` (about 70 strings) into the content
  package so the copy checks cover it.
- **Spacing:** add a spacing scale. Section gaps now drift between 22, 24, 26 and 28.
- **The Deck:** move it back onto the UI kit; it has 35 hand-set spacings.
- **Widget:** make the home-screen widget follow the chosen theme.

**C5. The talk's own test.** Use the app for an hour like a daily player, on the emulator, then the Find X9. Note
every spot where it stops feeling like the same product. Add the rows to the device checklist.

## Needs a decision or a server change (not started)

1. **Offline for days. Done (2026-10-21): the owner chose 7 days; 0020 and lmu-sync v32.** The server refused work that arrived more than 48 hours after its day closed
   (`0003_write_functions.sql:136`, `0015:59`), and the phone builds only one offline day. A player at a gym or on a
   trip without signal for 3 days loses credit. **Recommended:** allow 7 days for phone-built days. This needs a
   migration, and the number has to be agreed with the studio session, which owns 0020 and up.
2. **Kept lessons, vow and portrait live only on the phone.** Settings promises a Google-saved player that "A new
   phone can … pick up where you left off", but the Codex, vow and portrait don't come back. **Recommended:** sync
   them (a migration). Until then, change the Settings line so it promises only what comes back.
3. **Rate limits.** The server could send a `Retry-After` time with 429/503, and the app would wait exactly that long.
   This is small and optional; A3's retry already covers the main case.
4. **A guest who starts again** leaves their old character on the server, and they can't delete it. Decide whether
   the server should clean these up.

## Order and checks

- Build on a new branch from `main`.
- Rules come first, written test-first: drafts, sync states, quota dates.
- Parts A and B ship in one development build, checked on the emulator. That includes A1 (closing the app
  mid-workout from the task switcher) and A3 (faking a 429 in a test).
- Part C follows as a second round.
- Then the next APK. Vera stays read-only.
