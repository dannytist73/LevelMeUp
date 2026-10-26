# A simpler day, and the name Grumble Camp (2026-10-26)

**In plain words:** the app asks for too much. An ordinary day took 16 taps, a typed sentence and 6 screen changes, and
Today stacked three cards before the first quest. In 0.14.0 the camp is home. This week's Grumble holds out today's
quest on a scroll. One tap does a quest, the cheer plays at the fire, and the story is one scroll that ends with a line
you tap. That's 6 taps a day and nothing to type. The camp is a clay painting that grows as friends join. The app is
renamed Grumble Camp. The server doesn't change: it still decides every quest, reward and battle.

Owner's choices, 2026-10-26, on the canvas "A Simpler Day" (https://claude.ai/artifact/Qes83hF2qHLi4phnw8gnxE):
"1 to 6 yes, name Grumble Camp".

| Call | Answer |
| --- | --- |
| 1 The simpler day (the Grumble hands over each quest, one card on Camp, no Cleared screens) | Yes, as 0.14.0, app only |
| 2 Three tabs: Camp, Stories, Me | Yes |
| 3 The story as one scroll | Yes |
| 4 The takeaway: tap one of three lines, your own words one tap away | Yes |
| 5 The clay camp in three stages, two takes each to pick, a pink fire in all three | Yes |
| 6 Each Grumble bringing a quest about its own habit | Later, after 0.14.0 settles (a server change, its own plan) |
| 7 The name | Grumble Camp (a trademark search before any store listing is the owner's) |

## Decisions

1. **Three tabs.** Camp (the `index` route, the home), Stories (the library, renamed) and Me. The Camp tab goes; its
   Grumble book moves under the camp scene. The settings gear is on Me only. Me's tab shows a dot while something waits
   in its Set up list (decision 9).
2. **The camp scene** (`src/screens/camp/CampScene.tsx`) tops the home: a clay painting of the camp at its stage (first
   nights with 0 to 2 friends, the cabin with 3 to 9, the lodge with 10 or more), with the app's own stills on set spots
   (`src/art/camp.ts`): your buddy by the fire, up to six friends around it, and this week's Grumble at the edge. The
   fire's glow flickers. The visitor holds out a scroll (a new still, `gift`) while the day has a quest for it, sleeps
   once the day is done, and is idle while it waits for a check-in. Its line sits in a speech bubble: the battle
   explained in its own words on its first visit, its question after a missed day, a cheer after a quest. With reduced
   motion everything stands still. Tapping a friend says the line it joined with.
3. **Under the scene, one battle strip and one card.** The strip: the Grumble's name, its power and need as a bar, and
   the battle clock (Arena's facts, one line). The card is the next thing, in this order: the check-in's question
   (decision 7), Up next as the Grumble's scroll ("Snoozle brought today's quest", its picture, title, target, power,
   Let's go), the story once the main quest is done, then "That's today" when the day is. Check-off side quests sit on
   the same card under "Also today", each cleared by its circle (Undo as now); a side quest that logs something opens
   its screen. "Not today?" under Let's go opens the day's options (decision 5).
4. **The quest screen, simpler.** One top bar (back to Camp, Not today?), the buddy doing the quest, the title and
   target, the steps open (no folds), and safety with "I felt pain" as now. A rep log or a workout claims its target in
   one tap: "Done · 3 × 8". "Did different numbers?" opens the log as it is now. Timers and one-sentence quests keep
   their panels. Why it was picked stays, folded, at the end.
5. **The day's options move off Camp** to a screen of their own (`/day`, `src/screens/DayOptions.tsx`): swap, hard day,
   rest today or tomorrow, the Monk's and Rogue's abilities, and the paused exercises with Resume. "I felt pain" is on
   it too for an exercise quest (pain always offers a rest).
6. **No Cleared screen after a claim.** The quest screen goes back to Camp and the app's note says "Knee push-ups done"
   with Undo. Camp plays the cheer (the visitor flinches, a burst, "+2"). A small "How did it feel?" row (Easy, Right,
   Too hard) stays on the card for the quest just cleared, optional as now (no answer counts as Right on the server);
   Too hard offers the step down in place. A cleared quest opened later from "Done today" still shows Cleared, still.
   Level-ups and achievements keep their moment (Celebration), and a decided battle its replay.
7. **The check-in on Camp.** The Grumble asks; the five answers are buttons with what each does. "Sick or injured" and
   "I just didn't" (when Second Wind is offered) ask one more question in place; the others send at once. "Ask me later"
   stays. The Checkin screen stays for a notification that opens it.
8. **Notes.** On Camp: a refused sync (with Retry), the server's notices (Got it), the lighter-plan offer, the Shadow's
   box for a pact, the Trial, the Mage's Insight, the day's banners, offline and update notes. The battle explainer
   becomes the Grumble's first line. Last week's recap is one line under the scene, shown that first open.
9. **Me's Set up list** holds what the notice strip offered one at a time: save your character, the voice, gear and
   training, the slip question, the vow, the weekly program, the morning reminder, and Plus's two cards. Each row goes
   where it says and leaves the list; a row whose answer is already given never shows.
10. **The story as one scroll** (`src/screens/reading/StoryScroll.tsx`) for story lessons, today's and past ones: title,
    the regular, each story card with its picture, why it works (the Grumble shrinks and cheers), the quick check (your
    buddy thinks, then cheers), the lesson with try today, Keep and Share, then "Which line will you take with you?":
    three lines from the deck (why it works, the lesson, try today). One tap claims the reading with that line as the
    takeaway; "Write my own" opens the field as now. The server takes any sentence up to 280 characters, so it needs no
    change. A thin bar shows how far you are. The full article stays a link. Decks from before M14 keep the swipe deck.
11. **Grumble Camp.** The app's name (app.json, the widget's label) and every "LevelMeUp" the player reads (Plus is
    "Grumble Camp Plus"). The Android package (`com.dannytist.levelmeup`), the link scheme, the server and its names stay,
    so nobody loses a character. Store listing, icon and website: later, after the owner's trademark search.
12. **Art.** `scripts/art/camp-art.py` paints the three camp stages (two takes each, a pink and blue fire) and writes the
    picked ones to `assets/camp/`; `grumble-art.py` gains the `gift` pose (holding out a scroll tied with a lime ribbon)
    for all 24, keyed with the other stills. The owner picks the camp takes; the build uses mine until then.
13. **0.14.0, version code 16.** No server change; `MIN_APP_VERSION` stays.

## Not now

Each Grumble's own habit quest (decision 6 of the canvas: some quests already fit, such as Phone out of reach for Grabbit,
and it needs the server to pick by Grumble). A new icon, the store listing and the website under the new name.

## Order

Art in the background (gift poses, camp takes) → content (copy, names) → Camp home + scene + tabs → quest screen + day
options + no Cleared → check-in on Camp → story scroll → Me's Set up list → rename → tests, typecheck, bundle check,
review → emulator (Vera look-only) → 0.14.0 APK.
