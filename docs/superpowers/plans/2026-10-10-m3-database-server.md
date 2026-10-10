# M3 — Database and Server, Live on the Shared Project — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put LevelMeUp's database (the `levelmeup` schema) and its server functions live on the DNA Wedding Supabase
project, tested there, without touching anything the wedding site owns.

**Architecture:** Migrations in `supabase/migrations/` are applied by our own `db:deploy` runner through the Supabase
CLI's `db query --linked` (Management API), recorded in `levelmeup.schema_migrations`; never `supabase db push`.
Database tests are pgTAP files run inside transactions that always roll back. Three Deno Edge Functions
(`lmu-onboarding`, `lmu-sync`, `lmu-account-delete`) import `packages/rules` and `packages/content` directly (proved by
the spike below), connect to Postgres as `lmu_service`, read as the player (RLS), and write only through
`security definer` SQL functions that re-check every guard in one transaction. Live tests call the deployed
functions with throwaway anonymous players and delete them afterwards.

**Tech Stack:** Supabase CLI 2.118.0 (dev dependency), Postgres 17 + pgTAP 1.3.3 (inside rolled-back transactions
only), Deno Edge Runtime, `npm:postgres@3.4.9` (postgres.js), `deno` 2.9.6 from npm for `deno check` only, Node 24,
TypeScript ~6.0.3, Vitest ~4.1.11.

**Specs:** MVP spec §2.1–2.4, §3.2, §3.6–3.8, §4.2; architecture §3, §4, §8, §9, §12; roadmap M3 rows and the
"Carried forward" tables.

---

## Plain summary

The owner asked (2026-10-10) to skip the laptop database and build M3 straight on the live Supabase project the
wedding site uses, in its own `levelmeup` schema. That is possible: one Postgres database holds many schemas, and
LevelMeUp's lives next to the wedding's `public` schema without touching it.

M3 creates that schema with the game's tables and safety rules, a database login for LevelMeUp's server that can't
see wedding tables, and three server functions: start a character, sync the day (completing quests, closing days,
building the next day), and delete an account. Everything is tested on the live project: database tests run inside
transactions that are always undone, and server tests use temporary test players that are deleted at the end.

"Reachable" here means reachable by LevelMeUp's server functions. The phone never talks to the tables directly; it
asks the server, so it can't award itself XP.

## What changed from the roadmap

| Roadmap said | Now | Why |
|---|---|---|
| M3 runs on local Supabase in Docker | M3 runs on the live DNA Wedding project | Owner's decision, 2026-10-10 |
| Remote changes wait for M9 | Schema, role, functions and secrets are created in M3 | Same decision; nobody uses LevelMeUp yet |
| pgTAP via `supabase test db` (local) | Our `db:test` runner: pgTAP created inside a transaction that always rolls back | Nothing test-related is ever left in the shared database |
| Edge Function tests against local Supabase | Live tests against the deployed functions with temporary anonymous players | No local stack |
| `sync-shared` copy script as a fallback | Not needed: the spike deployed a function that imports `packages/` directly | Spike result below |
| `day_failures` table | A `protection` column on `quest_days` (`no_quests`) | Same behaviour, one table fewer |

Events move to the milestone whose screens use them (vertical slices): **M3** `complete`, `undo`, `rate`;
**M4** `provisional_day` (with the offline cache); **M6** `swap`, `hard_day`, `plan_rest`, `pain`, `class_change`;
**M7** `checkin`, the recovery quest, Second Wind, Unbreakable and `accountability_set`. M3 already *stores* what those
need (pending check-ins, queued streak days, ability use, achievement counters).

## Spike results (2026-10-10, before this plan)

1. **Rules in the Edge Runtime: passed.** A throwaway `lmu-spike` function imported `packages/rules/src/index.ts` and
   `packages/content/src/index.ts` by relative path; `supabase functions deploy --use-api` uploaded every file (no
   Docker), and the live function returned the same values as Node for `levelForXp(500)`, the 74 templates,
   `canonicalTimeZone('Asia/Calcutta')` and day windows in Manila and New York. Its runtime zone is UTC. Without a
   JWT it returns 401.
2. **The live project (read-only look):** schemas `auth, extensions, graphql, graphql_public, public, realtime,
   storage, supabase_migrations, vault`; no `levelmeup` yet. Wedding tables: `admin_emails, guest_sessions, invites,
   private_details, rsvps`, all with admin-only policies. Wedding migrations `20260928000100/200/300`, local = remote.
   No Edge Functions, no secrets. Extensions installed: `pg_stat_statements, pgcrypto, plpgsql, supabase_vault,
   uuid-ossp`; available: `pgtap 1.3.3, pg_cron, pg_net, pg_jsonschema`. `postgres` holds `authenticated` with
   ADMIN OPTION, so `lmu_service` can be granted `authenticated`.
3. **`supabase db query --linked`** runs a multi-statement file as one transaction and returns the last result set
   that has rows, so `begin; …; select results; rollback;` returns the results and keeps nothing.

## Decisions this plan makes

1. **Live-first development.** The live project is the only backend. Safety rails, all enforced by code:
   - Every CLI call goes through `scripts/sb.ts`, which refuses `db push`, `db reset`, `db pull`, `config push`,
     `migration repair|squash|up|down`, `functions delete` of anything not named `lmu-*`, `functions deploy --prune`,
     `secrets set|unset` of names not starting `LMU_`, and `link` (we pass `--project-ref`, so the wedding repo's link
     is never changed).
   - A migration lint test fails if a migration mentions `public.`, `drop schema`, `drop role` (other than
     `lmu_service` in a down note), `commit`, or creates anything outside `levelmeup` except the `lmu_service` role.
   - A DB-test lint fails if a test file contains `begin`, `commit`, `rollback`, `savepoint` or `end;` at statement
     level, so a test can never escape its transaction.
2. **`lmu_service`** is `nologin noinherit` until its password script runs; it has `usage` on `levelmeup`, `execute`
   on the write functions, and `lmu_player` **with inherit false, set true**, so it gets player rights only after
   `set local role lmu_player` with the player's claims. *(Code review, migration 0004: it first held
   `authenticated`, which would have let it act as any user of the shared project, wedding admins included.)*
   DB tests prove neither role has a privilege on any wedding table, even with forged admin claims.
3. **Password handling.** `scripts/lmu-service-password.ts` generates a random password, sends Postgres only its
   SCRAM-SHA-256 verifier (`alter role … password 'SCRAM-SHA-256$4096:…'`, so the plain password never reaches SQL
   logs), stores `LMU_DB_URL` (transaction pooler, port 6543, user `lmu_service.<ref>`) with `supabase secrets set
   --env-file` from a temporary file that is deleted, and prints nothing secret.
4. **Derived numbers are never stored.** `character_state` stores stat XP and start points; level, stat points,
   ranks and total XP shown to the player are computed by the rules on read (`total_xp` is a generated column for
   convenience). No cached level can drift.
5. **One version counter per player.** Every write function bumps `character_state.version`; `advance` (closing days
   and creating the next one) takes the version it read and fails with `lmu:conflict` if anything changed, and the
   function retries (3 tries, then 503 `busy`). This closes the race where a completion lands between reading a day
   and closing it.
6. **Closing days (lazy, architecture §4.3).** Only `lmu-sync` closes days, after the batch's events are applied, so
   an offline completion always lands before its day closes. At close: ladder completions and misses (only for
   quests built at the ladder's current rung, with the final rating, default `right`), rung bonuses (+15, once per
   rung, ledger key `rung:<ladder>:<rung>`), Discipline +5 if the core was done, the streak via `closedDayResolution`
   and `applyDay`. While a check-in is pending, later days store their resolution with `streak_applied = false`
   (applied in order when M7 answers the check-in). Away days (no day row) are one gap check-in. The first day back
   after 5+ days away is light and its ladders get `recordReentry`.
7. **Completions** (spec §3.6): accepted if `acceptsCompletion` holds and the day is still open; tap needs nothing,
   timer needs segments with `elapsedMs` (clamped to the day and to the time received) ≥ 80 % of the target, reps
   need 1–20 set counts of 0–999 with at least one above 0, text needs 1–280 characters after trimming. The XP is the
   instance's snapshot. **Undo** works until the day ends and reverses that exact snapshot (owner question 1).
8. **Onboarding input (M3 version).** `lmu-onboarding` takes the finished choices (name, voice, goals, class,
   estimates, minutes, difficulty, boundary, time zone, limitations, safety-check flag, own-program flag); the rules
   clamp estimates to 3–8 and add the class bonus. M5 replaces class and estimates with the raw interview answers
   once the interview mapping is designed. The reveal's words come from Claude only when `LMU_ANTHROPIC_API_KEY`
   exists (not yet: owner task); otherwise, and on any failure or after 12 s, a template reveal. At most 3 Claude
   calls per player, enforced in SQL.
9. **Account deletion (M3 version).** Deletes every LevelMeUp row, then deletes the sign-in only when it had a
   LevelMeUp character and Auth says it is still anonymous (a wedding guest's anonymous sign-in is never touched). A signed-in (Google-linked) player may share the sign-in with the wedding site; what to do there is owner
   question 2, needed by M7. In M3 every player is anonymous.
10. **JWT handling.** The gateway verifies the JWT (`verify_jwt = true`; the CLI guard refuses `--no-verify-jwt`);
    the function also requires `role = authenticated`, a UUID `sub` and an unexpired `exp`, then confirms the session
    with Supabase Auth (`/auth/v1/user`), and takes the player id only from there. The anon key is refused (403); a
    deleted player's token is refused at once (401 `session_ended`).
11. **Achievement counters start now.** `quests_cleared` moves with completions and undos; hard days cleared,
    comebacks and the best rank update at close; earned achievements are stored when `newAchievements` reports them.
    Showing them is M6.

## Owner questions (answers needed by the milestone shown; recommendations in bold)

1. (M3, needed now) Can undoing a same-day mis-tap take back a level-up it caused? **Yes: it corrects an error; it
   isn't a penalty.** The level-up screen should then not have been celebrated, so M6 shows level-ups after a short
   delay.
2. (M7) Deleting a signed-in account that the wedding site may share: **delete all LevelMeUp data and keep the
   sign-in**, and say so on the delete screen. The alternative deletes the sign-in too, which would also sign a wedding
   admin out of the wedding site if they used the same Google account.
3. (M3, needed now) Testing on the live project: **pgTAP inside transactions that always roll back, plus up to 6
   temporary anonymous players per live test run, deleted at the end.** Claude Code's safety screen blocks writes to
   the live database until the owner allows them (see "Permissions" below).

## Permissions the build needs

Claude Code blocked the first rolled-back test transaction on the live database, as it should for a production
write. To build M3 live, the owner allows these commands in this repo (or approves each when asked):

- `npx supabase db query --linked --project-ref knlgpcwoaaygncmlnbsm …` through `npm run db:deploy` and
  `npm run db:test` (migrations and rolled-back tests);
- `npx supabase functions deploy lmu-… --project-ref knlgpcwoaaygncmlnbsm --use-api` and `functions delete lmu-spike`;
- `npx supabase secrets set --env-file … --project-ref knlgpcwoaaygncmlnbsm` (only `LMU_` names);
- `npm run test:live` (creates and deletes temporary anonymous players through the public Auth API).

## File map

```
package.json                       workspaces += "supabase"; scripts db:deploy, db:test, test:live, deploy:functions
scripts/
  sb.ts                            the only way scripts call the Supabase CLI; refuses dangerous subcommands
  db-deploy.ts                     applies pending migrations, records them in levelmeup.schema_migrations
  db-test.ts                       runs supabase/tests/db/*.sql inside rolled-back transactions, parses TAP
  lmu-service-password.ts          one-time: lmu_service password (SCRAM verifier) + LMU_DB_URL secret
  lib/                             pure helpers the scripts share (tested): guard, plan, tap parsing, scram
supabase/
  package.json                     @levelmeup/server workspace: vitest (unit + lint), live tests, deno check
  deno.check.json                  `deno check` settings only (the deploy uses the CLI's defaults: verify_jwt = true)
  migrations/
    0001_levelmeup_schema.sql      schema, schema_migrations, lmu_service, base grants
    0002_player_tables.sql         tables, RLS, read policies, grants
    0003_write_functions.sql       security definer write functions
  tests/
    db/*.sql                       pgTAP test functions (lmu_test.test_*) — no transaction control inside
    unit/*.test.ts                 Vitest: scripts/lib, _shared pure modules, migration and test lints
    live/*.test.ts                 Vitest: the deployed functions (npm run test:live only)
  functions/
    _shared/                       http, auth, db (postgres.js), state, advance, events, onboarding, claude
    lmu-onboarding/index.ts
    lmu-sync/index.ts
    lmu-account-delete/index.ts
```

## Data model (migration 0002)

All in `levelmeup`, RLS on everywhere, `user_id … references auth.users(id) on delete cascade`.

```sql
profiles (
  user_id uuid primary key,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  voice text not null check (voice in ('mentor','system','questmaster')),
  class_id text not null check (class_id in ('warrior','mage','rogue','monk')),
  class_changed_at timestamptz,
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  boundary_minutes int not null default 240 check (boundary_minutes between 0 and 1439),
  minutes_per_day int not null check (minutes_per_day in (10,15,25,40)),
  difficulty text not null check (difficulty in ('gentle','steady','hard')),
  goals text[] not null check (cardinality(goals) between 1 and 2
                              and goals <@ array['body','energy','learn','focus','routine']),
  limitations text[] not null default '{}' check (limitations <@ array['knee','back','shoulder','wrist']),
  gentle_start boolean not null default false,
  own_program boolean not null default false,
  book text check (char_length(book) <= 120),
  reveal jsonb not null,
  accountability_level smallint not null default 0 check (accountability_level between 0 and 2),
  accountability_enabled_at timestamptz,
  created_at timestamptz not null default now()
)
character_state (
  user_id uuid primary key,
  start_strength/vitality/wisdom/focus/discipline smallint not null check (… between 3 and 10),
  xp_strength/vitality/wisdom/focus/discipline int not null default 0 check (… >= 0),
  total_xp int generated always as (sum of the five) stored,
  streak_current int not null default 0, streak_best int not null default 0,
  shields smallint not null default 0 check (shields between 0 and 2),
  awaiting_checkin boolean not null default false,
  quests_cleared int not null default 0, hard_days_cleared int not null default 0,
  comebacks int not null default 0, recoveries_cleared int not null default 0, articles_read int not null default 0,
  ability_last_used jsonb not null default '{}',   -- ability id -> quest day number (M6/M7 write it)
  version int not null default 0,
  updated_at timestamptz not null default now()
)
ladder_states (user_id uuid, ladder_id text, state jsonb not null, updated_at timestamptz,
               primary key (user_id, ladder_id))
quest_days (
  id bigint generated always as identity primary key, user_id uuid not null,
  day_number int not null check (day_number >= 1),
  starts_at timestamptz not null, ends_at timestamptz not null, check (ends_at > starts_at),
  time_zone text not null, budget smallint not null, light boolean not null, comeback boolean not null default false,
  hard_day boolean not null default false, article_id text,
  protection text check (protection in ('planned_rest','outage','no_quests')),
  status text not null default 'open' check (status in ('open','closed')),
  resolution text check (resolution in ('streak_day','protected','awaiting_checkin')),
  streak_applied boolean not null default false,
  content_version int not null, closed_at timestamptz, created_at timestamptz not null default now(),
  unique (user_id, day_number)
)
quest_instances (
  id bigint generated always as identity primary key,
  day_id bigint not null references levelmeup.quest_days on delete cascade, user_id uuid not null,
  slot text not null check (slot in ('core','side1','side2','article','recovery')),
  template_id text not null, ladder_id text, rung smallint,
  stat text not null, tier text not null check (tier in ('minor','standard','major')),
  minutes smallint not null, completion text not null check (completion in ('tap','timer','reps','text')),
  condition jsonb not null, hard_day boolean not null default false,
  xp jsonb not null, why jsonb not null, book text,
  completed_at timestamptz, completion_event uuid, rating text check (rating in ('easy','right','too_hard')),
  payload jsonb, unique (day_id, slot)
)
xp_ledger (
  id bigint generated always as identity primary key, user_id uuid not null,
  source_type text not null check (source_type in ('quest','undo','rung','discipline','milestone')),
  source_id text not null, stat text not null check (stat in ('strength','vitality','wisdom','focus','discipline')),
  amount int not null check (amount <> 0), instance_id bigint, created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id, stat)
)
events (user_id uuid not null, client_event_id uuid not null, type text not null, payload jsonb not null,
        result jsonb not null, applied_at timestamptz not null default now(), primary key (user_id, client_event_id))
checkins (
  id bigint generated always as identity primary key, user_id uuid not null,
  day_id bigint references levelmeup.quest_days on delete cascade,   -- a missed day …
  gap_from int, gap_to int,                                           -- … or away days
  check ((day_id is not null) <> (gap_from is not null and gap_to >= gap_from)),
  answer text, note text check (char_length(note) <= 500), answered_at timestamptz,
  created_at timestamptz not null default now()
)
achievements_earned (user_id uuid, achievement_id text, earned_at timestamptz not null default now(),
                     primary key (user_id, achievement_id))
ai_generations (id bigint generated always as identity primary key, user_id uuid, kind text not null,
                model text not null, status text not null check (status in ('pending','ok','failed','fallback')),
                input_tokens int, output_tokens int, cost_usd numeric(10,6), error text,
                created_at timestamptz not null default now())
```

Player access: `select` on every table except `ai_generations` and `schema_migrations` to `authenticated`, with a
policy `user_id = (select auth.uid())`. No insert, update or delete grants for anyone. The schema is not in the Data
API's exposed schemas, so these grants are used only by `lmu_service` after `set local role authenticated`.

## Write functions (migration 0003)

All `security definer`, owner `postgres`, `set search_path = levelmeup, pg_temp`, `revoke execute … from public,
anon, authenticated`, `grant execute … to lmu_service`. Errors are `raise exception 'lmu:<code>'`; the server maps
codes to event rejections. Every function except `delete_player` bumps `character_state.version`.

| Function | Does | Guards (each a tested error code) |
|---|---|---|
| `start_player(p_user, p_profile jsonb, p_character jsonb, p_ladders jsonb, p_day jsonb) → jsonb` | inserts profile, character, ladder states, day 1 and its quests | `already_started` |
| `reserve_ai_call(p_user, p_kind, p_model, p_cap) → bigint` / `finish_ai_call(p_id, p_status, tokens…, p_error)` | the 3-call onboarding cap, under an advisory lock | `ai_cap` |
| `complete_quest(p_user, p_event uuid, p_instance bigint, p_completed_at timestamptz, p_rating text, p_payload jsonb) → jsonb` | same event → stored result; else marks the instance, writes ledger rows from the snapshot (`quest`, key = event id), adds stat XP, `quests_cleared + 1`, stores the event | `not_found` (missing or another player's), `already_completed`, `day_closed`, `outside_day`, `too_late` (> ends_at + 48 h), `future` (> now + 5 min) |
| `undo_quest(p_user, p_event, p_instance) → jsonb` | reverses the snapshot (`undo`, key = event id), clears completion, `quests_cleared − 1` | `not_found`, `not_completed`, `day_closed` (also after ends_at) |
| `rate_quest(p_user, p_event, p_instance, p_rating) → jsonb` | sets the rating | `not_found`, `not_completed`, `day_closed`, `bad_rating` |
| `advance(p_user, p_version int, p_outcome jsonb) → jsonb` | closes days, records a gap check-in, upserts ladder states, writes rung/discipline/milestone ledger rows, sets streak fields and counters, creates the next day and its quests | `conflict` (version), `not_open`, `not_ended`, `out_of_order`, `day_exists`, `overlap`, `bad_ledger` |
| `award_achievements(p_user, p_ids text[]) → int` | stores earned achievements (once each) | — |
| `delete_player(p_user) → jsonb` | deletes every LevelMeUp row of the player, returns counts | — |

`p_outcome` shape (built by `_shared/advance.ts`, validated in SQL by the guards above):

```ts
type Outcome = {
  close: { dayId: number; resolution: 'streak_day' | 'protected' | 'awaiting_checkin'; streakApplied: boolean;
           checkin: boolean }[];
  gap: { from: number; to: number } | null;              // away days → one pending check-in
  ladders: Record<string, LadderState>;                   // final states after all closes and re-entry
  ledger: { sourceType: 'rung' | 'discipline' | 'milestone'; sourceId: string; stat: Stat; amount: number }[];
  streak: StreakState;
  counters: { hardDaysCleared: number; comebacks: number };   // increments
  newDay: { dayNumber: number; startsAt: string; endsAt: string; timeZone: string; budget: number; light: boolean;
            comeback: boolean; protection: 'no_quests' | null; contentVersion: number;
            quests: InstanceDraft[] } | null;
};
```

## Server code (`supabase/functions/_shared/`)

Pure modules (no Deno or npm imports, tested by Vitest in Node):

- `http.ts`: `json(status, body)`, `problem(status, code, detail?)`, body size limit 64 KB, `readJson(req)`.
- `auth.ts`: `playerFromAuthHeader(header, nowMs) → { userId, anonymous } | Problem` (decodes the gateway-verified
  JWT; requires `role = authenticated`, UUID `sub`, `exp` in the future).
- `state.ts`: row types; `toProfile(rows) → PlayerProfile`; `characterView(row) → { level, levelProgress, totalXp,
  stats: { points, rank, xp, toNext } per stat, streak }`; `pastDays(days, instances) → PastDay[]`;
  `ladderMap(rows)`.
- `advance.ts`: `planAdvance(snapshot, nowMs, timeZone) → Outcome | null` — closes every ended open day in order,
  detects away days, builds the new day with `buildDay` (`light` on day 1, after 5+ days away; `no_quests`
  protection if building throws), applies `recordReentry` after 5+ days away; never builds more than one new day.
- `events.ts`: `parseEvents(body) → { events, rejected }` (max 50 per sync, unknown types rejected),
  `checkCompletion(instance, day, event, receivedAt) → null | code` (spec §3.6 rules in decision 7).
- `onboarding.ts`: `parseOnboarding(body) → choices | Problem`; `startOutcome(choices, nowMs) → start_player
  arguments` (day 1 via `firstDayWindow`, light, all ladders at rung 0); `templateReveal(choices) → Reveal`;
  `parseReveal(json) → Reveal | null` (schema + lint: lengths, banned phrases via `lintText`).

I/O modules (Deno only, type-checked with `deno check`):

- `db.ts`: one `postgres(LMU_DB_URL, { prepare: false, max: 3 })` per isolate; `withPlayer(userId, fn)` runs `fn`
  in a transaction with `set local role authenticated` + `request.jwt.claims`, then `reset role` before calling
  write functions; `lmuError(e) → code | null`.
- `claude.ts`: `writeReveal(choices, signal)` — Messages API with structured output, model `claude-opus-5-5`,
  12 s abort; returns null when `LMU_ANTHROPIC_API_KEY` is missing (always, until the owner adds the key).

Functions:

- `lmu-onboarding` (POST): auth → parse → reserve AI call (if key) → reveal (Claude or template) → `start_player`
  → `{ reveal, state }`. A second call after success → 409 `already_started`.
- `lmu-sync` (POST `{ timeZone, events: [...] }`): auth → canonicalise zone → apply events in order (each
  independently; results `{ id, ok, result | code }`) → `planAdvance` + `advance` (retry on conflict) →
  achievements → `{ results, state: { profile, character, today, checkinsDue, recentDays } }`. 404
  `not_started` before onboarding.
- `lmu-account-delete` (POST `{ confirm: "DELETE" }`): auth → `delete_player` → asks Auth (admin API, service role
  from the function's environment) whether the player is still anonymous, and only then deletes the sign-in →
  `{ deleted: counts, signIn: 'deleted' | 'kept' }`.

---

### Task 1: Branch, workspace and the CLI guard

**Files:** Create `scripts/sb.ts`, `scripts/lib/guard.ts`, `supabase/package.json`, `supabase/vitest.config.ts`,
`supabase/tsconfig.json`, `supabase/tests/unit/guard.test.ts`; Modify `package.json`, `.gitignore`.

- [ ] Branch `m3-database-server` from main (done 2026-10-10); add `supabase/.temp/` to `.gitignore`; pin
  `supabase` 2.118.0 as a root dev dependency.
- [ ] Write `guard.test.ts` first: `checkCliArgs(args)` returns null for `db query --linked --project-ref R -f x`,
  `functions deploy lmu-sync --project-ref R --use-api`, `secrets set --env-file f --project-ref R` (the guard reads
  the file and allows only `LMU_` names), `functions delete lmu-spike`, `projects api-keys`, `migration list`; and a
  refusal reason for `db push`, `db reset --linked`, `db pull`, `config push`, `migration repair`, `link`,
  `functions deploy --prune`, `functions deploy sign-upload`, `functions delete sign-upload`, `secrets set
  FOO=bar`, `secrets unset SUPABASE_URL`, any call without `--project-ref knlgpcwoaaygncmlnbsm` that talks to the
  project. Run: FAIL (module missing).
- [ ] Implement `scripts/lib/guard.ts` (pure) and `scripts/sb.ts` (spawns `npx --no-install supabase` with the
  checked args, `--agent no`; filters the "new version available" lines). Run: PASS.
- [ ] Commit `chore(m3): workspace, CLI guard`.

### Task 2: Migration and test lints

**Files:** Create `supabase/tests/unit/migrations-lint.test.ts`.

- [ ] Tests over every `supabase/migrations/*.sql` (comments stripped): file names match `^\d{4}_[a-z0-9_]+\.sql$`
  and are consecutive; no `public.`; no `drop schema`; no `commit|rollback|begin|savepoint` statements; every
  `create table|function|policy|index|type|sequence|view` names `levelmeup.`; the only `create role` is
  `lmu_service`; every `security definer` function also has `set search_path = levelmeup, pg_temp`.
- [ ] Tests over every `supabase/tests/db/*.sql`: no transaction control; every function created is
  `lmu_test.test_*`.
- [ ] Run with no files yet: PASS (vacuously) — then each later migration keeps them green. Commit.

### Task 3: The deploy runner

**Files:** Create `scripts/lib/migrations.ts`, `scripts/db-deploy.ts`, `supabase/tests/unit/migrations.test.ts`.

- [ ] Tests first for `planMigrations(local: {version, sql}[], applied: {version, checksum}[])`: all pending when
  nothing applied; skips applied with equal checksum; throws on a changed checksum ("never edit an applied
  migration"); throws on an applied version missing locally; keeps order. `wrapMigration(m)` →
  `begin;\n<sql>\ninsert into levelmeup.schema_migrations (version, checksum) values (…);\ncommit;` with the
  checksum as sha256 hex. FAIL → implement → PASS.
- [ ] `db-deploy.ts`: reads applied versions (`select … from levelmeup.schema_migrations` if
  `to_regclass('levelmeup.schema_migrations')` exists), prints the plan, `--dry-run` stops there, otherwise applies
  each pending migration with `sb.ts db query --linked --project-ref R -f <tmp>` and stops at the first error.
- [ ] Commit.

### Task 4: The DB test runner

**Files:** Create `scripts/lib/tap.ts`, `scripts/db-test.ts`, `supabase/tests/unit/tap.test.ts`.

- [ ] Tests first for `wrapTestFile(sql)` (→ `begin; create extension if not exists pgtap with schema extensions;
  create schema lmu_test; set local search_path = lmu_test, extensions, public; <sql>; select * from
  runtests('lmu_test'::name, '^test'); rollback;`) and `parseTap(rows)` (counts ok / not ok, keeps diagnostics,
  fails on a missing or mismatched plan line).
- [ ] `db-test.ts`: records whether `pgtap` and `lmu_test` exist before, runs each file, prints a summary, then
  checks that `lmu_test` doesn't exist and `pgtap`'s presence is unchanged (proves the rollback); exit 1 on any
  failure.
- [ ] Commit.

### Task 5: Migration 0001 — schema and role

**Files:** Create `supabase/migrations/0001_levelmeup_schema.sql`, `supabase/tests/db/isolation.sql`.

- [ ] `isolation.sql` tests: schema `levelmeup` exists and is owned by `postgres`; `lmu_service` exists, can't log in
  yet (until Task 8), is `noinherit`; `has_table_privilege('lmu_service', t, p)` is false for every
  table in `public` and every privilege; `lmu_service` can `set role authenticated` but doesn't inherit it;
  `anon` has no `usage` on `levelmeup`; `schema_migrations` lists `0001`.
- [ ] Migration as in "Data model": `create schema levelmeup`; comment ("shared project: never drop"); `revoke all
  on schema levelmeup from public`; `schema_migrations` with RLS on; `create role lmu_service nologin noinherit`;
  `grant usage on schema levelmeup to lmu_service, authenticated`; `grant authenticated to lmu_service with inherit
  false, set true`; `alter default privileges in schema levelmeup revoke execute on functions from public`.
- [ ] Lints PASS. (Applied live in Task 8.) Commit.

### Task 6: Migration 0002 — player tables

**Files:** Create `supabase/migrations/0002_player_tables.sql`, `supabase/tests/db/tables.sql`.

- [ ] `tables.sql` tests (two players A and B inserted into `auth.users` inside the transaction): every table has
  RLS on; as A (`set local role authenticated` + claims) each table shows only A's rows; `anon` sees nothing and
  can't `usage` the schema; `authenticated` has no insert/update/delete on any table; check constraints reject a
  bad voice, a third goal, 30 minutes, a negative XP, a day ending before it starts; `unique (user_id, day_number)`;
  deleting A from `auth.users` removes all of A's rows and none of B's.
- [ ] Migration per "Data model" + policies + grants. Commit.

### Task 7: Migration 0003 — write functions

**Files:** Create `supabase/migrations/0003_write_functions.sql`, `supabase/tests/db/functions.sql`.

- [ ] `functions.sql` tests, one `test_*` per row of the write-function table: each happy path and each error
  code; `complete_quest` twice with the same event → identical result, one ledger row; a second event on the same
  instance → `already_completed`; B completing A's instance → `not_found`; a completion stamped before the day,
  after the day, 49 h late, 10 min in the future → its code; `undo` → XP back to before, `quests_cleared` back;
  `advance` with a stale version → `conflict`, on a not-ended day → `not_ended`, creating day 3 while day 2 is open →
  `out_of_order`; rung bonus ledger key is unique (a repeat `advance` can't pay it twice); `authenticated` and `anon`
  can't execute any function; functions run with `search_path = levelmeup, pg_temp`.
- [ ] Implement the functions. Commit.

### Task 8: Live: deploy, test, isolate (needs the owner's permission)

- [ ] `npm run db:deploy -- --dry-run` → lists 0001–0003. Record `npx supabase migration list --linked` from
  `wedding-site` (before).
- [ ] `npm run db:deploy` → 3 applied. `npm run db:test` → all pass, residue check passes.
- [ ] Wedding migration list (after) is identical; `supabase db query` shows `public` unchanged (same 5 tables,
  same policies).
- [ ] `npm run lmu:password` (script per decision 3). Spike 6: redeploy `lmu-spike` to connect with `LMU_DB_URL`,
  select from `levelmeup.schema_migrations` (works) and from `public.invites` (refused, 42501); then delete
  `lmu-spike`.
- [ ] Commit (scripts only; no secrets in git — a test scans the tree for key patterns: `eyJ`, `sb_secret_`,
  `postgres://…:…@`).

### Task 9: Shared pure modules

**Files:** Create `supabase/functions/_shared/{http,auth,state,events,onboarding,advance}.ts` and their tests in
`supabase/tests/unit/`.

- [ ] `auth`: a valid player token → id; anon key → `not_player`; expired → `expired`; malformed → `bad_token`.
- [ ] `events`: 51 events → `too_many`; unknown type rejected, others kept; each completion rule of decision 7
  (tap, timer at 79 % and 80 % with overlapping and out-of-day segments, reps, text) and each window code.
- [ ] `onboarding`: valid choices → `start_player` arguments with estimates clamped and the class bonus; day 1
  window per `firstDayWindow` (late night → ≥ 6 h); bad name, three goals, unknown zone → problems; template
  reveal passes `lintText` in all three voices; `parseReveal` rejects missing fields, long text, banned phrases.
- [ ] `advance` (the core; fixtures built with the real library):
  - nothing ended → `null`;
  - day 1 ended, core done → streak 1, Discipline +5, ladder completion recorded at the built rung, day 2 built
    (not light);
  - day ended with 2 side quests and no core → streak day, no Discipline;
  - day ended with nothing done → `awaiting_checkin`, a check-in, ladder misses recorded;
  - while a check-in is pending, a later streak day is closed with `streakApplied = false` and the streak is
    unchanged;
  - 3 away days → one gap check-in (from/to), the new day's number counts them, not light;
  - 6 away days → light, comeback, `recordReentry` steps active ladders down;
  - a step-up to a never-reached rung → one `rung:<ladder>:<rung>` ledger row (+15), not repeated later;
  - a 7th streak day → shield and +20 milestone ledger row;
  - travel: a new zone changes the new day's window per `nextDayWindow`;
  - a profile the builder rejects → new day with `no_quests` protection and no quests.
- [ ] Commit after each module.

### Task 10: I/O modules and the three functions

**Files:** Create `_shared/db.ts`, `_shared/claude.ts`, `lmu-onboarding/index.ts`, `lmu-sync/index.ts`,
`lmu-account-delete/index.ts`, `supabase/deno.check.json`; add `deno` 2.9.6 and a `check:functions` script. No
`config.toml`: the CLI's defaults (verify_jwt = true) are what LevelMeUp needs, and a config file invites a
`supabase config push` that would change the wedding's settings.

- [ ] Write them per "Server code"; `deno check` passes; Vitest unit suite still passes.
- [ ] Deploy with `npm run deploy:functions` (guarded; deploys exactly the three names). Commit.

### Task 11: Live tests

**Files:** Create `supabase/tests/live/{helpers,auth,onboarding,sync,delete}.test.ts`; script `test:live`.

- [ ] `helpers.ts`: `newPlayer()` (anonymous sign-up via `/auth/v1/signup` with the anon key), `call(fn, token,
  body)`, and an `afterAll` that deletes every player it created through `lmu-account-delete` (and fails loudly if
  one can't be deleted). At most 6 players per run.
- [ ] Cases: no token → 401; anon key → 403; onboarding → template reveal, character with the class bonus, day 1
  with quests; onboarding again → 409; sync before onboarding → 404; sync → today has 3–4 quests; complete the core
  → XP equals the snapshot; same event again → identical result; new event same quest → `already_completed`;
  another player's quest → `not_found`; undo → XP back; rate after undo → `not_completed`; a batch with one invalid
  event applies the valid ones and reports the invalid one; 10 parallel syncs on a fresh player → one day 1, one
  set of quests; account delete → `quest_days` count 0 and the auth user gone.
- [ ] Run `npm run test:live` → all pass and the cleanup check finds no leftover test players. Commit.

### Task 12: Docs, the wedding note, final checks

- [ ] Architecture §10 (development = live project, test rules), §12 (`lmu_service` details, the CLI guard),
  §13 (spike results); roadmap (M3 done, events per milestone, M4 points the phone at the live project);
  `supabase/README.md` (commands, the rules for the shared project, how to add a migration); CLAUDE.md (commands
  and the forbidden list).
- [ ] With the owner's OK: a short note in `wedding-site/CLAUDE.md` that the project also hosts `levelmeup`
  (never drop it; never `migration repair` versions you don't know; `levelmeup.schema_migrations` is LevelMeUp's).
- [ ] Final: `npm test`, `npm run typecheck`, `npm run check:portable`, `npm run check:functions`, `npm run
  db:test`, `npm run test:live`, `npm audit`; independent code review; merge to main with the owner's OK.

## Done when

- The live project has the `levelmeup` schema at migration 0003, every DB test passes there, and the residue check
  shows nothing left behind.
- Neither `lmu_service` nor `lmu_player` can read or write any wedding table, even with forged admin claims (DB
  tests); the wedding's migration history is unchanged.
- The three functions are deployed; every live test passes; no test player is left behind.
- No secret is in the repo (scanned) or printed; `LMU_DB_URL` exists only as a project secret.
