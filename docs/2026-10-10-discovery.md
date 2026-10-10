# LevelMeUp — Phase 1 Discovery

**Date:** 2026-10-10 · **Status:** discovery done, waiting on the owner's answers · **Nothing built yet**

## Plain summary

- The `LevelMeUp` folder was empty. I drafted a project `CLAUDE.md` from your existing Karpathy-style files.
- **Your Supabase "CYOA database" is really the wedding site's backend.** The CYOA game never wired up Supabase
  (it saves on the phone). The only active project, *DNA Wedding*, holds the wedding site's schema and is still used by
  `wedding-site/src`. Wiping it would break the wedding RSVP flow before 30 Jan 2027. I touched nothing.
- **You already built part of this idea once.** MAINARC (formerly KAI, `Hobby Projects/kai`) is a gamified habit app
  with Character 2.0, XP, four stats, streak shields, avatar evolution, a sensei voice and a dark UI, on the same Expo
  stack. We should decide whether this app replaces it.
- **Life Reset's biggest weaknesses are our opening:** a ~55-screen onboarding that ends in a hard paywall, rigid 4 AM
  days, plans that don't adapt, a "to-do list with a skin" RPG, AI-looking art, and a blocker that isn't tied to quests.
- **Device blocking is the riskiest feature** and is a separate native project on each OS. Everything else fits
  Expo + Supabase + the Claude API.
- **Recommended MVP:** Android first. Narrative onboarding → class reveal → daily quests → server-awarded XP and levels →
  fair-failure and recovery → daily article → *in-app* accountability. Real app blocking is the next milestone, after a
  device test on your Find X9.

## 1. What exists already

| Item | Finding | Relevance |
|---|---|---|
| `D:\App Projects\LevelMeUp` | Empty folder, created today. | New repo. Draft `CLAUDE.md` written there. |
| Karpathy `CLAUDE.md`s | `ninety-day` (the original is in `docs/karpathy-CLAUDE.original.md`), `wedding-site`, `stoic-porch`, `reading-companion`. | Adapted into `LevelMeUp/CLAUDE.md`: batched questions with recommendations, device-check checklist, a "never simplify away" list, cost changes proposed first. |
| MAINARC / KAI (`Hobby Projects/kai`) | Expo 57, RN 0.86, expo-router, expo-sqlite + Drizzle, Zustand, Reanimated 4, expo-notifications, react-native-health-connect. Pure-TS engine (streak shields, stages, weekly score). Local only; Supabase sync was planned (M3) but deferred. Last commit 6 Aug 2026. | Same concept family. Reusable: the build setup that works on your Oppo, the notification plan/seam pattern, Health Connect step sync, streak-shield rules, "missed days pause, never destroy". |
| `ninety-day` | Expo 57 calisthenics tracker; EAS APK builds (Expo Go crashes on the Oppo Find X9); exact-alarm settings row; no-truncation UI rules. | Same device constraints apply here. |
| `cyoa-game` (Inkbound) | No Supabase code; saves are local. Has a working manhwa-style art pipeline (local ComfyUI). | The art pipeline can make class portraits. Nothing to migrate from its data. |

## 2. Supabase findings (read-only inspection, CLI v2.118)

- **Active:** *DNA Wedding* (`knlgpcwoaaygncmlnbsm`, DCode Projects org, Pro). Remote migrations = the wedding site's
  three (`schema`, `guest_access`, `grants`). Tables: `admin_emails` (1 row), `invites`, `private_details`, `rsvps`,
  `guest_sessions` (all empty). No storage buckets, no Edge Functions. `wedding-site/src/lib/{supabase,guest,admin,paint}.ts`
  still use it.
- **Paused (INACTIVE):** tn-cranes, DCode Personal Agent, 100DOS, The Stoic Porch (DCode Projects); Pulse; TNCBC Website;
  dannytist-portfolio-blog. Not opened.
- **Nothing in Supabase belongs to the CYOA game.** The CYOA pilot *planned* to wipe and reuse DNA Wedding but never did.

**Recommendation:** leave DNA Wedding alone. Develop against local Supabase in Docker (`supabase start`, as the wedding
site does): $0 and fully testable. Pick cloud hosting when the pilot needs it:

| Option | Cost | Catch |
|---|---|---|
| A. New project in the DCode Projects Pro org (**recommended for launch**) | about $10/month extra compute | None technical. |
| B. Free-org project for the pilot | $0 | Pauses after about a week with no activity; fine while people use it daily. |
| C. Reuse DNA Wedding after the wedding (Feb 2027) | $0 extra | Breaks the wedding site's keepsake phase; delays the pilot. |

## 3. Reference research: Life Reset: 66 Days

Full report: `docs/research/2026-10-10-life-reset-research.md` (evidence-tagged; 599 App Store reviews analysed).

- **Core loop [official]:** a 66-day program; days roll over at a fixed 4 AM; XP feeds a "rating" plus five stats
  (Discipline, Focus, Strength, Confidence, Wisdom); a streak day needs at least 2 tasks; milestones at 7/14/33/66 days.
  Optional Character Mode (boss fights won on completion rate, gear), Hard Mode (miss = back to Day 1), Seasons/leagues,
  a daily rarity card, friends via codes. No XP formulas published.
- **Onboarding [reported, from a teardown]:** about 55 screens: notification prompt at launch, sign-up, pain and
  identity questions, a "Level 1 vs Day 66 potential" reveal, vows plus hold-to-lock-in, then countdown offers and a
  hard paywall. No free tier.
- **Blocker:** a standalone tool, undocumented, *not tied to quests*. Android permissions point to Usage Access + overlay
  + a `specialUse` foreground service; iOS almost certainly Screen Time API [inferred].
- **Weaknesses:** 38% of written reviews are 1-star; 208 of 599 are about price/paywall/trial (avg 1.8★). Also bugs and
  redesign churn (Android worse), rigid time rules that shut out shift workers, shallow RPG, AI-looking art, plans that
  don't adapt, value that fades after the program, ad-tracking SDKs.
- **Worth borrowing:** the 2-task streak rule, opt-in Hard Mode (its fans are the happiest reviewers), habit repair
  instead of punishment, a commitment ritual (without sales pressure), the program as a season with restart/extend, and
  the "current level vs potential" identity hook.

## 4. Platform feasibility

Full report: `docs/research/2026-10-10-platform-feasibility.md` (desk research, 48 sources, nothing device-tested yet).

- **Blocking chosen apps for N minutes is possible on both OSes, but it is a separate native project on each.**
  - **iOS:** Screen Time API (FamilyControls `.individual` + a ManagedSettings shield, iOS 16+). It can start and lift
    a block on schedule with the app closed (15-minute minimum interval). It needs Apple's manual *distribution*
    entitlement (4 requests: app + 3 extensions; days to 6+ weeks). Until approved, testing needs a Mac + Xcode + an
    iPhone. App choices are opaque tokens, so we can't prove the user didn't pick Phone; use only explicitly picked apps.
  - **Android:** no official API. Two routes: an AccessibilityService (fast; what Opal uses; needs a prominent
    disclosure, consent and a Play declaration with a demo video; some blockers were rejected), or Usage Access + overlay
    + a foreground service (slower, more permission screens, killed more often by ColorOS; apparently Life Reset's
    route, which suggests it passes Play review). The Find X9 spike decides. Either needs a local Kotlin Expo module.
    We control the app list, so the dialer, SMS, Settings and launcher can be hard-excluded.
  - **Sideloaded APK gotcha:** Android's "restricted settings" greys out the accessibility toggle until the user allows
    it in App info. Android 17 Advanced Protection revokes it entirely.
- **Nothing runs app code at an exact time in the background on either OS.** Local notifications are the only reliable
  timed mechanism; push (Supabase Cron → Edge Function → Expo Push) is best-effort. A consequence may *remind* via
  notifications but must be *decided* by the server and *enforced* only on confirmed data.
- **Stay on Expo + React Native.** Flutter or full native doesn't remove the native blocking work, and Expo keeps your
  proven Oppo build setup, MAINARC's patterns, Reanimated, Skia/Rive and the official Supabase SDK.

## 5. Biggest risks (ranked)

1. **Scope.** The brief is several products: an RPG engine, an AI content pipeline, two native blockers, and an art
   pipeline. Mitigation: a thin end-to-end MVP, then one milestone at a time.
2. **Device blocking.** Play policy review (Android), Apple's entitlement wait (iOS), ColorOS killing background work,
   restricted settings on sideloaded APKs. Mitigation: a device spike before any promise; in-app accountability first.
3. **Exercise safety.** LLM-written workouts can over-prescribe. Mitigation: workouts come from authored progression
   ladders bounded by the user's level and limitations; the LLM only narrates.
4. **AI article quality and cost.** Fabricated facts or quotes, and costs that scale per user. Mitigation: a shared
   article library generated on a schedule with web research and stored sources; schema checks; a monthly spend cap.
5. **Split effort with MAINARC.** Two apps chasing the same idea. Needs a decision (question 2).
6. **Correctness traps:** time zones, DST, the day boundary, offline completions, duplicate rewards. Solvable with a
   unique quest-instance-per-day constraint, idempotent reward functions and tests, but they must be designed in.
7. **Art production.** Class × gender × evolution-stage portraits in a consistent manhwa style. The Inkbound ComfyUI
   pipeline helps; reviewers punish art that *looks* AI-made, so it needs your eye.
8. **Retention after the novelty.** Life Reset's users drift away after the program. Needs long-term arcs, advanced
   classes and seasons on the roadmap, though not in the MVP.

## 6. Recommended product direction

**Positioning:** the RPG that adapts to you. Real class identity, difficulty that rises when *you* are ready, a fair
system when life happens, and stakes you choose. Useful for free before any paywall.

**The daily loop**
1. The day starts at the user's own boundary (default 4 AM local, adjustable for shift workers; real dates shown).
2. The System briefing: **1 core quest + 2 side quests**, plus the day's article as a Wisdom side quest. The user can
   preview, swap one quest, or pick "hard day" (scaled-down versions, no penalty).
3. Completing is low-friction: one tap, a built-in timer (focus, reading), or a quick log (reps, one insight).
   The server awards XP once.
4. When the day closes with the core quest undone, the next open asks what happened: rest day, sick or injured,
   emergency, too hard, or "I just didn't". Each answer has a fair outcome: a free pass, a scaled-down plan, a streak
   shield, a recovery quest, or (only if the user opted in) a consequence.

**Stats (proposal: five, not six).** Strength, Vitality (endurance, walking, mobility, sleep, recovery; this absorbs
Agility), Wisdom, Focus, and **Discipline, earned only from consistency** (core-quest days, streak milestones), never
from a specific activity. Each quest feeds one primary stat (sometimes a small secondary), so nothing is double-counted.
Agility overlaps Vitality in real activities; keeping both would split the same walks and stretches two ways.

**Classes (proposal: 3 + 1 in the MVP).**

| Class | Primary / secondary | Who it's for | Quest mix |
|---|---|---|---|
| Warrior | Strength / Vitality | wants to get physically stronger | strength ladder, walks, a small daily learning quest |
| Mage | Wisdom / Focus | wants to read, learn, think better | reading, notes, reflection, plus walks and mobility |
| Rogue | Focus / Vitality | fights distraction and procrastination | deep-work timers, phone-free blocks, plus movement |
| **Monk** (new) | Vitality / Wisdom | low energy, poor sleep, stress, or physical limits | sleep routine, mobility, breathing, gentle walks |

The Monk earns its place: none of the other three serves someone whose bottleneck is energy or recovery, and it gives
beginners with limitations the safest path. Ranger (endurance), Guardian and Bard (social/creative) overlap these or
need quest types that are hard to measure; they fit better as **advanced classes** unlocked by a class trial around
level 20, which also solves "evolve beyond your specialization". A class shapes the quest mix, never locks anything.

**Quests:** an authored quest library with *progression ladders* (e.g. wall push-ups → incline → knee → full; reading
5 → 10 → 15 → 20 minutes). A deterministic engine picks the day's quests from class, goals, available time, recent
performance and recovery. It steps up after demonstrated success and steps down after misses or "too hard". The LLM
writes the narrative text (titles, descriptions, briefings), not the sets and reps.

**Daily article:** generated on a schedule into a *shared* library (1–3 a day across topic clusters), with web research
and stored sources. Each user's "today" is an unread article chosen from their interest mix, persisted, never
regenerated on screen load. If the AI is down, users get an evergreen article from the library.

**Accountability ladder (all opt-in, previewed in full before enabling):**

| Level | What | When |
|---|---|---|
| 0 | Nothing (default) | MVP |
| 1 | The Shadow (dark force) appears: ominous, never humiliating; a reflection prompt; a recovery quest; an optional streak-bonus loss | MVP |
| 2 | A focus challenge: e.g. a 10-minute focus session before side quests unlock; reminders | MVP |
| 3 | Android: chosen apps sealed for 15–60 min, essentials hard-excluded, emergency release | after the Find X9 spike |
| 4 | iOS: the same via Screen Time | after Apple's entitlement |
| — | A whole-phone lock | never |

A consequence fires only on a confirmed miss: never on a crash, failed sync, missing data or a missed notification.

## 7. Proposed MVP (Android first)

**In:** narrative onboarding interview (about 10 beats, branching) → AI-written character profile with a rules
fallback → reveal and edit; 4 classes; daily quest generation (library + rules); quest completion with idempotent,
server-side rewards; XP, levels, five stats; streaks with shields (2-quest rule); the fair-failure flow and recovery
quests; the daily article; accountability levels 0–2; local notifications; sign-in, RLS, an offline completion queue;
account and data deletion; a dark theme.

**Later, in rough order:** Android app blocking (level 3) → Health Connect auto-verified walking quests (MAINARC already
has the code) → advanced classes and class trials → equipment/cosmetics → iOS build and Screen Time (level 4) → opt-in
Hard Mode → seasons, friends/parties → monetization → light theme.

## 8. Architecture sketch (for Phase 3; needs your approval)

- **App:** Expo SDK 57 + React Native + expo-router + TypeScript + Reanimated 4 (+ Skia or Rive for effects),
  expo-sqlite for the offline cache and queue, Zustand. EAS APK builds. Same base as MAINARC and ninety-day.
- **Backend:** Supabase Postgres + Auth + RLS. Rewards through a Postgres function (`complete_quest(instance_id,
  client_event_id)`): one transaction, idempotent, server-computed XP. Quest generation in an Edge Function with a
  shared, unit-tested TypeScript rules package; `unique (user_id, quest_day)` stops duplicate days.
- **AI:** Claude API from Edge Functions only (the key never ships in the app). Structured outputs validated with a
  schema, then clamped by code limits. A generation log with tokens and cost, and per-user and monthly caps.
  Supabase Cron runs the nightly article job.
- **Cost (rough, to be measured):** onboarding profile about $0.05 per user; articles about $0.15–0.35 each with
  research on Claude Opus 5.5 (Sonnet 5.5 about half), so 2 a day is roughly $10–25/month regardless of user count;
  quests about $0 (library). This needs a pay-as-you-go Claude API key: a Claude Pro/Max subscription can't power an
  app's backend.

## 9. Open questions

Asked in chat on 2026-10-10 (answers recorded here when given):

1. Who is it for first: a pilot for you and a few friends, a public Play launch, or both stores?
2. What happens to MAINARC: replaced by this app, evolved into it, or kept separate?
3. How far does accountability go in the MVP?
4. The AI budget and model.

Deferred to Phase 2 with a default (say if you disagree): five stats as above; 3 + Monk classes; day boundary 4 AM
adjustable; honor-system completions plus timers (Health Connect auto-verify later); tone picked in onboarding
(mentor / system / questmaster); manhwa art via the Inkbound pipeline; sign-in with Google + email.
