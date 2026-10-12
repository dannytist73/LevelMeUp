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
| `npm run check:functions` | `deno check` on the four functions |
| `npm run deploy:functions` | Deploys `lmu-onboarding`, `lmu-sync`, `lmu-account-delete` and `lmu-articles-tick` by name |
| `npm run test:live` | Calls the deployed functions with up to 12 temporary anonymous players and deletes them all at the end |
| `npm run lmu:password` | Gives `lmu_service` a new random password and stores `LMU_DB_URL`; prints nothing secret (also for rotation) |
| `npm run articles -- setup` | Makes the tick secret: `LMU_TICK_SECRET` for the function and its Vault copy `lmu_tick_secret` for the cron; prints nothing secret |
| `npm run articles -- tick [--night]` | Runs one pipeline step now: it moves the jobs along but never queues a night's articles, so it spends only on jobs already queued; `--night` does what the cron does (and may queue the night's two) |
| `npm run articles -- evergreen <n>` | Queues n evergreen articles (they wait for review) |
| `npm run articles -- jobs` | The latest jobs |
| `npm run articles -- review` | Writes `.reviews/articles.html` (git-ignored) with every article waiting for review |
| `npm run articles -- publish <id…>` / `reject <id…>` | Publishes reviewed articles, or keeps them out |
| `npm run articles -- spend` | This month's Claude spend against the $25 cap |
| `npm run articles -- cron on\|off\|status` | Schedules `lmu-articles-tick` every 30 minutes (enabling pg_cron and pg_net), unschedules it, or shows its last runs |

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

## Articles (M8a)

- `lmu-articles-tick` moves the article pipeline one step (`_shared/articles/pipeline.ts`): it queues the night's two
  jobs (from 18:00 UTC, only while a player who played this week has fewer than 14 articles they haven't been given),
  collects finished batches (research → a brief built from the web search citations; writing → an article checked by
  `_shared/articles/check.ts`) and submits what is ready through the Message Batches API. One tick runs at a time (a
  lease in `article_pipeline`); every Claude call is reserved against the $25 monthly budget first
  (`reserve_ai_spend`, `0014`) and its real cost logged.
- The tick answers only to the tick secret on `x-lmu-tick` (`LMU_TICK_SECRET`, compared in constant time); the cron
  reads its copy from the Vault (`lmu_tick_secret`) each time it runs. The gateway's JWT check stays on: the cron sends
  the publishable key on `apikey`.
- `setup`, `tick`, `evergreen`, `publish`, `reject` and `cron on|off` change the live project or spend money: the
  owner's yes first.

## Reading (M8b)

- The server picks each new day's article when it builds the day (`_shared/reading.ts`, `chooseArticle`), from the
  published library read as the player; `insert_day` keeps only a published id (`0015`). The reading quest is claimed
  only on a day with an article (`lmu:no_article`), and a claim counts in `articles_read`.
- The state names today's article, the next day's pick (`nextArticle`, for the phone's offline day), the last 30
  readings and Insight's options. The whole articles go beside it in the response's `articles`: today's and the next
  day's, and up to 3 named in the sync body's `want`, less those in `have` (at most 64 ids).
- Insight is the `insight` event: `lmu-sync` checks it against a fresh snapshot (`planInsight`), then
  `levelmeup.set_insight` (`0015`, `lmu_service` only) stores `{cluster, day}` on `character_state.insight`. It applies
  to the next day built and then lapses.

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
  (latest: `0011`, the check-in, M7a: kinds `checkin` and `lighter_plan`; it also replaces `levelmeup.advance`, which
  now applies the days queued behind a check-in, opens the check-ins that replay finds, settles "I just didn't" and
  records Unbreakable; and adds the check-in's resolution, `next_day_light` and `profiles.lighter_plan_at`). `lmu-sync`
  closes ended days before it applies a `checkin` answer (`_shared/checkin.ts` plans it).
- Settings (M7b, `0012`: `character_state.rest_day`; `adjust` takes `settings`, `restDay` and a late day's `tappedAt`):
  the `settings` event carries the voice, `boundaryMinutes` (whole half hours), `minutesPerDay` and difficulty, always
  all four; `plan_rest` may carry `tomorrow: true` (the next day is built as planned rest) and, like `pain`, a tap time
  `at`, so a rest tapped while its day ran still protects it when it syncs after the day ended (within 48 hours, before
  the day is closed; only its protection changes). A late rest is refused as `rest_late`; a pain report applied without
  its day is `ok` with `notice: 'pain_late'`.
- The Accountability Pact (M7c, `0013`: `checkins.consequence` and `trial_done_at`; `adjust` takes
  `accountability_set`, `trial` and `checkin_note`, and a check-in answer's consequence): `_shared/pact.ts` decides what
  "I just didn't" sets off under the pact (`consequenceFor`, the rules' `decideConsequence`) and plans the three events.
  A raise is signed at the server's now (`profiles.accountability_enabled_at`); a lowering eases the running day's
  consequence. The seal on the side quests is the phone's own: no completion is ever refused for it.
- The state each response returns (`_shared/state.ts`, `stateView`) adds what only Character and Chronicle show (M6d):
  the last 92 days' dates and marks, growth since day 1 and the book's progress, read once per response by
  `loadHistory` (`db.ts`) as the player.
- Offline-built days (M6e, no database change): the state also carries every ladder's state, each recent day's quests
  and the workouts done, so the phone can build the next day itself. A `provisional_day` event is applied as of when the
  phone built it (`_shared/offline.ts`, `planAdvance`'s `provisional` input): the phone's quests are kept when the rules
  allow them, otherwise the server stores its own day and answers `day_rebuilt`. `complete`, `undo`, `rate` and `pain`
  can name a quest by `ref: { dayNumber, slot, templateId }` instead of `instanceId`.
