# LevelMeUp — MVP Design Spec

**Date:** 2026-10-10 · **Status:** all four sections approved in chat; full spec awaiting the owner's review
**Inputs:** `docs/2026-10-10-discovery.md` (decisions 1–4), `docs/research/`

## Plain summary

An Android-first RPG self-improvement app. The player is interviewed by a mysterious System, gets a class and
stats, and clears 1 core quest and 2 side quests a day. The server awards XP. A fair system handles missed
days, and accountability stays in-app for the MVP. It replaces MAINARC. Pilot first (free APK for the owner and
friends), public Play launch later.

## 1. Core journey and navigation (approved 2026-10-10)

### 1.1 First run (about 3 minutes, 10 beats)

The System "awakens" and interviews the player, asking only what changes their quests.

1. **Awakening:** name.
2. **Voice:** supportive mentor, neutral system or strict questmaster, each with a sample line. Changeable later.
3. **Goals:** up to 2 of: stronger body, more energy and better sleep, read and learn, focus and beat distraction,
   build a routine.
4. **Branch questions** for the chosen goals only (1–3 each): fitness level, equipment, injuries and limits;
   reading habit and interests; main distractions; and so on.
   *M5 (owner decision 2026-10-11): everyone sees the Body screen and its safety check, whatever their goals, since
   every class gets walks and stretches. Equipment is dropped (no quest uses it); "I follow my own plan" is a fourth
   training answer. One mind screen (reading, focus) appears only for the Learn or Focus goal.*
   *Built in M6c (2026-10-12): equipment returns with the workouts that use it. A Training step after Body asks what the
   player can train with (resistance bands, dumbbells, a bench, a pull-up bar, a gym, or "Just my body") and which
   program they follow (Men's, Women's or No preference; anyone may pick any). It appears only when strength work is
   possible (not "I follow my own plan", a clear safety check); otherwise no equipment and No preference are sent.
   Both can be changed later in Settings → Training.*
5. **Rhythm:** wake and sleep times set the personal day boundary (default 4 AM local; works for shift workers).
6. **Time and difficulty:** minutes per day; gentle, steady or hard.
7. **"When you slip, what helps?"** Suggests an accountability style, shown on the reveal; nothing activates
   (enabling goes through the Accountability Pact, §4.3).
8. **Analysis scene:** the rules compute the character; one AI call writes its narrative. A template-written reveal
   is used if the call fails or takes longer than 15 s (§4.2).
9. **Character reveal:** class, stats, strengths, growth areas, starting routine, a short narrative, labelled
   "stats are game estimates". The player can change class and correct wrong assumptions.
   *M5: a correction runs the analysis again with the corrected answers; the server allows it until the player's
   first action (`restart_player`), and the Claude calls already made still count towards the cap.*
10. **Optional vow** (hold to accept), then Day 1, deliberately light.

- **No sign-up wall.** The player starts as an anonymous Supabase user (the wedding site's pattern) and is asked to
  "save your character" with Google or email after the reveal.
- **Notification permission** is asked when the player sets the briefing time, not at launch.

### 1.2 A normal day

Briefing notification → Today → confirm, swap one quest, or pick "hard day" → complete quests (reward animation) →
the article → the day closes at the boundary → if the core quest was missed, a check-in on the next open.

### 1.3 Navigation: 3 tabs plus Settings

| Tab | Purpose | Main action |
|---|---|---|
| **Today** | Briefing, core quest, side quests, today's article, Shadow encounters | Complete a quest |
| **Character** | Portrait, level and XP, 5 stats, class and class path, titles | See growth |
| **Chronicle** | Calendar with real dates, streaks, stat history, past articles, achievements | Look back |
| *Settings* (gear) | Voice, day boundary, notifications, accountability, account and deletion | |

Why not 5 tabs: the article is read from Today (one a day), so a Reading tab would be empty most of the time;
achievements and history are both "looking back"; fewer tabs keep today's quests one tap away.

*Built in M6d (2026-10-12):* Character shows a framed class emblem (the painted portraits come with M9), the name,
level and title (the latest earned achievement that carries one), total XP and the level bar, each stat with a bar to
its next point and "rank D at 10" when one point away, the class path (both abilities, when each unlocks, ready or
"ready again in N days"; abilities whose screens come later say so), the achievements earned and how many are still
hidden (board D4 keeps them on Character), the vow from onboarding, and the class change. Chronicle shows the streak,
best streak and shields as tiles, a month calendar with real dates for the last 92 days (cleared, hard day, rest,
paused, today; a closed day is never drawn as a miss; earlier months by button), and growth since day 1 (stat points
gained, levels, quests cleared, new rungs). Past readings arrive with articles (M8).

*Built in M7b (2026-10-12):* Settings has the account (a guest's or Google's, "Delete my character", and the
start-again card when a guest sign-in is gone for good), Game ("Voice, rhythm and minutes": the voice, the time the
quest day ends in half-hour steps, minutes a day and difficulty, one change; and Training), sync and the version.
Deleting says what goes and, for a Google-saved character, that the Google sign-in stays; it needs a second tap.
Notifications arrive with M7d, the Pact with M7c.

### 1.4 Screen states

| Screen | Loading | Empty | Error |
|---|---|---|---|
| Onboarding analysis | The System "analysing" scene (max 15 s) | — | Template-written narrative, silently; the reveal still plays |
| Today | Cached quests from the device shown at once; a quiet sync mark | Before the day's quests exist: "The System is preparing your trials" and a retry | Offline: cached quests stay usable; completions queue with a "will sync" mark. Never shown as failure |
| Today: article card | Skeleton card | No article yet: an evergreen article from the library | Same as empty |
| Character | Cached profile | — (always exists after onboarding) | Cached values with a "last synced" time |
| Chronicle | Cached history | Day 1: "Your chronicle begins today" | Cached history with a "last synced" time |
| Settings: account | — | Anonymous: a "save your character" card | Sign-in failure: a plain message; the anonymous progress is kept |

### 1.5 Defaults (owner did not object)

- Sign-in with Google; anonymous play until then. Email is added once a custom SMTP sender exists (before the
  public launch): the shared project's built-in sender only mails team members (architecture §4.4).
- Honor-system completions plus in-app timers for focus and reading; Health Connect auto-verify after the MVP.
- Class art from the Inkbound manhwa pipeline, and since M6a the quest art (one picture per kind of quest, the
  `lmu-art` bucket, `docs/design/quest-art.md`); a visual design canvas for onboarding and the reveal in Phase 4.

## 2. Classes, stats, XP and levels (approved 2026-10-10)

All numbers live in one server-side rules table and are checked by a 90-day pacing simulation (steady 90%,
typical 70%, struggling 40% completion) before anything is built on them.

### 2.1 Stats

| Stat | Grows from |
|---|---|
| Strength | strength training |
| Vitality | walking, endurance, mobility, sleep, recovery (absorbs Agility) |
| Wisdom | reading, learning, reflection |
| Focus | deep work, phone-free blocks |
| Discipline | consistency only: +5 per day the core quest is done (any version), +5 per recovery quest, streak milestones 7/14/30/66/100 days = +20/+30/+50/+80/+100 |

- Each quest instance awards XP once, to its primary stat (optionally split with a secondary; the split never adds
  XP). Character XP = the sum of all stat XP. Nothing is double-counted.
- Starting stat points come from onboarding estimates in a narrow band (3–8); the class's main stat gets +2.
- Stat points = start + floor(sqrt(statXP / 22)): fast early, slower later. (The divisor was 10 until M2's campaign
  on real built days; see below.)
- Ranks by stat points: E < 10, D 10–14, C 15–24, B 25–39, A 40–59, S 60+ (about rank C after 3 months of steady
  training in the main stat). Tuned by the simulation, and judged on the average class (owner's decision, M2): with
  divisor 22 the average class reaches rank C on about day 89, a Mage on about day 55 (the daily article also trains
  Wisdom) and a Rogue on about day 126. Each class must land between 6 weeks and 5 months.
- XP, levels and stats never decrease.

### 2.2 XP per quest

| Source | XP |
|---|---|
| Minor quest (about 5 min or very easy) | 10 |
| Standard quest (10–20 min) | 20 |
| Major quest (25–45 min) | 30 |
| Hard-day version | half, rounded up (minimum 5); still counts for the streak |
| Reaching a new progression step (ladder rung) | +15 to that stat, once per rung |

The day is capped at 1 core + 2 side quests + the article (plus a recovery quest when one is owed, worth Discipline
only), so a full day is about 65 XP and a typical day about 45.

### 2.3 Levels

XP to go from level L to L+1 = 30 + 20 × (L − 1). Cumulative XP to reach level N = 30(N−1) + 10(N−1)(N−2).
M1's simplified pacing model (a standard core quest every day) moved the step to 32. M2 re-ran the check on real
built days, where new players start every ladder at its first rung and missed sessions step ladders down; real days
earn less, and only steps 19 and 20 meet every target, so the step is back at 20 (`npm run pacing`).

| Level | Cumulative XP | Steady player | Struggling player |
|---|---|---|---|
| 2 | 30 | day 1 | day 1–2 |
| 5 | 240 | end of week 1 | about week 2 |
| 10 | 990 | about 3 weeks | about day 40 |
| 15 | 2,240 | about 6 weeks | — |
| 20 | 3,990 | about 2½–3 months | later, still climbing |

The check passes if each target is met within ±20%; if not, the per-level step (now 20) is tuned, not the XP table.
On real days (four class personas at 25 minutes, 400 runs) steady players reach level 10 on days 17.7–18.2 and
struggling players on days 46.9–47.8. The struggling target (at most day 48) passes only just; a wider margin needs
the base (30) or the content, not the step.

### 2.4 Streaks and shields

- A streak day = the core quest done (any version) **or** any 2 quests done.
- Protected days pause the streak (no growth, no break): planned rest, sick or injured, emergency, travel, or a
  server-side outage (auto-protected, no question asked). 3 or more days protected by a check-in answer in 14 days
  → the System offers a lighter plan, never a penalty (planned rest and server outages don't count).
- A plain miss: see §3.7 (recovery quest first, then a shield, then a reset).
- Shields: earn 1 per 7 streak days; hold at most 2.
- Away for several days: one check-in covers the gap; the streak waits as "paused" until it is answered.

### 2.5 Classes

| Class | Main / second | Typical day | Level 5 ability | Level 10 ability |
|---|---|---|---|---|
| Warrior | Strength / Vitality | strength ladders, walks, a 5-minute read | Second Wind: once a week, make up a missed core quest the next day for full credit | Unbreakable: once a month, a plain miss doesn't cost a shield or the streak |
| Mage | Wisdom / Focus | reading, notes, reflection, plus walks and mobility | Insight: choose tomorrow's article topic from 3 | Scholar's Path: set a book; reading quests track it to the end |
| Rogue | Focus / Vitality | focus sessions, phone-free blocks, hardest task first, plus movement | Shadowstep: 2 swaps a day instead of 1 | Vanish: a planned phone-free block guarded by a timer |
| Monk | Vitality / Wisdom | sleep routine, mobility, breathing, gentle walks | Stillness: once a week, a gentle restoration quest replaces the core quest and the day grows the streak (unlike a planned rest day, which only pauses it) | Dawn Ritual: a morning routine bundle counts as the core quest |

- Quest mix: the core quest trains the main stat on about 4 days a week, the second stat on about 2, and a
  "balance" quest targets the weakest area about once a week. Nothing is locked.
- Class change: at most once every 14 days; level, XP, stats and achievements are kept; abilities follow the new
  class at the current level.
- After the MVP: advanced classes via a 7-day Class Trial at level 20 (Ranger, Paladin, Sage, …), level 15 abilities,
  equipment and cosmetics.
- Limits count quest days, so DST and travel can't shift them (M2): "once a week" means every 7 quest days, "once a
  month" every 30. Second Wind puts the missed core quest in the recovery slot for its full XP plus the recovery's
  Discipline +5. Insight (M8) gets its screen later; its rules exist now (Vanish came in M6b, Second Wind and
  Unbreakable in M7a).
- Built in M6b (2026-10-11): class change from Character; the 14 days are measured in time from the last change (the
  first change after onboarding is open at once); today's quests stay, tomorrow is built for the new class. Stillness
  and Dawn Ritual replace today's open core quest from Today. Vanish runs on the phone only (the rules give it no
  reward): 30, 60 or 90 minutes with the screen kept awake, counting only while LevelMeUp stays open.
- Built in M6d (2026-10-12): Scholar's Path. A Mage from level 10 sets a book (Character → Set a book); reading quests
  then show it ("Reading: Dune"), and the card counts the sessions and minutes read since it was set. "Finished it"
  keeps the book with its sessions (the newest 100 books); "Set it aside" clears it. Changing the book re-drafts
  today's open reading quests.
- Built in M7a (2026-10-12): Second Wind is offered with "I just didn't" on the check-in (§3.7) when yesterday's core
  quest can be redone today. Unbreakable works on its own: when a plain miss isn't recovered and Unbreakable is ready,
  the streak holds even with no shield left, and its 30 quest days start.

### 2.6 Achievements and titles

About 25 in the MVP across milestones, streaks, ladder rungs, class feats, articles read and comebacks (e.g.
*Rise Again*: clear a recovery quest after a miss). Some grant a title shown under the name (e.g. *The Unbroken*,
30-day streak).

## 3. Daily quest generation and fair failure (approved 2026-10-10)

### 3.1 The quest library

- About 10 authored **ladders** (ordered rungs, easy → hard), about 70 templates in total:
  push, squat, core, walk, mobility, reading, insight, focus, phone-free, sleep and breathing.
- A template has: ladder and rung, stat (and optional secondary split), effort tier (minor/standard/major),
  estimated minutes, completion type (tap / timer / rep log / short text), a measurable condition, instructions,
  safety notes, contraindication tags (knee, back, shoulder, wrist, …), class affinity, a linked hard-day version,
  and title/description text in each of the three voices (mentor, system, questmaster).
- Text is drafted once at authoring time (Claude) and reviewed by the owner; a fitness professional skimming the
  strength ladders before the pilot is recommended. No AI call is made when a day is generated.
- Players who already follow a training program get "complete your own planned session (≥ N min)" as their
  strength quest instead of beginner ladders.
- **Built in M2** (`packages/content`): 12 ladders (the 11 above plus "own program") and 74 templates. Each template
  has a plain name shared by all voices, short steps, safety notes, and a title and one line per voice; the hard-day
  version is part of the template. A standard quest takes at least 8 minutes and a major one at least 23; a minor
  quest may take longer when it is very easy (phone-free blocks). Tiny standalone quests (a glass of water, two pages,
  tomorrow's hardest task) keep 10-minute days possible.
- **Built in M6c** (2026-10-12): a 13th ladder, `workout` (6 rungs, 80 templates in all). A workout is 3–4 exercises
  from a 53-exercise library in 15 movement slots (`packages/content/src/training/`), planned by the rules for the
  player's equipment, reported limits and program day (`planWorkout`; a missed workout repeats). Exercise names, slots
  and rep ranges follow the owner's Kaizen workout builders; every step and cue is written in LevelMeUp's own words.
  The workout ladder is the strength ladder every class prefers, so a strength core quest is a workout whenever one
  fits (25 minutes a day or more); push-ups, squats and core training stay for side quests, swaps and shorter days.
  The day after a workout builds no strength quest. A quest stores its planned exercises and their sets (a `session`
  condition), so a content change never rewrites a day. Titles name no numbers (the target line carries them).

### 3.2 Generating a day (deterministic, a pure TypeScript rules package)

1. Day type: normal, planned rest, hard day (chosen at the briefing), or re-entry after time away.
2. Core quest: the class mix from §2.5, with recovery rules (no strength pattern on consecutive days; walking or
   mobility after a strength day).
3. Two side quests: one goal-aligned, one balance. Core + sides fit the player's stated minutes per day.
4. Text: the template's variant in the player's voice.
5. The server creates the day once (`unique (user_id, quest_day, slot)`). A new day opened offline is built on the
   phone with the same package, marked provisional, and checked by the server on sync (slot count, templates
   allowed by the player's ladder state, rewards taken from the server's table) (M6e: one offline day at a time; the
   server keeps it when every quest is allowed, otherwise builds its own and counts the work by slot).

Every quest card shows **why it was picked** (e.g. "You cleared incline push-ups 3 times, so knee push-ups unlocked").

How M2 builds it (`packages/rules`, `buildDay`):
- **Budget:** the player picks 10, 15, 25 or 40 minutes (default 25). Core and side quests fit it; the article and the
  recovery quest sit outside it. Each side quest keeps 2 minutes free and the core gets the rest. Light days (day 1,
  the first day back after 5+ days away, the day after a sick or injured check-in) have 10 minutes.
- **Core:** a 7-day pattern by day number: main, second, main, balance, main, second, main. The day after a strength
  core never has another: where the pattern asks for strength, the core is walking or mobility. No strength ladder
  is built two days running in any slot. Ladders the class prefers come first, and the least recently built wins.
- **Sides:** side 1 serves one of the player's goals (two goals take turns); side 2 trains the weakest stat not
  already in the day. A quest built below the player's rung to fit a side slot doesn't count for that ladder.
- **New players start every ladder at its first rung** until onboarding (M5) sets starting rungs, so early days are
  short and mostly minor quests.

### 3.3 Progression (performance-based, never calendar-based)

After a completion, one optional tap: Easy / Right (default) / Too hard.

- **Step up** after 3 completions at the rung within 14 days, the last 2 not "too hard"; 2 "easy" ratings step up
  sooner. Difficulty shifts the bar: gentle 4, steady 3, hard 2. At most one step up per ladder per week.
- **Step down** after "too hard" (offered immediately), 2 misses of that ladder in 7 days, or re-entry after
  5+ days away (first session one rung lower).
- **"I felt pain"** pauses that ladder without penalty and swaps in rest or gentle movement; persistent pain → the
  System suggests a professional; resuming starts one rung lower.
- Built in M6b (2026-10-11): "Too hard" offers the step down on Quest cleared at once (when the quest is at its
  ladder's current rung, above the first). After "I felt pain" the player chooses: gentle movement (the first rung of a
  walking or mobility ladder, another kind of movement first, when one fits the day) or rest today (the day is
  protected as `pain`, which never uses up a planned rest day); a cleared quest can be paused. A standalone exercise
  quest (the small strength quest) rests by its own id. From the second report in 14 days the flow leads with "see a
  doctor or physiotherapist". Nothing costs XP. A report always rests the exercise, even when it reaches the server
  after its day ended; only the day itself can't change then.
- Built in M6c (2026-10-12): the workout ladder climbs harder exercises first (rungs 0–2: level 1, 2, 3 versions,
  e.g. wall → incline → floor push-ups; machines → dumbbells → barbells, 3 × 2 sets, 16 minutes), then more sets
  (rung 3: 3 × 3, 23 minutes), then a fourth exercise (rung 4: 4 × 3, 29; rung 5: 4, 3, 3, 3 sets, 32), with the same
  step-up and step-down rules. Pain on any exercise rests the whole workout ladder. Every set ends with 1–2 good reps
  left (nothing goes to failure); barbell lifts are the hardest level only and say to learn them with a light bar.

### 3.4 Safety

- Onboarding includes the PAR-Q screening. Any "yes" → the gentlest walking and mobility ladders only, plus a
  suggestion to check with a doctor before harder training. Read as: the only *exercise* quests are gentle walking
  and mobility rungs; reading, focus, breathing and sleep quests stay (M2).
- Reported limitations exclude templates with matching contraindication tags. A ladder closes from its first tagged
  rung up, so nobody climbs past an exercise they shouldn't do.
- Every exercise quest shows "stop if you feel sharp pain, dizziness or chest pain" and an "I felt pain" button.
- The app states it is not medical advice.

### 3.5 Adjusting the day

- Swap: 1 per day (2 for Rogue level 5+), to an alternative for the same stat or a balance quest.
- Hard day: every quest becomes its hard-day version; half XP; the streak counts. Only open core and side quests
  change; completed quests, the article and the recovery quest keep their reward (M2).
- Planned rest: up to 2 days a week (set weekly or at the briefing); beyond that the System suggests fewer minutes.
  "A week" is any 7 consecutive quest days. A planned rest day only protects the streak; its quests stay as a bonus
  (M2).
- Built in M6b (2026-10-11): swap, hard day and rest from Today; a swap replaces the quest in place and the button
  hides when no swap is left or nothing fits. Rest is for today only; planning rest days ahead waits for the morning
  briefing (M7).
- Built in M6c (2026-10-12): a hard-day workout is one set of its first two exercises (7 minutes, half XP), the
  smallest session that keeps the habit. A swap can offer a workout; Second Wind redoes a missed workout with today's
  plan; changing the equipment or program re-plans today's open workout (same rung and reward).
- Built in M7b (2026-10-12): "Rest tomorrow" next to "Rest today", within the same 2-in-7 limit (tomorrow counted
  ahead); that day is a rest day even if the app isn't opened (built as one, or, never opened, rested rather than
  asked about in a check-in). A rest or a pain report tapped without a
  connection still protects its day when it syncs after the day ended (within 48 hours, before the server closed the
  day); when it is too late, Today says so. A weekly rest pattern waits for the pilot's need.

### 3.6 Completion

- Types: tap; in-app timer (complete at ≥ 80% of the target, computed from timestamps, survives the screen being
  off); rep log; one written sentence.
- The client sends `{quest_instance_id, client_event_id, completed_at, payload}`. A Postgres function checks
  ownership and the open window, then awards XP once in one transaction. A repeat returns the same result.
- Offline completions sync later and are accepted up to 48 h after the day closed if `completed_at` falls inside
  the day. On a day the phone built offline, a completion names its quest by day and slot until the server has the day
  (M6e).
- Undo the same day (mis-taps): a reversing ledger entry.

### 3.7 The missed-day check-in

When a closed day's core quest was not done (and no hard-day version or protection applies, and it isn't a streak
day through any 2 quests, §2.4), the next open asks "The day closed. What happened?"

| Answer | Streak | Next |
|---|---|---|
| Sick or injured | paused | lighter tomorrow; injury pauses that ladder |
| Emergency, travel, a brutal day | paused | normal or lighter tomorrow |
| It was too hard | paused | that ladder steps down |
| I need a lighter load | paused | daily minutes drop, plan lightens |
| I just didn't | recovery chance | a 5-minute recovery quest on the day of the check-in: done → streak survives (the missed day doesn't count) + Discipline; skipped → a shield is used; no shield → reset. Opted-in accountability applies only here (§4) |
| (server outage or no quests generated) | paused automatically | not asked |

- Paused days earn no XP and don't grow the streak, so excuses gain nothing; honesty plus a recovery quest earns
  Discipline.
- 3+ recovery quests or 3+ days protected by a check-in answer in 14 → the System offers a lighter plan.
- A dismissed check-in comes back on the next open; the streak stays paused until it is answered, and later days
  are applied to the streak only after it (in quest-day order), so delaying the answer changes nothing, except that
  two missed days in a row share one check-in while the first is unanswered (owner, M3).
- The recovery quest is available until the end of the quest day on which the check-in is answered. A Warrior with
  *Second Wind* available may instead redo the full missed core quest that day for its full XP.
- Built in M7a (2026-10-12): Today asks the question and opens the check-in screen with the five answers; "Sick or
  injured" then asks which (an injury rests that day's core exercise until the player brings it back). The protected
  answers resolve at once. "I just didn't" adds the recovery quest to the day that is running and is settled when that
  day ends: cleared → the streak holds and *Rise Again* counts; else Unbreakable when ready; else a shield; else a
  reset (the best is kept); Today shows how it ended once. "Answer later" hides the question until the app is next
  opened. Away days get one check-in for the whole run; it rests or eases nothing. The lighter plan (minutes one step
  down) is offered at most once every 14 days, whichever way the player answers, and also over the weekly rest limit.

### 3.8 Time zones and the day boundary

- The quest day starts at the player's boundary in the phone's time zone at the moment the day starts.
- A day lasts at least 20 and at most 28 hours (flights, DST); day 1 is the exception below (6 to 30 hours).
- A day is closed once its stored end time has passed, evaluated whenever the server looks at the player's state
  (lazy closing; architecture §4.3). No hourly job is needed.
- Day 1 starts when onboarding ends and runs to the first boundary at least 6 hours away, so a late-night start
  still gets a real day.
- After travel, a day ends at the first boundary at least 20 hours after it starts, capped at 28 hours; the
  boundary re-syncs within a few days.
- M7b: Settings changes when the quest day ends; the change applies from the next day built, which still lasts 20–28
  hours, so a large change arrives over a few days.

## 4. Daily article, accountability and notifications (approved 2026-10-10)

### 4.1 The daily article

**Generation (scheduled, shared library, never per user and never on screen load)**
- A nightly Supabase Cron job writes **2 articles** into a shared library, rotating through about 8 topic clusters:
  discipline and habits, psychology, fitness and movement, sleep and recovery, focus, learning, philosophy,
  history and decision-making. Model: Claude Opus 5.5 (owner's decision).
- Each article is three steps:
  1. **Research:** a call with web search and web fetch returns a structured brief: sources (URL, title) and key
     facts, each fact tied to a source.
  2. **Write:** structured output `{title, summary, reading_minutes, sections[], takeaways[], reflection_question,
     source_ids[]}`, 800–1,200 words (5–7 min), in the house style: manhwa flavour, short sections, a strong opening,
     memorable examples, occasional System commentary, practical lessons.
  3. **Check (code):** the schema is valid; every factual claim's source id exists in the brief; **no quotes
     attributed to real people** (MVP rule); a banned-phrase lint for robotic AI prose.
- Only articles that pass are published. A failure is retried once the next night; readers never see it.
- About 20 **evergreen** articles are generated and owner-reviewed before the pilot; they fill any gap (AI down,
  budget cap hit, nothing unread).
- Original explanations only; never reproduce copyrighted text.

**Assignment**
- When a day is created, it gets one unread published article: about 60% from the player's goals and class,
  40% from other clusters. Stored on the day; never regenerated.
- The app caches a few eligible unread articles so an offline-built day still has one.
- Mage *Insight* (level 5): choose tomorrow's topic from 3.
- The article quest: "read it and write one takeaway" = Wisdom, minor tier (10 XP). It counts as a quest for the
  2-quest streak rule.

**Cost control**
- Every AI call logs model, tokens and cost.
- A hard monthly cap (**$25**) is checked before each call; over the cap the job stops and the evergreen library
  takes over.
- Cost depends on articles per day, not on the number of users.

### 4.2 Onboarding AI

- The **rules** compute every number: class, stat estimates, starting rungs, difficulty, the suggested
  accountability style.
- One Claude call writes the **words**: the narrative, strengths and growth areas, in the chosen voice.
  Structured output, validated; 15 s timeout.
- On failure, a plainer template-written reveal shows the same character.

### 4.3 Accountability (MVP levels 0–2)

- **Off by default.** Enabled through the *Accountability Pact* screen (from Settings, or from the suggestion on
  the reveal). It shows exactly what happens on a miss and previews the Shadow. It applies only from the quest
  day after the one in progress when it is signed, never today's (signed during onboarding, from day 2). Turning it
  off is instant, any time, and never affects progress.
- **Trigger:** only the player's own check-in answer "I just didn't". Never a crash, a failed sync, missing data,
  an unanswered check-in or a missed notification.

| Level | On a confirmed miss |
|---|---|
| 0 | Nothing (default) |
| 1 — The Shadow | A short dark scene; the Shadow claims the day; a creeping shadow mark on the character portrait until the recovery quest is cleared; an optional private "what got in the way?" note |
| 2 — Trial of Stillness | Level 1, plus: on the quest day the check-in is answered, the two side quests stay sealed until a 10-minute in-app focus session is done (the timer pauses when the app leaves the foreground), and that evening brings a second, sterner reminder. The core quest, the recovery quest and the article are never sealed |

- At most one consequence per quest day. After 3 consequences in 7 days, consequences pause and the System offers a
  lighter plan.
- Shadow lines are written in advance and reviewed: ominous, never insulting, never guilt about the player's
  worth, never threatening anything real.
- After the MVP: level 3 (Android app sealing, after the Find X9 spike), level 4 (iOS Screen Time, after Apple's
  entitlement). A whole-phone lock: never.

### 4.4 Notifications (local only in the MVP)

- Morning briefing at the player's chosen time; optional evening reminder if the core quest isn't done (cancelled
  on completion, rescheduled on app open); timer alerts.
- MAINARC's pattern: a pure "plan" function decides which reminders should be pending; one file talks to the OS.
- No exact alarms (a few minutes late is fine), so no `SCHEDULE_EXACT_ALARM`.
- Permission denied: the app works fully; Settings explains what's missing; no nagging.

### 4.5 Privacy

- PAR-Q answers are never stored; only the result ("gentle start recommended").
- Reflection notes are private to the player (RLS).
- Account deletion removes every row and the auth user.
- No ad or tracking SDKs.

## 5. Acceptance criteria (the MVP is done when all of these are verified)

**Onboarding**
- A new player finishes onboarding without signing up; an anonymous user exists afterwards.
- With the AI forced to fail or time out, the reveal still appears with the same rules-computed character.
- Class and assumptions can be corrected on the reveal; corrections persist and change the next generated day.
- A PAR-Q "yes" produces days with only gentle walking and mobility quests (test).
- "Save your character" links Google without losing progress.

**Days and quests**
- Each quest day has exactly 1 core + 2 side quests + 1 article; concurrent requests create one day (database test).
- Generated days respect the minutes budget, recovery rules and contraindication tags (unit tests).
- Every quest card shows its "why"; swap, hard day and planned rest follow the §3.5 limits.
- An offline-built day is accepted on sync when valid and replaced when not (test).

**Completion, XP and progression**
- The completion function has no XP parameter; players cannot insert or update XP, stats, levels or streaks directly
  (database tests).
- A repeated completion returns the same result with one ledger entry; completion outside the window is rejected;
  an offline completion within 48 h is accepted; undo reverses it.
- Level, stat and rank formulas match §2; the 90-day pacing simulation meets the §2.3 targets.
- Ladder step-up/step-down rules match §3.3, including at most one step up per ladder per week (unit tests).

**Streaks and the check-in**
- Every check-in answer produces the §3.7 outcome; an outage day is protected without asking; a dismissed check-in
  leaves the streak paused (unit tests).
- Recovery quests, shields, protected-day limits and the "lighter plan" offers behave as specified.

**Time**
- Day boundaries are correct across time zones, both DST transitions, and travel east and west; days after day 1
  stay within 20–28 hours (unit tests).

**Article**
- The nightly job publishes only articles that pass the §4.1 checks; a failing article is never shown.
- The assignment is stored on the day and never regenerated on load.
- When the cap is reached or nothing is available, the evergreen library is used (test with mocked costs).

**Accountability**
- Off by default; enabling applies only to quest days that start afterwards; disabling is immediate.
- Consequences fire only after "I just didn't"; never on technical failure or an unanswered check-in; at most one
  per day; paused after 3 in 7 days; level 2 never seals the core quest, recovery quest or article (tests).

**Notifications**
- With permission denied the app is fully usable; reminders are cancelled when the core quest is completed.

**Security and privacy**
- RLS on every table: player A can neither read nor write player B's rows (database tests).
- No service-role key or model-provider key in the app bundle or the repo (automated check).
- Account deletion removes every row and the auth user; raw PAR-Q answers are never persisted.

**Device (owner's Oppo Find X9, EAS APK)**
- Onboarding, a full day, an offline completion with later sync, notifications, the largest font setting and
  reduced motion are verified and recorded in `docs/device-verification-checklist.md`.

## 6. Out of scope for the MVP

App blocking (levels 3–4), iOS builds, Health Connect auto-verify, advanced classes and level 15 abilities,
equipment and cosmetics, Hard Mode, seasons and leagues, friends and parties, push notifications from the server,
AI-written briefings or Shadow lines, user-created quests, monetization, light theme, data export.

## 7. Left for Phase 3 (architecture) and Phase 4 (design)

- **Phase 3:** the database schema and RLS, the reward and close-day functions, the rules package layout, the AI
  pipeline details (prompts, effort, retries), offline sync, testing and deployment practice, the Supabase hosting
  choice for the pilot (discovery doc §2).
- **Phase 4:** the visual direction and design system, the onboarding and reveal sequence, the Today, Character and
  Chronicle screens, as a design canvas the owner approves before implementation.
- **Content tasks inside the build plan:** the quest library (~70 templates), ~25 achievements, Shadow lines,
  ~20 evergreen articles, class art.
