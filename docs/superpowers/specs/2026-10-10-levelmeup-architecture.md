# LevelMeUp — Architecture (Phase 3)

**Date:** 2026-10-10 · **Status:** approved with the owner's decisions (§11); backend changed to the shared DNA Wedding project
**Implements:** `2026-10-10-levelmeup-mvp-design.md` (the MVP spec)

## Plain summary

- **App:** Expo SDK 57 + React Native, the same base that already builds and runs on your Oppo (MAINARC, ninety-day).
- **Backend:** the existing **DNA Wedding** Supabase project (owner's decision, 2026-10-10), in its own
  `levelmeup` schema next to the wedding's `public` tables. $0 extra; Pro, so it never pauses. LevelMeUp gets a
  database role that cannot see the wedding's tables (§12). Development also runs on that live project (owner's
  decision for M3, 2026-10-10): no laptop database.
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

`packages/content` imports only the rules' types (`import type … from '../../rules/src/index.ts'`), which are erased at
runtime, so it has no runtime dependency on the rules; copied side by side as `_shared/rules` and `_shared/content`,
the relative paths still resolve (M2).

## 2. Mobile app

| Concern | Choice | Why |
|---|---|---|
| Framework | Expo SDK 57, React Native 0.86, React 19.2, TypeScript | Current stable (30 Jun 2026); proven on the Find X9 |
| Navigation | expo-router (3 tabs + stacks for onboarding, quest detail, settings) | Same as MAINARC |
| Animation | Reanimated 4 + react-native-svg; Skia only if Phase 4 needs glow/particles | UI-thread animation, reduced-motion path |
| Local data | expo-sqlite, two plain tables (`cache`, `outbox`) | Offline cache and outbox; no ORM for two JSON tables (M4; MAINARC also dropped drizzle-kit's migrator) |
| State | Zustand | Same as MAINARC |
| Supabase | @supabase/supabase-js with the project's publishable key; the session sealed with AES-256-GCM (expo-crypto), the key in expo-secure-store, sealed values in expo-sqlite's key-value store | Official SDK; SecureStore alone holds about 2 KB, less than a session with a linked Google account |
| Notifications | expo-notifications, local only; MAINARC's plan/seam pattern | §4.4 of the spec |
| Builds | EAS cloud: a development client APK (Metro over `--tunnel`) and preview APKs; never Expo Go | Expo Go crashes on the Find X9; local Gradle builds fail on the Windows laptop (paths over 260 characters) |
| Tests | Jest + React Native Testing Library; device checklist | ninety-day's practice |

## 3. Data model (Postgres)

All tables are in the **`levelmeup` schema** (never `public`, which belongs to the wedding site), have RLS enabled,
and reference `auth.users(id) on delete cascade` where they hold player data.

- The schema is **not exposed through the Data API**, so the app can't query it directly; all access goes through
  LevelMeUp's Edge Functions.
- Reads inside those functions run **as the player**: role `lmu_player` with the player's id in
  `request.jwt.claims`, so RLS policies (`user_id = levelmeup.player_id()`) enforce ownership. `lmu_player` can read
  LevelMeUp's tables and none of the project's other data (it can still call the few functions everyone may call,
  such as the wedding's `is_admin()`, which open nothing), so no claims can reach the wedding's data (M3 code review,
  migration 0004).
- Writes go only through the `security definer` functions in migrations 0003–0004 (executable only by
  `lmu_service`). "Server-only" below means exactly that.

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
- M6c (2026-10-12, migration 0009): `profiles` gains `equipment` (a subset of bands, dumbbells, bench, pullup_bar, gym;
  empty for bodyweight) and `program_style` (men, women or none), both server-written (onboarding and the `training`
  event). A workout quest stores its planned exercises in `quest_instances.condition` as a `session` condition (each
  exercise with its range and sets); its log must have exactly that many sets. Workouts done so far (the program day
  of the next one) are counted from completed `session` quests, so no new column is needed.
- M6d (2026-10-12, migration 0010): `profiles` gains `book_started_at` and `books_finished` (a JSON list of at most
  100 finished books, oldest first, each with its title, start and finish as ISO strings, sessions and minutes).
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
`plan_rest`, `checkin`, `pain`, `resume`, `step_down`, `class_change`, `ability`, `accountability_set`,
`provisional_day`. Unknown or invalid events are rejected and reported back; they never partially apply.

M6b (2026-10-11): the adjustments (`swap`, `hard_day`, `plan_rest`, `pain`, `resume`, `step_down`, `class_change`,
`ability`) go through one path: `_shared/adjust.ts` plans the change with the rules from a fresh snapshot (or names
the refusal), and `levelmeup.adjust` (migration 0008) re-checks the version and the guards, writes the change and
records the event. A version conflict plans again (3 tries). `quest_days` gains `swaps_used`, and `protection` gains
`pain` (a day rested after "I felt pain", which never counts as a planned rest day).

M6c (2026-10-12): `training` (equipment and program style, from Settings → Training) joins the adjustments: the
planner stores the setup and re-plans today's open, uncleared workout with it (same rung and reward); after the day
ended only the setup changes. `levelmeup.adjust` (migration 0009) writes it; the table's checks refuse unknown values.

M6d (2026-10-12): `book` (Scholar's Path: a title starts that book, `finished` first records the current one, a null
title sets it aside) joins the adjustments. The planner refuses it below a Mage's level 10, without a book to finish
or set aside, and for the book already being read, and re-drafts today's open reading quests with the new book.
`levelmeup.adjust` (migration 0010) counts the finished book's sessions and minutes from the completed quests that
carried it since it was set.

### 4.2 How a write happens

1. The function reads the player's id **from the verified JWT** (confirmed with Supabase Auth), never from the body.
2. It loads the state it needs and runs the rules package to compute the outcome.
3. It calls one `security definer` SQL function (`complete_quest`, `undo_quest`, `rate_quest`, `advance`, …,
   executable only by `lmu_service`, §12) that, in one transaction: locks the player's character row, re-checks the
   guard conditions (instance not already completed, day still within its window, version unchanged), writes the
   ledger, updates the caches, and records the event.
4. A repeated `client_event_id` returns the stored result without changing anything; the same id for another action
   or quest is refused (`event_reused`).

Concurrency: day creation uses `insert … on conflict do nothing` on `(user_id, quest_day)` and then reads the row,
so two simultaneous requests get the same day. Completions lock the instance row; the ledger's unique keys are the
last line of defence.

### 4.3 Days, time zones and lazy closing

- A day row stores `starts_at` and `ends_at` (absolute times), computed by the rules from the player's boundary and
  the phone's time zone at creation, clamped to 20–28 hours (day 1: 6–30 hours). The server always recomputes them
  with the rules; it never trusts a window from a provisional day built on the phone.
- A day covers `[starts_at, ends_at)` and counts as closed once `now() >= ends_at` (the rules' `isClosed`). Whenever
  `sync` runs, it evaluates closed days in order with the rules' `closedDayResolution`: done, protected (including
  a day protected with `no_quests`), or "check-in due". While a check-in is pending, later days wait for it: a streak
  or protected day is queued (`streak_applied = false`), and once one is queued every later day is too, so answering
  late changes nothing; a missed day right after the pending one widens it (one answer covers the gap).
- The phone always sends its queued events **before** asking for check-ins, so an offline completion is never
  mistaken for a miss. Offline completions are accepted until `ends_at + 48 h`.
- Days the player never opened the app on are "away" days, covered by one gap check-in (spec §2.4).

### 4.4 Authentication

- First launch: anonymous Supabase sign-in (needs a connection at the end of onboarding; answers are kept on the
  phone if offline). *M5: the guest is made at the onboarding's analysis, not at launch, so installs that never finish
  the interview leave no empty guests.*
- "Save your character": email via `updateUser({ email })` with a verification email; Google via identity linking.
  To verify in a spike: whether supabase-js links a native Google ID token to an anonymous user; fallback is the
  browser-based `linkIdentity` flow. Manual linking must be enabled in Auth settings.
  *Owner decision 2026-10-11 (M5): the browser-based flow, not a native ID token. `auth.linkIdentity` (save) and
  `auth.signInWithOAuth` (restore on a new phone) with PKCE, opened with expo-web-browser's `openAuthSessionAsync` and
  redirected to `levelmeup://auth-callback`; the app trades the code for the session. Linking keeps the user id, so
  the character stays put. Google's page shows the shared project's address.*
- Before the public launch (not the pilot): CAPTCHA (Turnstile) on anonymous sign-ins to stop abuse.
- **Shared with the wedding site** (one Auth per project): the user list, anonymous sign-ins (already on), the
  email sender and templates, redirect URLs and providers. LevelMeUp needs three additive changes, each confirmed
  with the owner when its milestone arrives: turn on manual identity linking, add the app's deep-link redirect URL,
  and add the Google provider. None changes how wedding guests or admins sign in.
- **Email:** without a custom SMTP sender, Supabase's built-in sender only mails the project's team members, so
  "save with email" can't reach pilot friends. Pilot: save with Google. Before launch: a custom SMTP sender (e.g.
  Resend's free tier), which also helps the wedding's admin emails.

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
- Offline on a new day (M6e, moved from M4 with the owner's OK on 2026-10-11; until then the app shows "The
  System is preparing your trials" with a retry): the phone builds a provisional day with the rules package and cached state, and sends it as
  a `provisional_day` event. The server accepts it if every quest is allowed by the player's ladder state and slot
  rules (XP always from the server's tables); otherwise it builds its own day and re-maps completions by slot.
- Single device per player in the MVP; a second device just gets the server state on sign-in.
- M6b: the state carries what the phone may offer today (swap options per quest, gentle movement after pain, whether
  rest is allowed, the ready abilities, which quests can step down), computed by the server from the same rules
  (`_shared/today.ts`). An adjustment shows at once by putting the offered quest in its slot; the server's state
  replaces it at the next sync.
- M6d: the state also carries what only Character and Chronicle show, read once per response (`loadHistory`) rather
  than by the planners' snapshot: `calendar` (the last 92 days, newest first, each with its local date in the day's
  own zone and a mark: open, cleared, hard, rest, paused or none), `growth` since day 1, `reading` (the current book's
  sessions and minutes), and the abilities' last use. Achievements arrive in earned order. Today's calendar cell
  follows the phone's own projected day. Offline-built days (`provisional_day`) are M6e.

## 7. Notifications

Local only. A pure `plan()` function (rules package) decides which reminders should exist from settings, today's
state and the clock; one file talks to `expo-notifications`. Re-planned on every app open and after every
completion. No exact alarms.

## 8. Security checklist

- RLS on every table; pgTAP tests prove player A can't read or write player B's rows and players can't write
  server-only tables.
- **Wedding isolation:** LevelMeUp's functions connect as `lmu_service`, which can switch only to `lmu_player`.
  Neither role has any privilege on a wedding table or can become `authenticated`; pgTAP proves it, including with
  claims forged to look like a wedding admin's. The project's own `anon` and `authenticated` users can't reach
  `levelmeup` at all. LevelMeUp's SQL functions pin `search_path = levelmeup, pg_temp`.
- Edge Functions take the player id only from the JWT, which the gateway verifies and Supabase Auth confirms again
  in the function (`_shared/session.ts`); all writes go through the `levelmeup` functions.
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
| Database | pgTAP via `npm run db:test`, on the live project inside transactions that always roll back | RLS, grants, wedding isolation, the write functions' guards, idempotency, cascading deletes |
| Edge Functions | Vitest on the pure server modules (`supabase/tests/unit`); `npm run test:live` against the deployed functions with temporary anonymous players, deleted at the end | event handling, day closing, payload checks, parallel onboarding and completions, cap enforcement, fallbacks |
| App | Jest + React Native Testing Library | outbox, optimistic updates, key screens' states |
| Device | `docs/device-verification-checklist.md` on the Find X9 | the spec §5 device list |

## 10. Environments and deployment

| Stage | Backend | App |
|---|---|---|
| Development | The live DNA Wedding project, `levelmeup` schema (owner's decision for M3, 2026-10-10; no Docker). Tests never leave data behind (§9) | EAS development-client APK on the Find X9 (EAS project `@dannytist.73/levelmeup`), pointed at the live project; Metro reaches it with `npm run app` (`--tunnel`) |
| Pilot | DNA Wedding project, `levelmeup` schema (§12) | EAS preview APK shared with friends (sideloaded) |
| Public launch (later) | Decide: stay in the shared project or move to LevelMeUp's own (§12); Turnstile; custom SMTP | Play closed test (12 testers × 14 days), privacy policy, data-safety form, a web page for account deletion |

## 11. Owner decisions (2026-10-10)

1. **Backend:** the **DNA Wedding** project, in a new `levelmeup` schema (the owner changed this from "a free
   project" on 2026-10-10). $0 extra; Pro plan, so no pausing, a 400 s function limit and daily backups. Creating
   the schema is approved; nothing in the wedding's `public` schema is changed or removed.
2. **GitHub remote:** no preference, so the repo stays local for now. A private remote can be added on request.
3. **Owner tasks, when their milestone arrives:** an Anthropic API key with a monthly spend limit; a Google Cloud
   OAuth client for Google sign-in (needs the app's signing fingerprint from EAS).

## 12. Sharing the DNA Wedding project

The wedding site keeps working exactly as it does. Nothing in `public` is changed or removed, so no backup-and-wipe
is needed. What the two apps share, and how LevelMeUp stays out of the wedding's way:

| Shared thing | How LevelMeUp handles it |
|---|---|
| Database | Everything in the `levelmeup` schema. The schema isn't exposed through the Data API. Functions connect as `lmu_service` (`noinherit`), which can switch only to `lmu_player` for player reads; neither role has any right on a wedding table, and neither can become `authenticated` (DB tests, including forged admin claims). Both can run the wedding's `is_admin()`, which is open to everyone, but its answer opens nothing to them. |
| **Migration history** | The CLI keeps one migration history per project. If LevelMeUp used `supabase db push`, the wedding repo's next push would fail on versions it doesn't know, and vice versa. So LevelMeUp **never uses `db push`** against the project. `npm run db:deploy` applies LevelMeUp's migration files with `supabase db query --linked` and records them in `levelmeup.schema_migrations`, and checks the wedding's history is unchanged afterwards. |
| CLI commands | Every CLI call from LevelMeUp's scripts goes through `scripts/sb.ts`, an allow list: `db query --linked`, deploying or deleting named `lmu-` functions, `LMU_` secrets from an env file, all pinned to this project. It refuses `db push`, `db reset`, `config push`, `migration repair`, `link`, `--prune` and everything else. LevelMeUp has no `config.toml`, so nothing can push its settings over the wedding's. |
| Edge Functions | All names prefixed `lmu-` (`lmu-sync`, `lmu-onboarding`, `lmu-account-delete`, `lmu-articles-tick`), deployed by name. |
| Secrets | Prefixed `LMU_` (e.g. `LMU_ANTHROPIC_API_KEY`, `LMU_DB_URL`). |
| Cron | One job, `lmu-articles-tick`. |
| Storage | One public bucket, `lmu-art` (migration 0007, M6a): the quest pictures (WebP, at most 1 MB each) and their `manifest.json`. The app reads public URLs only; the owner uploads in the dashboard. No storage policy is added, so nothing else in storage changes. |
| Auth | Shared user list and settings; three additive changes (§4.4), each confirmed when needed. A player signing in with an email that is also a wedding admin's would be the same account; harmless, because wedding admin rights come only from `admin_emails`. |
| Compute | Shared Micro instance. Pilot traffic is tiny. On the wedding day (30 Jan 2027), `/live` and `/wall` take priority; the article job can be paused that day if needed. |
| Backups | The Pro plan's daily backups cover both schemas. |

**When the schema is first deployed:** add a short note to `wedding-site/CLAUDE.md`, with the owner's OK, saying
the project also hosts `levelmeup`. Never drop it, and never `migration repair` versions you don't recognise.

**Credentials:** `npm run lmu:password` gives `lmu_service` a random password: Postgres receives only its SCRAM
verifier, and the pooler URL goes straight into the `LMU_DB_URL` secret. Nothing is printed (run 2026-10-10).

**Before the public launch, decide:** stay in the shared project (then the wedding tables get dropped when the
wedding site retires) or move LevelMeUp to its own project. Moving means exporting the `levelmeup` schema and the
LevelMeUp users from the shared user list. That's easy with pilot-sized numbers and harder later, so decide before
launch.

## 13. Spikes before the main build

Results so far: 1 (Metro half) passed in M4: `expo export --platform android` bundles both packages with their `.ts`
import specifiers and Hermes compiles them, with no `metro.config.js`, and Jest loads them too; the Hermes runtime half
is the device self-check (device checklist, M4 row 3). 1 (Deno half) passed in M3: a deployed function imported both packages from `packages/` by
relative path and matched Node's answers, time zones included. 5 passed in M3: `db:deploy` applied 0001–0003 and
the wedding's history stayed `20260928000100/200/300`. 6 passed in M3 as a DB test (real `set role lmu_service` and
`lmu_player` attempts, with forged admin claims, are refused on `public.invites`) and live (the functions log in as
`lmu_service` through the pooler).

1. Shared rules/content packages import in both Metro/Jest and Deno (§1.1).
2. Anonymous → Google linking with supabase-js on Android (§4.4).
3. A Batch request with web search returns usable research for one topic, and its real cost (§5.2).
4. The EAS development client on the Find X9 reaches the laptop's local Supabase over the LAN.
5. The `db:deploy` runner applies a test migration to the shared project through `supabase db query` without
   touching the wedding's migration history. Checked with `supabase migration list` from the wedding repo before
   and after.
6. An Edge Function connected as `lmu_service` reads its schema and is refused on `public.invites`.
