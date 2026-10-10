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
