# LevelMeUp — MVP Design Spec

**Date:** 2026-10-10 · **Status:** in progress, written section by section as the owner approves each one
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
5. **Rhythm:** wake and sleep times set the personal day boundary (default 4 AM local; works for shift workers).
6. **Time and difficulty:** minutes per day; gentle, steady or hard.
7. **"When you slip, what helps?"** Suggests an accountability style; nothing activates.
8. **Analysis scene:** one AI call. A rules-based profile is used if it fails or takes longer than 15 s.
9. **Character reveal:** class, stats, strengths, growth areas, starting routine, a short narrative, labelled
   "stats are game estimates". The player can change class and correct wrong assumptions.
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

### 1.4 Screen states

| Screen | Loading | Empty | Error |
|---|---|---|---|
| Onboarding analysis | The System "analysing" scene (max 15 s) | — | Rules-based profile, silently; the reveal still plays |
| Today | Cached quests from the device shown at once; a quiet sync mark | Before the day's quests exist: "The System is preparing your trials" and a retry | Offline: cached quests stay usable; completions queue with a "will sync" mark. Never shown as failure |
| Today: article card | Skeleton card | No article yet: an evergreen article from the library | Same as empty |
| Character | Cached profile | — (always exists after onboarding) | Cached values with a "last synced" time |
| Chronicle | Cached history | Day 1: "Your chronicle begins today" | Cached history with a "last synced" time |
| Settings: account | — | Anonymous: a "save your character" card | Sign-in failure: a plain message; the anonymous progress is kept |

### 1.5 Defaults (owner did not object)

- Sign-in with Google or email; anonymous play until then.
- Honor-system completions plus in-app timers for focus and reading; Health Connect auto-verify after the MVP.
- Class art from the Inkbound manhwa pipeline; a visual design canvas for onboarding and the reveal in Phase 4.

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
- Stat points = start + floor(sqrt(statXP / 10)): fast early, slower later.
- Ranks by stat points: E < 10, D 10–14, C 15–24, B 25–39, A 40–59, S 60+ (about rank C after 3 months of steady
  training in the main stat). Tuned by the simulation.
- XP, levels and stats never decrease.

### 2.2 XP per quest

| Source | XP |
|---|---|
| Minor quest (about 5 min or very easy) | 10 |
| Standard quest (10–20 min) | 20 |
| Major quest (25–45 min) | 30 |
| Hard-day version | half, rounded up (minimum 5); still counts for the streak |
| Reaching a new progression step (ladder rung) | +15 to that stat, once per rung |

The day is capped at 1 core + 2 side quests + the article, so a full day is about 65 XP and a typical day about 45.

### 2.3 Levels

XP to go from level L to L+1 = 30 + 20 × (L − 1). Cumulative XP to reach level N = 30(N−1) + 10(N−1)(N−2).

| Level | Cumulative XP | Steady player | Struggling player |
|---|---|---|---|
| 2 | 30 | day 1 | day 1–2 |
| 5 | 240 | end of week 1 | about week 2 |
| 10 | 990 | about 3 weeks | about day 40 |
| 15 | 2,240 | about 6–7 weeks | — |
| 20 | 3,990 | about 3 months | later, still climbing |

### 2.4 Streaks and shields

- A streak day = the core quest done (any version) **or** any 2 quests done.
- Protected days pause the streak (no growth, no break): planned rest, sick or injured, emergency, travel, or a
  server-side outage (auto-protected, no question asked). More than 3 protected days in 14 → the System offers a
  lighter plan, never a penalty.
- A plain miss: see §3.6 (recovery quest first, then a shield, then a reset).
- Shields: earn 1 per 7 streak days; hold at most 2.
- Away for several days: one check-in covers the gap; the streak waits as "paused" until it is answered.

### 2.5 Classes

| Class | Main / second | Typical day | Level 5 ability | Level 10 ability |
|---|---|---|---|---|
| Warrior | Strength / Vitality | strength ladders, walks, a 5-minute read | Second Wind: once a week, make up a missed core quest the next day for full credit | Unbreakable: once a month, a plain miss doesn't cost a shield |
| Mage | Wisdom / Focus | reading, notes, reflection, plus walks and mobility | Insight: choose tomorrow's article topic from 3 | Scholar's Path: set a book; reading quests track it to the end |
| Rogue | Focus / Vitality | focus sessions, phone-free blocks, hardest task first, plus movement | Shadowstep: 2 swaps a day instead of 1 | Vanish: a planned phone-free block guarded by a timer |
| Monk | Vitality / Wisdom | sleep routine, mobility, breathing, gentle walks | Stillness: one restoration day a week counts for the streak | Dawn Ritual: a morning routine bundle counts as the core quest |

- Quest mix: the core quest trains the main stat on about 4 days a week, the second stat on about 2, and a
  "balance" quest targets the weakest area about once a week. Nothing is locked.
- Class change: at most once every 14 days; level, XP, stats and achievements are kept; abilities follow the new
  class at the current level.
- After the MVP: advanced classes via a 7-day Class Trial at level 20 (Ranger, Paladin, Sage, …), level 15 abilities,
  equipment and cosmetics.

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

### 3.2 Generating a day (deterministic, a pure TypeScript rules package)

1. Day type: normal, planned rest, hard day (chosen at the briefing), or re-entry after time away.
2. Core quest: the class mix from §2.5, with recovery rules (no strength pattern on consecutive days; walking or
   mobility after a strength day).
3. Two side quests: one goal-aligned, one balance. Core + sides fit the player's stated minutes per day.
4. Text: the template's variant in the player's voice.
5. The server creates the day once (`unique (user_id, quest_day, slot)`). A new day opened offline is built on the
   phone with the same package, marked provisional, and checked by the server on sync (slot count, templates
   allowed by the player's ladder state, rewards taken from the server's table).

Every quest card shows **why it was picked** (e.g. "You cleared incline push-ups 3 times, so knee push-ups unlocked").

### 3.3 Progression (performance-based, never calendar-based)

After a completion, one optional tap: Easy / Right (default) / Too hard.

- **Step up** after 3 completions at the rung within 14 days, the last 2 not "too hard"; 2 "easy" ratings step up
  sooner. Difficulty shifts the bar: gentle 4, steady 3, hard 2. At most one step up per ladder per week.
- **Step down** after "too hard" (offered immediately), 2 misses of that ladder in 7 days, or re-entry after
  5+ days away (first session one rung lower).
- **"I felt pain"** pauses that ladder without penalty and swaps in rest or gentle movement; persistent pain → the
  System suggests a professional; resuming starts one rung lower.

### 3.4 Safety

- Onboarding includes the PAR-Q screening. Any "yes" → the gentlest walking and mobility ladders only, plus a
  suggestion to check with a doctor before harder training.
- Reported limitations exclude templates with matching contraindication tags.
- Every exercise quest shows "stop if you feel sharp pain, dizziness or chest pain" and an "I felt pain" button.
- The app states it is not medical advice.

### 3.5 Adjusting the day

- Swap: 1 per day (2 for Rogue level 5+), to an alternative for the same stat or a balance quest.
- Hard day: every quest becomes its hard-day version; half XP; the streak counts.
- Planned rest: up to 2 days a week (set weekly or at the briefing); beyond that the System suggests fewer minutes.

### 3.6 Completion

- Types: tap; in-app timer (complete at ≥ 80% of the target, computed from timestamps, survives the screen being
  off); rep log; one written sentence.
- The client sends `{quest_instance_id, client_event_id, completed_at, payload}`. A Postgres function checks
  ownership and the open window, then awards XP once in one transaction. A repeat returns the same result.
- Offline completions sync later and are accepted up to 48 h after the day closed if `completed_at` falls inside
  the day.
- Undo the same day (mis-taps): a reversing ledger entry.

### 3.7 The missed-day check-in

When a closed day's core quest was not done (and no hard-day version or protection applies), the next open asks
"The day closed. What happened?"

| Answer | Streak | Next |
|---|---|---|
| Sick or injured | paused | lighter tomorrow; injury pauses that ladder |
| Emergency, travel, a brutal day | paused | normal or lighter tomorrow |
| It was too hard | paused | that ladder steps down |
| I need a lighter load | paused | daily minutes drop, plan lightens |
| I just didn't | recovery chance | a 5-minute recovery quest for tomorrow: done → streak survives (the missed day doesn't count) + Discipline; skipped → a shield is used; no shield → reset. Opted-in accountability applies only here (§4) |
| (server outage or no quests generated) | paused automatically | not asked |

- Paused days earn no XP and don't grow the streak, so excuses gain nothing; honesty plus a recovery quest earns
  Discipline.
- 3+ recovery quests or 3+ protected days in 14 → the System offers a lighter plan.
- A dismissed check-in comes back on the next open; the streak stays paused until it is answered.

### 3.8 Time zones and the day boundary

- The quest day starts at the player's boundary in the phone's time zone at the moment the day starts.
- A day lasts at least 20 and at most 28 hours (flights, DST).
- A server job closes days hourly per time zone.
