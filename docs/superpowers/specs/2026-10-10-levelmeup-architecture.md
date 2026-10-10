# LevelMeUp — Architecture (Phase 3)

**Date:** 2026-10-10 · **Status:** proposed, awaiting the owner's approval
**Implements:** `2026-10-10-levelmeup-mvp-design.md` (the MVP spec)

## Plain summary

- **App:** Expo SDK 57 + React Native, the same base that already builds and runs on your Oppo (MAINARC, ninety-day).
- **Backend:** one new Supabase project (your DNA Wedding project is not touched). Development runs in Docker on
  the laptop for $0.
- **One rulebook, two places:** the game rules (XP, levels, streaks, ladders, building a day, time zones) are one
  plain TypeScript package. The server uses it as the referee; the phone uses it to show rewards instantly and to
  build a day offline. The server's answer always wins.
- **The phone never writes game state.** It sends events ("I completed quest X") and the server decides the result,
  once, in one database transaction.
- **Articles are made with Claude's Batch API:** it runs in the background, so Supabase's 150-second function limit
  doesn't matter, and it costs half. Estimated about $10/month for 2 articles a day, under the $25 cap.
- **Simplification vs the spec:** days close *lazily* (a day is closed when its stored end time has passed, checked
  whenever the server looks at it) instead of by an hourly job. Same behaviour, one less moving part.

## 1. Repository layout

```
LevelMeUp/
  apps/mobile/               Expo app (expo-router, TypeScript)
  packages/rules/            pure TypeScript game rules, no dependencies; Vitest
  packages/content/          quest library, achievements, Shadow lines, voice text (typed data); Vitest checks
  supabase/
    migrations/              schema, RLS, SQL functions
    tests/                   pgTAP: RLS, functions, idempotency
    functions/               Edge Functions (Deno) + _shared/ (rules and content, see §1.1)
    seed.sql                 sample data for local dev only
  docs/
```

npm workspaces, like MAINARC. One `npm test` runs every suite.

### 1.1 Sharing the rules with Edge Functions

The rules and content packages must import cleanly into both Metro/Jest (the app) and Deno (Edge Functions).
First build task (a spike): prove a module with relative `.ts` imports and no npm dependencies works in both.
Fallback if Deno bundling can't reach `packages/`: a `sync-shared` script copies both packages into
`supabase/functions/_shared/` and a test fails if the copies differ.

## 2. Mobile app

| Concern | Choice | Why |
|---|---|---|
| Framework | Expo SDK 57, React Native 0.86, React 19.2, TypeScript | Current stable (30 Jun 2026); proven on the Find X9 |
| Navigation | expo-router (3 tabs + stacks for onboarding, quest detail, settings) | Same as MAINARC |
| Animation | Reanimated 4 + react-native-svg; Skia only if Phase 4 needs glow/particles | UI-thread animation, reduced-motion path |
| Local data | expo-sqlite + Drizzle | Offline cache and outbox; MAINARC's pattern |
| State | Zustand | Same as MAINARC |
| Supabase | @supabase/supabase-js, session in secure storage | Official SDK |
| Notifications | expo-notifications, local only; MAINARC's plan/seam pattern | §4.4 of the spec |
| Builds | EAS: a development client APK and preview APKs; never Expo Go | Expo Go crashes on the Find X9 |
| Tests | Jest + React Native Testing Library; device checklist | ninety-day's practice |

## 3. Data model (Postgres)

All tables are in `public`, have RLS enabled, and reference `auth.users(id) on delete cascade` where they hold
player data. "Server-only" means no insert/update/delete policy for players: only Edge Functions (service role)
and `security definer` functions write them.

| Table | Purpose | Player access |
|---|---|---|
| `profiles` | name, voice, class, class_changed_at, time zone, day boundary, minutes/day, difficulty, goals, limitation tags, gentle_start flag, own_program flag, reveal text, accountability level and enabled_at, onboarding_completed_at | read own; update only preference columns (column grants): name, voice, minutes/day, difficulty, day boundary, notification prefs |
| `character_state` | one row per player: total XP, level, XP per stat, start points per stat, streak current/best, streak status, shields, ability usage counters, consequence counters | read own; server-only writes |
| `ladder_states` | per player per ladder: rung, completions at rung, recent ratings, last step-up date, paused | read own; server-only |
| `quest_days` | per player per quest day: date, starts_at, ends_at, time zone, day type, status, article_id, provisional flag. `unique (user_id, quest_day)` | read own; server-only |
| `quest_instances` | per day per slot (core, side1, side2, article, recovery): template id, content version, stat(s), tier, **xp snapshot**, hard-day flag, why-text, completed_at, payload, rating. `unique (day_id, slot)` | read own; server-only |
| `xp_ledger` | every XP change: source type (quest, rung, discipline, milestone, undo), source id, stat, amount, client_event_id. `unique (source_type, source_id, stat)`, `unique (client_event_id)` | read own; server-only |
| `events` | every applied phone event: client_event_id (unique), type, payload, result, applied_at | read own; server-only |
| `checkins` | per closed day: answer, private note | read own; server-only |
| `consequences` | per confirmed miss with accountability on: level, status (active, cleared, paused), timestamps | read own; server-only |
| `achievements_earned` | (user, achievement id) primary key, earned_at | read own; server-only |
| `articles` | cluster, title, summary, sections, takeaways, reflection question, minutes, status, evergreen flag | read where status = published; server-only |
| `article_sources` | article id, index, url, title | read for published articles; server-only |
| `article_jobs` | the nightly pipeline's state machine (§5.2) | none |
| `ai_generations` | every Claude call: kind, model, tokens, cost, status, error | none |
| `day_failures` | logged failures to create a player's day (used to auto-protect that day) | none |

- Definitions that never change per player (quest templates, ladders, achievements, Shadow lines, XP tables) live in
  `packages/content` and `packages/rules`, versioned in git and reviewed by the owner. Each quest instance stores a
  snapshot (template id, content version, XP), so a content change never rewrites history.
- Character totals are cached in `character_state` and updated in the same transaction as the ledger, so the
  ledger is the audit trail and the cache is what screens read.

## 4. Server logic

### 4.1 Edge Functions (Deno, JWT required)

| Function | What it does |
|---|---|
| `onboarding` | Takes the interview answers; the rules compute the character; asks Claude (Opus 5.5, low effort, structured output, 12 s server timeout) for the narrative; falls back to template text; writes profile + character + ladder states; returns the reveal. Max 3 calls per player. |
| `sync` | Applies a batch of phone events in order, then returns the player's current state: profile, character, today (creating it if needed), check-ins due, recent days, a few cached articles. The phone's single round trip. |
| `account-delete` | Deletes the auth user (cascade removes everything). |
| `articles-tick` | Called by Supabase Cron every 30 minutes; advances the article pipeline one step (§5.2). Not callable by players. |

Events the phone can send (each with a `client_event_id`): `complete`, `undo`, `rate`, `swap`, `hard_day`,
`plan_rest`, `checkin`, `pain`, `class_change`, `accountability_set`, `provisional_day`. Unknown or invalid events
are rejected and reported back; they never partially apply.

### 4.2 How a write happens

1. The function reads the player's id **from the verified JWT**, never from the body.
2. It loads the state it needs and runs the rules package to compute the outcome.
3. It calls one `security definer` SQL function (`apply_outcome`, executable by the service role only) that, in one
   transaction: locks the affected rows, re-checks the guard conditions (instance not already completed, day still
   within its window, event id not seen), writes the ledger, updates the caches, and records the event.
4. A repeated `client_event_id` returns the stored result without changing anything.

Concurrency: day creation uses `insert … on conflict do nothing` on `(user_id, quest_day)` and then reads the row,
so two simultaneous requests get the same day. Completions lock the instance row; the ledger's unique keys are the
last line of defence.

### 4.3 Days, time zones and lazy closing

- A day row stores `starts_at` and `ends_at` (absolute times), computed by the rules from the player's boundary and
  the phone's time zone at creation, clamped to 20–28 hours.
- A day counts as closed once `now() > ends_at`. Whenever `sync` runs, it evaluates closed days in order: done,
  protected (including any day in `day_failures`), or "check-in due".
- The phone always sends its queued events **before** asking for check-ins, so an offline completion is never
  mistaken for a miss. Offline completions are accepted until `ends_at + 48 h`.
- Days the player never opened the app on are "away" days, covered by one gap check-in (spec §2.4).

### 4.4 Authentication

- First launch: anonymous Supabase sign-in (needs a connection at the end of onboarding; answers are kept on the
  phone if offline).
- "Save your character": email via `updateUser({ email })` with a verification email; Google via identity linking.
  To verify in a spike: whether supabase-js links a native Google ID token to an anonymous user; fallback is the
  browser-based `linkIdentity` flow. Manual linking must be enabled in Auth settings.
- Before the public launch (not the pilot): CAPTCHA (Turnstile) on anonymous sign-ins to stop abuse.

## 5. AI

### 5.1 Rules for every Claude call

- Server-side only; the API key is a Supabase secret.
- Structured outputs, validated with a schema, then checked by code (word counts, source ids, banned phrases).
- Every call is logged in `ai_generations` with tokens and cost; the monthly cap ($25) is checked before every call.
- Model: Claude Opus 5.5 (owner's decision). Effort: low for the onboarding narrative, medium for research and writing,
  tuned by measurement. Refusal fallbacks enabled.
- Prompts live in the repo (`supabase/functions/_shared/prompts/`) next to a written house-style guide.

### 5.2 The article pipeline (Batch API state machine)

`articles-tick` runs every 30 minutes and moves each job one step:

| Step | Action |
|---|---|
| queued | Each night, enough jobs are queued to keep 2 new articles a day (topic rotation, skipping topics with a big unread backlog). |
| research submitted | One batch request per job: web search (max ~5 uses) + web fetch → a structured brief (sources + facts tied to sources). |
| research done | Results collected; brief validated (at least 2 reachable sources). |
| write submitted | One batch request: the article as structured output, from the brief and the style guide. |
| check | Code checks (§4.1 of the spec). Pass → published. Fail → one retry the next night, then failed. |

- Most batches finish within an hour; the 24-hour batch window is long enough because articles go into a library
  ahead of need.
- Cost estimate: about $0.10–0.17 per article plus about $0.05 of web searches → about $10/month for 2 a day.
- Evergreen articles (about 20) are produced by the same pipeline before the pilot and reviewed by the owner.

### 5.3 The onboarding narrative

A normal (not batch) call, because the player is waiting. If it doesn't answer within 12 s, or fails validation, the
template narrative is used; the player never sees an error.

## 6. Offline and sync

- The phone keeps a SQLite cache: profile, character, today, the last 30 days, ladder states, 3 cached unread
  articles, and an **outbox** of events.
- Every action is written to the outbox and applied to the cache immediately (optimistic), using the rules package to
  show the reward. On app foreground or reconnect: flush the outbox through `sync`, then replace the cache with the
  server's state. The server's numbers win.
- Offline on a new day: the phone builds a provisional day with the rules package and cached state, and sends it as
  a `provisional_day` event. The server accepts it if every quest is allowed by the player's ladder state and slot
  rules (XP always from the server's tables); otherwise it builds its own day and re-maps completions by slot.
- Single device per player in the MVP; a second device just gets the server state on sign-in.

## 7. Notifications

Local only. A pure `plan()` function (rules package) decides which reminders should exist from settings, today's
state and the clock; one file talks to `expo-notifications`. Re-planned on every app open and after every
completion. No exact alarms.

## 8. Security checklist

- RLS on every table; pgTAP tests prove player A can't read or write player B's rows and players can't write
  server-only tables.
- Edge Functions take the player id only from the JWT; service-role writes go through `apply_outcome`.
- No service-role key or Anthropic key in the app or the repo (an automated check scans the app bundle and the git
  tree for key patterns).
- Inputs are schema-validated at the Edge Function boundary; text fields have length limits.
- Per-player limits: 3 onboarding calls lifetime, events per `sync` capped, `sync` rate-limited.
- Account deletion: `account-delete` removes the auth user; cascades remove every row (tested).
- PAR-Q answers are evaluated on the phone and in the `onboarding` function and only the flag is stored.

## 9. Testing

| Layer | Tool | Covers |
|---|---|---|
| Rules | Vitest | levels, stats, ranks, ladders, day building, check-in outcomes, streaks/shields, abilities, time zones and DST, the 90-day pacing simulation |
| Content | Vitest | every template valid (ladder, rung, three voices, hard-day link, safety notes), achievements reachable, banned-phrase lint on all player-facing text |
| Database | pgTAP (`supabase test db`) | RLS, column grants, `apply_outcome` guards, idempotency, cascading deletes |
| Edge Functions | Deno tests against local Supabase, Claude mocked | event handling, parallel day creation (10 simultaneous requests → one day), cap enforcement, fallbacks |
| App | Jest + React Native Testing Library | outbox, optimistic updates, key screens' states |
| Device | `docs/device-verification-checklist.md` on the Find X9 | the spec §5 device list |

## 10. Environments and deployment

| Stage | Backend | App |
|---|---|---|
| Development | Local Supabase in Docker (`supabase start`); Claude calls use a dev key with a low cap, or mocks | EAS development-client APK on the Find X9, pointed at the laptop's LAN address |
| Pilot | One cloud Supabase project (§11 decision); migrations via `supabase db push`, functions via `supabase functions deploy`, secrets via `supabase secrets set` | EAS preview APK shared with friends (sideloaded) |
| Public launch (later) | Pro plan; Turnstile; backups | Play closed test (12 testers × 14 days), privacy policy, data-safety form, a web page for account deletion |

## 11. Owner decisions (2026-10-10)

1. **Pilot backend:** a **free** Supabase project for the pilot ($0; pauses after about a week without user
   activity; 150 s function limit, which the Batch design tolerates). Move to the Pro org (about $10/month) before
   the public launch. Creating the project still needs the owner's go-ahead at that milestone.
2. **GitHub remote:** no preference, so the repo stays local for now. A private remote can be added on request.
3. **Owner tasks, when their milestone arrives:** an Anthropic API key with a monthly spend limit; a Google Cloud
   OAuth client for Google sign-in (needs the app's signing fingerprint from EAS).

## 12. Existing Supabase resources

No migration is needed: the new app gets its own project. DNA Wedding stays as it is for the wedding site. When the
wedding site is retired (after February 2027), backing up and deleting that project is a separate decision.

## 13. Spikes before the main build

1. Shared rules/content packages import in both Metro/Jest and Deno (§1.1).
2. Anonymous → Google linking with supabase-js on Android (§4.4).
3. A Batch request with web search returns usable research for one topic, and its real cost (§5.2).
4. The EAS development client on the Find X9 reaches the laptop's local Supabase over the LAN.
