# Ralph loop, 2026-10-27

The owner's ask (12:49): "Run a ralph loop until 2:50 PM: research the best gamified UI/UX and ways to improve our app;
improve our system, check bugs; get the latest APK ready by 2:50 PM."

**What happened:** the loop started at 12:49 and ran until about 12:54 (research launched, baseline tests, emulator look,
studio fix, a copy fix). After that the session stalled and did nothing until the owner asked at 17:01, so **the 2:50 PM
deadline was missed**. The APK build was started at 17:05.

Branch `simpler-day` (not merged; merging is the owner's call). Client-side only: no deploys, no live DB writes, no new
packages.

## Status

- [x] 1. Research (below, with sources)
- [x] 2. Bug check and two fixes, committed and pushed
- [ ] 3. APK 0.14.1 built, installed on the emulator, checked (see APK below)

## Bugs found and fixed

1. **The studio's picture judge was too strict** (`652e039` on `m15-daily-studio`, `3e715da` on `simpler-day`). Today's
   story (article-168) and the 10-23 story (article-142) went out with no picture because every take was turned down for
   a missing small prop ("no biology textbook", "the phone is screen up"). The judge now treats the scene as a guide:
   only the wrong person, a mangled face or hands, text, or a different moment rule a take out. Takes effect at
   tomorrow's 09:00 run. Article-168 still has no picture; drawing and storing one is a live write, so it waits for a yes.
2. **The check-in asked "What happened?" twice** (`90effb7`): the bubble ("Yesterday slipped by. What happened?") sat
   right above the card ("The day closed. What happened?"). The bubble now welcomes you back ("Welcome back! Yesterday
   slipped by.") and the card asks.

Also checked, no bug found: typecheck clean; tests app 1328, content 1198, rules 500, server 655 (all pass); Camp,
Stories and Me on the emulator (Vera, look only).

Seen in the studio log, not a code bug: on 10-25 and 10-26 ComfyUI could not be had within the hour (the PC was busy
with this session's work), so those stories went out without a picture at first.

## Research: what the best habit games do

Full report with sources came from a research pass over Duolingo's own published experiments, Finch, Fabulous, Habitica,
Forest, Pokémon Sleep and the habit research behind streaks.

**What works (with evidence):**

- **Make the streak easy to keep.** Duolingo let one lesson keep the streak: day-14 retention +3.3%, learners on a
  streak +10.5% ([blog, 2020](https://blog.duolingo.com/improving-the-streak)).
- **Celebrate the streak going up, bigger on milestone days.** A new streak animation with milestone variants: new
  learners 1.7% more likely to be back 7 days later
  ([blog](https://blog.duolingo.com/streak-milestone-design-animation)).
- **Slack keeps people going.** Holding two streak freezes: +0.38% daily learners, no more days off; Weekend Amulet: 4%
  more likely to be back a week later
  ([blog, 2017](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals)).
  With built-in "emergency reserves", 55% bounced back the next day against 37% with a hard goal
  ([UCLA Anderson](https://anderson-review.ucla.edu/emergency-reserves/)).
- **Never show a broken streak.** Seeing a broken streak lowers what people do next, even when the break wasn't their
  fault; repairable streaks and letting more kinds of activity count soften it
  ([Silverman, 2023](https://udel.edu/udaily/2024/march/power-of-streaks-motivation-jackie-silverman)).
- **Reward the comeback.** The top intervention of 50+ in the exercise megastudy was a bonus for returning after a miss
  ([Penn](https://penntoday.upenn.edu/news/wharton-study-best-ways-boost-workout-habits)).
- **Fresh starts.** People start goals after "new beginning" dates such as a Monday
  ([Dai, Milkman, Riis](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf));
  Pokémon Sleep resets with a new Snorlax each week and refuses to reward extreme sleep schedules
  ([interview](https://corporate.pokemon.co.jp/en/topics/detail/t-9/)).
- **Rotate notification lines.** The same message wears out; picking templates with that in mind gave +2% new-user
  retention ([Duolingo Research, KDD 2020](https://research.duolingo.com/)).
- **Finch:** a missed day costs nothing (the bird stays home); tiny goals; an evening reflection; complaints are the pet
  turning into a chore (third-party reviews only).

**What to avoid:** guilt notifications ("these reminders don't seem to be working"), late-night last-chance pushes, a
mascot that gets sadder as the deadline nears, red gaps and "you lost X days", punishment loops (Habitica's lost health,
Forest's dead trees), selling the safety net, rewarding bingeing.

## How Grumble Camp compares

Already in the app (good): a missed day asks kindly and the first four answers pause the streak (slack, no broken
streak); shields every 7 days (the streak freeze); morning and evening lines rotate by day; a new Grumble each week
(fresh start); the Grumble book of the ones you befriended (collection); haptics on Done and level-ups; a day-end card
with XP earned and when the next day starts; last week's recap line; no shaming copy anywhere.

## Ranked improvements (for the owner to pick)

Small, client-side:

1. **Streak milestone moments** on days 3, 7, 14 and 30: a short celebration (still image and text with reduced motion).
   The app celebrates level-ups and achievements but not the streak itself. Evidence: Duolingo +1.7% at day 7.
2. **Day-end card says what the Grumble lost**: "Snoozle lost 2 power today. 3 more and Snoozle joins your camp."
   The card shows XP but not the battle.
3. **"Welcome back" after the check-in**: the first Done after a paused day gets its own line from the buddy ("Pummel
   saved your spot"). Copy only; the bubble fix above is the first half.
4. **Rest days as friendly marks** on the Chronicle (a sleeping mark labelled "Rest", never a gap).
5. **Day-end card points at the story** when today's reading is still open ("Today's story is waiting").

Medium:

6. A real comeback bonus (server XP) for the first quest after a pause (megastudy's top idea; a server change).
7. A Monday recap card with the new Grumble's intro (fresh start), keeping the all-time total in view.
8. An optional first-week target (3, 7 or 14 days) in onboarding, worded as a commitment.

Large:

9. The home-screen widget showing the buddy (sleepy or neutral, never sad).
10. An opt-in buddy streak with one friend (needs privacy and moderation work first).

## APK

(building; filled in when checked)
