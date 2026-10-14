# CLAUDE.md — LevelMeUp (working title)

Behavioral guidelines based on the "Andrej Karpathy" CLAUDE.md (github.com/multica-ai/andrej-karpathy-skills),
adapted the same way as the owner's `ninety-day`, `wedding-site` and `stoic-porch` repos.

**Tradeoff:** these rules bias toward caution over speed. For trivial tasks, use judgment.

## 0. What this project is

- An anime/manhwa-style RPG self-improvement app: real-life daily quests, a class, stats, XP and levels,
  a daily article, and **opt-in** accountability (focus challenges, and app blocking only where the OS allows it).
- Gamification serves real behavior change. When a mechanic and the user's actual wellbeing disagree, wellbeing wins.
- Research and decisions live in `docs/`: `docs/research/` (reference apps, platform feasibility),
  `docs/superpowers/specs/` (approved designs), `docs/superpowers/plans/` (build plans). Read the relevant spec and
  plan before touching anything. The plan is the source of truth for file layout, names, and signatures.
- Approved specs (2026-10-10): `2026-10-10-levelmeup-mvp-design.md` (what), `…-architecture.md` (how),
  `…-visual-design.md` (look; board sources in `docs/design/ink-panel/`).
- Stack: Expo SDK 57 + React Native + expo-router + TypeScript + Reanimated, same base as the owner's MAINARC and
  ninety-day apps; Supabase (Postgres, Auth, RLS, Edge Functions); Claude API server-side only.
  Android first, tested on the owner's Oppo Find X9 via EAS APK builds (Expo Go crashes on that phone).
- **Supabase is shared with the live wedding site** (DNA Wedding project). LevelMeUp lives only in the `levelmeup`
  schema; never create, change or drop anything in `public` or in the wedding's functions, secrets or cron jobs.
  **Never run `supabase db push`** (the project's migration history belongs to the wedding repo); deploy migrations
  with this repo's `db:deploy` runner. LevelMeUp's names start with `lmu-` (functions, cron) and `LMU_` (secrets).
  Architecture §12 has the full sharing rules. Remote changes need the owner's yes at each milestone.
- **The backend is live (since M3); there is no local database.** Call the Supabase CLI only through
  `scripts/sb.ts` (an allow list pinned to the project). Never add a `supabase/config.toml`, never `link`, never
  `config push`, `db reset`, `migration repair` or `functions deploy --prune`. Commands (details in
  `supabase/README.md`): `npm run db:deploy` (migrations), `npm run db:test` (pgTAP, always rolled back),
  `npm run deploy:functions`, `npm run test:live` (temporary players, always deleted), `npm run check:functions`.
  `npm run articles -- …` (M8a): the article pipeline's owner commands; `setup`, `tick`, `evergreen`,
  `publish`/`reject` and `cron on|off` change the live project or spend money, so they need the owner's yes. Claude
  calls go through `_shared/claude.ts` and `_shared/articles/batches.ts` only, and every one is reserved against the
  monthly budget first. `npm run pilot` (M9b): the pilot's totals, read only. `MIN_APP_VERSION`
  (`supabase/functions/_shared/version.ts`) is raised, and the functions deployed, only when a server change would
  break older apps.
- **The app** is `apps/mobile` (since M4; details in `apps/mobile/README.md`). `npm run app` starts Metro for the
  development build (`--tunnel`); `npm run check:bundle` fails if a secret is in the app bundle; EAS builds run in the
  cloud with `npx eas-cli@latest build --platform android --profile development` from `apps/mobile` (never Expo Go,
  never a bare `npx eas-cli`). The app ships only the publishable key (`src/config.ts`); never put another key there.
  Only `apps/mobile/src/notify/os.ts` imports `expo-notifications` (M7d) and only `apps/mobile/src/ui/haptics.ts`
  imports `expo-haptics` (M10b); a new native module needs a new EAS build.
  The pilot APK: `npx eas-cli@latest build --platform android --profile preview` (M9b). Developer screens live in
  `src/dev/routes/` and load only in development builds (the `app/dev/` files are stubs); `check:bundle` fails if
  developer code reaches a release bundle. Every call runs in `ap-southeast-1`, next to the database, and names the
  app's version (`x-lmu-app`).

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State assumptions explicitly. If uncertain, ask, but batch questions (about 3 at a time, each with a recommended answer).
- If multiple interpretations exist, present them; don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- Never claim an OS API, permission, integration or store policy works without verifying it (docs + a device test).
  Mark anything unverified as unverified.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond the approved plan. Nothing scaffolded for a later phase.
- No abstractions for single-use code. No "configurability" nobody requested. No error handling for impossible scenarios.
- Keep dependencies few. Prefer what is already in `package.json`, then a native platform feature, then a few lines of code.
- Deterministic logic (XP, levels, streaks, difficulty, day rollover) is plain code, never an LLM call.
- If you write 200 lines and it could be 50, rewrite it.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

- Don't "improve" adjacent code, comments, or formatting. Match existing style.
- Remove imports/variables your change made unused; leave pre-existing dead code alone (mention it).
- Every changed line should trace directly to the request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

- Rules (XP, progression, quest generation limits, date/time-zone math, consequence eligibility) are written
  test-first. Row rules and RPCs get a database test before any UI uses them.
- For multi-step tasks, state a short plan: `step -> how it's verified`.
- Before claiming done: run the tests and the typecheck and paste the real result. No "should work".
- "It renders" is not done: check the journey, persistence, authorization, invalid input, loading/empty/error states.
- Device checks are batched in `docs/device-verification-checklist.md` instead of asking for a build after every task.
- Report honestly what was tested, what was only mocked, and what still needs a physical device.

## Never simplify away

- **Server-authoritative progression.** The client never sends an XP amount, level, stat value or streak. It reports
  "I completed quest instance X"; a Postgres function decides the reward once (idempotent, one reward per instance),
  inside a transaction.
- **Row Level Security on every table**, written in a migration with its test before the UI. Service-role keys and
  model-provider keys live only on the server, never in the app bundle or the repo.
- **AI output is untrusted input.** Generated quests, rewards and difficulty changes are schema-validated and clamped
  by code limits before they touch user state. The model never runs database writes or device controls directly.
- **Consequences need consent.** Off by default; explicitly enabled; shown in full before enabling; time-limited;
  reversible by a documented route; never triggered by a crash, a sync failure, missing data or a missed notification;
  never blocks calls, emergency services, messaging essentials or accessibility.
- **Exercise safety.** No prescription beyond the user's stated level and limitations; pain, illness or injury always
  offers a rest or scaled-down option without penalty; difficulty rises on demonstrated readiness, not the calendar.
- **No shaming copy.** The dark force can be ominous; it never humiliates, threatens or manipulates.
- **Accessibility basics.** No text truncation, 44 dp targets, 4.5:1 contrast, font scaling, and a reduced-motion path.
- **Account and data deletion** work end to end.
- **Anything explicitly requested.**

## Talking to the owner

- Updates are plain and short: what changed, what to check, what's next. Explain jargon in a few words.
- Specs and plans may be technical, but the summary at the top is plain language.
- For each significant decision: the decision, why it matters, the recommendation, the trade-offs, and whether approval is needed.
- Anything that adds a monthly cost (a Supabase project, API spend, a paid service) is proposed first, never added.
- Nothing destructive (dropping tables, deleting projects or data) without a backup and the owner's explicit yes.

---

**These guidelines are working if:** diffs are small and trace to the request, nothing gets rewritten for being
overcomplicated, no feature is claimed to work without a test or a device check, and clarifying questions come
before implementation rather than after mistakes.
