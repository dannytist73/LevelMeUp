# LevelMeUp server (`@levelmeup/server`)

LevelMeUp's database and Edge Functions, live on the shared **DNA Wedding** Supabase project
(`knlgpcwoaaygncmlnbsm`) in the `levelmeup` schema. The wedding site owns `public`, its migration history, its
functions and its settings; LevelMeUp never touches them (architecture §12). There is no local database.

## Commands (from the repo root)

| Command | What it does |
|---|---|
| `npm test` | Every offline suite, including this package's unit tests (server logic, lints, runners, secret scan) |
| `npm run db:deploy -- --dry-run` | Lists applied and pending migrations; changes nothing |
| `npm run db:deploy` | Applies pending migrations, each with its record in `levelmeup.schema_migrations` in one transaction, then checks the wedding's migration history is unchanged |
| `npm run db:test [-- <name>]` | Runs `tests/db/*.sql` on the live project, each inside a transaction that always rolls back (pgTAP is created inside it), then checks nothing was left behind |
| `npm run check:functions` | `deno check` on the three functions |
| `npm run deploy:functions` | Deploys `lmu-onboarding`, `lmu-sync` and `lmu-account-delete` by name |
| `npm run test:live` | Calls the deployed functions with up to 6 temporary anonymous players and deletes them all at the end |
| `npm run lmu:password` | Gives `lmu_service` a new random password and stores `LMU_DB_URL`; prints nothing secret (also for rotation) |

`.env.local` (git-ignored) holds the project URL and the public anon key for the live tests. Service-role and
model keys never leave Supabase.

## Rules for the shared project

- The Supabase CLI is called only through `scripts/sb.ts`, an allow list: `db query --linked`, deploying or deleting
  named `lmu-` functions, `LMU_` secrets from an env file, all with `--project-ref knlgpcwoaaygncmlnbsm`.
- Never `supabase db push`, `link`, `config push`, `db reset`, `migration repair` or `functions deploy --prune`.
  There is deliberately no `config.toml`.
- Migrations are `migrations/NNNN_name.sql`, numbered in order, and never edited after they are applied (the
  runner refuses a changed checksum). A lint keeps them inside `levelmeup`: no `public.`, no `drop schema`/`role`, no
  transaction control, every `security definer` function with `set search_path = levelmeup, pg_temp`, and every
  migration that creates functions followed by `revoke all on all functions in schema levelmeup from public, anon,
  authenticated` (Postgres lets everyone execute a new function by default).
- DB tests are `tests/db/*.sql` defining `lmu_test.test_*` functions; `_helpers.sql` runs first. A lint forbids
  transaction control, role changes and writes to `public` in them. Test players use ids `00000000-0000-4000-8000-…`.

## How it fits together

- **Reads** run as the player: `lmu_service` sets the player's claims and `set local role lmu_player`, so row level
  security decides. `lmu_player` can read LevelMeUp's tables and none of the project's other data; neither role can
  become the project's `authenticated` users, so no claims reach the wedding's data. Every function also confirms the session with
  Supabase Auth. **Writes** go only through the `security definer` functions in `0003`–`0004` (executable only by
  `lmu_service`), which lock the player's character row, re-check every guard and raise `lmu:<code>`.
- `functions/_shared/` holds pure modules (tested in Node with the real quest library: `advance.ts` closes days and
  builds the next one, `events.ts` checks completions, `onboarding.ts` makes the character) and three Deno-only ones
  (`db.ts`, `claude.ts`, `session.ts`).
- Rewards come from the XP snapshot stored with each quest, once per event. Level, stat points and ranks are never
  stored; the rules compute them from stat XP on every read.
- `lmu-onboarding` takes the interview's answers (M5) and the rules compute the class (unless the player picked one on
  the reveal), the estimates, the starting rungs and the gentle start; the safety answers themselves are never stored.
  With `redo: true` it builds the character again through `restart_player` (`0006`), which refuses (`lmu:locked`) once
  the player has any event or XP ledger row; the Claude-call log is kept, so the 3-call cap holds across redos.
- Adjustments (M6b–M6d: swap, hard day, rest, pain, resume, step down, class change, abilities, `training`, `book`) are
  planned in `_shared/adjust.ts` and written by `levelmeup.adjust`, replaced whole by each migration that adds a kind
  (latest: `0010`, Scholar's Path, which also adds `profiles.book_started_at` and `books_finished`).
- The state each response returns (`_shared/state.ts`, `stateView`) adds what only Character and Chronicle show (M6d):
  the last 92 days' dates and marks, growth since day 1 and the book's progress, read once per response by
  `loadHistory` (`db.ts`) as the player.
- Offline-built days (M6e, no database change): the state also carries every ladder's state, each recent day's quests
  and the workouts done, so the phone can build the next day itself. A `provisional_day` event is applied as of when the
  phone built it (`_shared/offline.ts`, `planAdvance`'s `provisional` input): the phone's quests are kept when the rules
  allow them, otherwise the server stores its own day and answers `day_rebuilt`. `complete`, `undo`, `rate` and `pain`
  can name a quest by `ref: { dayNumber, slot, templateId }` instead of `instanceId`.
