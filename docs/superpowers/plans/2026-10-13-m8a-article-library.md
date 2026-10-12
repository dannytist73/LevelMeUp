# M8a — The Article Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LevelMeUp writes its own daily articles on the server: a nightly pipeline researches a topic on the web, writes
a 5–7 minute article from that research, checks it in code and puts it in a shared library, within a $25 monthly cap on
every Claude call. About 20 evergreen articles are made the same way and wait for the owner's review. Players read them
in M8b.

**Architecture:** The approved pipeline of architecture §5.2. A new Edge Function, `lmu-articles-tick`, is called every
30 minutes by Supabase Cron (`pg_cron` + `pg_net`, turned on by the owner's command) and moves each job one step:
queue the night's topics → a Batch API request with web search (citations on) → code builds the brief from the API's
own citations → a Batch API request that writes the article as structured output → code checks → published (or held
for review when evergreen). The state machine is pure (`_shared/articles/pipeline.ts`) behind two ports, a store
(Postgres functions, migration 0014) and the Batch API, so it is tested with fakes. The tick answers only to a shared
secret kept in the Vault; the gateway's JWT check stays on.

**Tech Stack:** as M7d on the server (Deno Edge Functions, `npm:@anthropic-ai/sdk@0.128.0`, `npm:postgres@3.4.9`, Vitest,
pgTAP through `db:test`), plus the Message Batches API and the web search tool (`web_search_20250305`), and the
Supabase extensions `pg_cron` and `pg_net` (not yet enabled on the shared project; checked 2026-10-12). No app change.

**Specs:** MVP spec §4.1 (generation, checks, evergreen, cost control), §5 (article acceptance: only checked articles
are published; the cap with mocked costs); architecture §5.1 (rules for every Claude call: server only, structured
output then code checks, every call logged with cost, the cap before every call, prompts in
`supabase/functions/_shared/prompts/` next to a house-style guide), §5.2 (the Batch API state machine, cost estimate),
§12 (shared-project rules: `lmu-` names, one cron job), §13 spike 3 (a Batch request with web search returns usable
research, and its real cost); roadmap row 8 and the rows carried to M8 (M2: `lintText` for articles with an article
variant of the shaming list; M3: fill `ai_generations.cost_usd`).

---

## Plain summary

When M8a is done:

- **The server writes articles.** Each night at 2 AM Manila time (18:00 UTC), while someone who played this week is
  running low on unread articles, the server picks two topics (about 80 topic ideas in 8 areas: habits, psychology,
  movement, sleep, focus, learning, philosophy, history) and asks Claude to research each one on the web. From the
  research, Claude writes an article of 800–1,200 words in the house style (plain words, a strong opening, a light
  manhwa flavour, an occasional System note, something to do this week).
- **Code checks every article before it goes in the library:** the length and shape; every source it cites is one the
  research really found; no quotations put in real people's mouths; no wording copied from a source; no robotic AI
  phrases, no name-calling, no emoji, no links or markdown. A failed article is tried once more the next night; nobody
  ever sees a failed one.
- **Spending is capped at $25 a month** for all Claude calls (the character reveal too), checked before each call. Over
  the cap nothing is sent until the next month: the library and the evergreen articles carry on.
- **About 20 evergreen articles** are made the same way before the pilot. They wait for your review: one command writes
  a page with all of them (sources included), and another publishes the ones you approve.
- **Players don't see articles yet.** Giving each day its article, the reader, the takeaway and the past readings come
  in M8b.
- **Your yes is needed for:** the deploy (migration 0014 and the functions), the first real article (the spike, at most
  about $0.65), the evergreen batch (about $5–13 one-time; the spike tells), and turning on the scheduler: two Supabase
  extensions on the shared project (`pg_cron`, `pg_net`) and one job, `lmu-articles-tick`. Nothing of the wedding's
  changes, and `npm run articles -- cron off` stops it (the wedding day, for example).

## Decisions this plan makes

Claude's recommendations, under the owner's "use your recommendations" for this session's build loop. The pipeline,
the Batch API, Supabase Cron, the $25 cap and the evergreen library were approved with the architecture (2026-10-10);
these decisions fill in its details. Remote changes and every dollar spent still wait for the owner's yes in chat.

1. **M8 is split in two.** **M8a, the article library** (this plan): the pipeline, its checks, the budget, the tick,
   the owner's commands, the evergreen batch and its review, and the cron. Server only. **M8b, reading:** each new day
   gets one unread article (60 % from the player's goals and class), the phone caches a few for offline days, the
   reader and the takeaway quest, past readings in the Chronicle, the evergreen fallback, and the Mage's Insight. M8a
   spends money and needs the owner's review of real articles; M8b needs those articles to exist. Each is tested and
   deployed on its own.
2. **Research uses web search only, and the brief is built by code from the API's citations.** Citations are always on
   for web search; each one carries the page's URL, title and up to 150 characters of its text. Claude writes 8–14
   facts, each a short passage it wrote while citing results; code keeps the passages that cite something, numbers the
   pages they cite, and keeps the cited excerpts for the copying check. So a fact can't claim a source it didn't use,
   and no model-written source list is trusted. Structured output can't be combined with citations (the API refuses
   it), so the research answer is plain text. **Web fetch is left out:** its citations point at positions inside
   fetched documents rather than at a URL, and whole pages cost many input tokens; the search results' facts are
   enough for a 5–7 minute article. The basic tool (`web_search_20250305`) is used: its citations are documented
   exactly; dynamic filtering (`web_search_20260209`) is a later cost lever once the spike has measured the basic one.
3. **The writer gets only the brief** (topic, area, the sources' ids and titles, the facts with their source ids; no
   URLs) and the house style, and answers as structured output: title, summary, 4–6 sections (heading, paragraphs, an
   optional System note, the source ids it relies on), 2–4 takeaways and a reflection question. The reading time is
   computed by code (180 words a minute: 800 words are 5 minutes, 1,200 are 7), not asked of the model.
4. **The checks** (`_shared/articles/check.ts`, spec §4.1 step 3): the shape and lengths; 800–1,200 words in the body;
   every cited source id is in the brief, at least 2 different sources are cited, and at least half the sections cite
   one; no quotation of 4 or more words (straight or curly quotes), which is how "no quotes attributed to real
   people" is enforced in code; no run of 8 words shared with any cited excerpt (copying); no links, markdown or
   reference numbers; and the article lint. The research's brief needs at least 2 cited sources and 6 cited facts.
5. **The article lint** (`lintArticle`, content): the robotic phrases and emoji as `lintText`, and an article shaming
   list without the words an article may use as subjects ("failure", "shame", "guilty", "ashamed", "excuses",
   "disappointing", "useless"): an article may discuss failure; it never calls the reader names (the M2 carried row).
6. **The night's jobs.** The first tick after 18:00 UTC (02:00 in Manila) claims the night. Spec §4.1's two articles a
   night are queued **only while some player who started a quest day in the last 7 days has fewer than 14 published
   articles they haven't been given** (two weeks of reading): the library grows with its readers, and nothing is spent
   while nobody plays (the spec's "skipping topics with a big unread backlog", for a library shared by everyone).
   Topics come from 80 seeds in the content package (8 clusters × 10): the cluster queued least recently first, then
   its first topic never queued; a cluster whose topics are all used is skipped (more seeds are content work). A job
   that fails is tried once more the next night, from the research again; after a second failure it stays failed with
   its reason.
7. **The budget** is $25 a calendar month (UTC) across every Claude call, the reveal included. Each call is reserved
   before it is sent, under a lock, with a generous estimate (reveal $0.05, research $0.40, writing $0.25) that the real
   cost replaces when the answer arrives; a call that would pass the cap is refused (`lmu:ai_budget`): an article job
   then waits in its queue, and the reveal uses its template. Costs use the prices of 2026-10-12 (pricing page): Claude
   Opus 5.5 $4 / $20 per million input / output tokens, halved in a batch; web search $10 per 1,000 searches. The
   reveal's cost is now logged too (the M3 carried row).
8. **The tick keeps the gateway's JWT check** (the guard still refuses `--no-verify-jwt`). Supabase's gateway accepts
   the publishable key on the `apikey` header (its docs, 2026), so the cron sends that plus `x-lmu-tick`, a 64-character
   random secret that the Vault holds for the cron and `LMU_TICK_SECRET` holds for the function, compared in constant
   time. A player's JWT gets a 401 like anyone else without the secret. One tick runs at a time (a 4-minute lease that
   lapses if a tick dies). The tick's own steps are idempotent: a job moves only from the status the tick saw, a
   submission that died midway is noticed after an hour, and a batch still running after 25 hours is cancelled.
9. **The pipeline's tables** (`article_pipeline`, `article_jobs`, `articles`, `article_sources`) hold no player data,
   but `lmu_service` still changes them only through security-definer functions, as everywhere in `levelmeup` (the DB
   tests check that every entry point is a definer function and that `lmu_service` has no table rights). Players will
   read published articles and their sources as `lmu_player` (M8b); jobs, the lease and the AI log stay server-only.
   An article's id is `article-<job id>`, the text `quest_days.article_id` has held since 0002.
10. **Evergreen articles** go through the same pipeline with an `evergreen` flag and are stored as `review`, not
    `published`. `npm run articles -- review` writes `.reviews/articles.html` (git-ignored) with every article waiting,
    its sources linked; `npm run articles -- publish <ids>` and `reject <ids>` decide. The spike is the first evergreen
    article.
11. **The cron is not a migration.** `pg_cron` and `pg_net` are project-wide extensions, which the migration lint
    rightly forbids. `npm run articles -- cron on` creates them if missing (`pg_cron` in `pg_catalog`, `pg_net` in
    `extensions`, as Supabase documents) and schedules `lmu-articles-tick` every 30 minutes; `cron off` unschedules it
    (the extensions stay, inert); `cron status` shows the job and its last runs. Only with the owner's yes.
12. **Not in M8a:** anything a player sees (M8b), web fetch, images for articles, regenerating or editing an article
    after it is published, per-player articles, a dashboard for the pipeline (the owner's `jobs` and `spend` commands
    instead).

## Facts checked while planning (2026-10-12)

- Prices (platform.claude.com pricing page): Opus 5.5 $4 / $20 per MTok, batch $2 / $10; web search $10 per 1,000
  searches, the same in a batch; web fetch has no extra charge; code execution is free alongside web search.
- Web search docs: citations are always enabled; `web_search_result_location` has `url`, `title`, `cited_text` (≤ 150
  characters), `encrypted_index`; usage counts `server_tool_use.web_search_requests`; web search works in the Message
  Batches API (throttled per organization); errors come back inside a 200 as `web_search_tool_result_error`;
  `pause_turn` may end a long search turn. Structured outputs are incompatible with citations (400).
- Opus 5.5 rejects forced `tool_choice` (not used); thinking can't be disabled (effort is the control; `medium` here).
- SDK 0.128.0 (Deno cache): `client.messages.batches.create({ requests })`, `.retrieve(id)` (`processing_status`,
  `created_at`), `.results(id)` (async iterable of `{ custom_id, result }`, result `succeeded` / `errored` /
  `canceled` / `expired`), `.cancel(id)`; `BatchCreateParams.Request` is `{ custom_id, params }`.
- The shared project has `supabase_vault` but not `pg_cron` or `pg_net` (`pg_extension`, read-only query).
- Supabase docs: scheduling a function is `cron.schedule(name, schedule, $$ select net.http_post(…) $$)` with keys
  from the Vault; `verify_jwt` lets publishable and secret keys through on the `apikey` header.
- `supabase db query` takes `--file` (so SQL holding a secret never goes on a command line).

---

## File map

| File | Change |
|---|---|
| `packages/content/src/articles.ts` | New: `ARTICLE_CLUSTERS`, `ArticleCluster`, `CLUSTER_NAMES`, `ARTICLE_TOPICS` (80 seeds) |
| `packages/content/src/lint.ts` | `ARTICLE_SHAMING`, `lintArticle` |
| `packages/content/src/index.ts` | Export `articles.ts` |
| `packages/content/test/articles.test.ts` | New |
| `supabase/migrations/0014_article_library.sql` | New: the four tables, RLS, `ai_generations.job_id`, the budget and pipeline functions |
| `supabase/tests/db/articles.sql` | New pgTAP file |
| `supabase/functions/_shared/costs.ts` | New: prices, `costUsd`, `MONTHLY_CAP_USD`, `ESTIMATE_USD` |
| `supabase/functions/lmu-onboarding/index.ts` | The reveal reserves through `reserve_ai_spend` and logs its cost |
| `supabase/functions/_shared/articles/text.ts` | New: `wordsOf`, `wordCount`, `shingles` |
| `supabase/functions/_shared/articles/brief.ts` | New: `buildBrief`, `checkBrief` |
| `supabase/functions/_shared/articles/check.ts` | New: `parseArticle`, `checkArticle`, `articleWords`, `readingMinutes` |
| `supabase/functions/_shared/prompts/style.ts` | New: `HOUSE_STYLE` (the written guide) |
| `supabase/functions/_shared/prompts/articles.ts` | New: `ARTICLE_MODEL`, the two requests, `ARTICLE_SCHEMA`, `customId` |
| `supabase/functions/_shared/articles/topics.ts` | New: `chooseTopics` |
| `supabase/functions/_shared/articles/pipeline.ts` | New: `tick` and its ports |
| `supabase/functions/_shared/articles/auth.ts` | New: `tickAllowed` |
| `supabase/functions/_shared/articles/store.ts` | New: the Postgres store |
| `supabase/functions/_shared/articles/batches.ts` | New: the Batch API port |
| `supabase/functions/lmu-articles-tick/index.ts` | New function |
| `supabase/tsconfig.json` | Exclude `store.ts` and `batches.ts` (they import `npm:` modules, like `db.ts`) |
| `supabase/tests/unit/articles-*.test.ts` | New unit tests (text, brief, check, prompts, costs, topics, pipeline, auth, schema) |
| `supabase/tests/live/articles.test.ts` | New: the tick refuses callers without the secret |
| `scripts/lib/articles.ts` | New: SQL builders and the review page (pure) |
| `scripts/articles.ts` | New: the owner's `npm run articles -- …` commands |
| `scripts/test/…` | none: `scripts/lib/articles.ts` is tested from `supabase/tests/unit/articles-scripts.test.ts` |
| `package.json` | `check:functions` and `deploy:functions` include `lmu-articles-tick`; `articles` script |
| `.gitignore` | `.reviews/` |
| Docs | MVP spec §4.1, architecture §5.1/§5.2/§12, roadmap, `supabase/README.md`, `CLAUDE.md` |

---

### Task 0: Baseline

- [ ] **Step 1: Check the branch and the suites**

Run (repo root): `git branch --show-current` → `m8a-article-library` (from `m7d-notifications` 3fa6c97).
Run: `npm test 2>&1 | grep -E "Tests|passed|failed"` → content 1076, rules 449, server 376, app 742, all passing.
Run: `npm run typecheck` → clean.

---

### Task 1: Topics and the article lint (content)

**Files:**
- Create: `packages/content/src/articles.ts`
- Modify: `packages/content/src/lint.ts`, `packages/content/src/index.ts`
- Test: `packages/content/test/articles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/content/test/articles.test.ts
import { describe, expect, it } from 'vitest';
import { ARTICLE_CLUSTERS, ARTICLE_TOPICS, CLUSTER_NAMES, lintArticle } from '../src/index.ts';

describe('article topics (M8a)', () => {
  it('has the eight clusters of spec §4.1, each named', () => {
    expect(ARTICLE_CLUSTERS).toEqual(['habits', 'psychology', 'movement', 'sleep', 'focus', 'learning', 'philosophy', 'history']);
    for (const c of ARTICLE_CLUSTERS) expect(CLUSTER_NAMES[c].length).toBeGreaterThan(0);
  });

  it.each(ARTICLE_CLUSTERS)('%s has at least 10 distinct, clean topics', (cluster) => {
    const topics = ARTICLE_TOPICS[cluster];
    expect(topics.length).toBeGreaterThanOrEqual(10);
    expect(new Set(topics).size).toBe(topics.length);
    for (const topic of topics) {
      expect(topic.length).toBeGreaterThanOrEqual(3);
      expect(topic.length).toBeLessThanOrEqual(120);
      expect(lintArticle(topic)).toEqual([]);
    }
  });

  it('no topic is in two clusters', () => {
    const all = ARTICLE_CLUSTERS.flatMap((c) => ARTICLE_TOPICS[c]);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('lintArticle (M2 carried row)', () => {
  it('flags robotic phrases, name-calling and emoji', () => {
    expect(lintArticle('Let us delve into habits.')).toEqual(['robotic phrase "delve"']);
    expect(lintArticle('Only the lazy skip it.')).toEqual(['shaming word "lazy"']);
    expect(lintArticle('Sleep well tonight 😴')).toEqual(['emoji']);
  });

  it('lets an article discuss failure, shame and excuses', () => {
    expect(lintArticle('Failure is information. Shame makes people hide mistakes, and excuses protect us.')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm -w @levelmeup/content test -- articles` → FAIL (`ARTICLE_CLUSTERS` is not exported).

- [ ] **Step 3: Write the topics**

```ts
// packages/content/src/articles.ts
// The daily article's topics (spec §4.1): eight clusters, each with topic seeds the nightly job works through in order
// (M8a decision 6). A seed is a subject, not a title: the research finds the facts and the writer the angle.

export const ARTICLE_CLUSTERS = ['habits', 'psychology', 'movement', 'sleep', 'focus', 'learning', 'philosophy', 'history'] as const;
export type ArticleCluster = (typeof ARTICLE_CLUSTERS)[number];

export const CLUSTER_NAMES: Readonly<Record<ArticleCluster, string>> = {
  habits: 'Discipline and habits',
  psychology: 'Psychology',
  movement: 'Fitness and movement',
  sleep: 'Sleep and recovery',
  focus: 'Focus',
  learning: 'Learning',
  philosophy: 'Philosophy',
  history: 'History and decision-making',
};

export const ARTICLE_TOPICS: Readonly<Record<ArticleCluster, readonly string[]>> = {
  habits: [
    'How habits form: cue, routine and reward',
    'Implementation intentions: deciding when and where',
    'Habit stacking: tying a new habit to an old one',
    'Why small daily actions add up',
    'Designing your surroundings so the good choice is the easy one',
    'Streaks, and what to do after a missed day',
    'Willpower and decision fatigue: what the research shows',
    'Identity-based habits: acting as the person you want to become',
    'Breaking a bad habit by adding friction',
    'Tracking progress without obsessing over it',
  ],
  psychology: [
    'The progress principle: why small wins motivate',
    'Self-compassion and getting back on track',
    'Intrinsic and extrinsic motivation',
    'The planning fallacy and estimating time better',
    'Growth mindset: what holds up and what does not',
    'Delayed gratification and the marshmallow studies revisited',
    'How stress changes the way we decide',
    'Loss aversion in everyday choices',
    'Flow: the state of full absorption',
    'Why we procrastinate, and what helps',
  ],
  movement: [
    'What walking does for body and mind',
    'Progressive overload for beginners',
    'Why mobility matters as we age',
    'Bodyweight strength: push, pull, squat and hinge',
    'Rest days and how muscles adapt',
    'Zone 2 cardio explained',
    'Posture: what matters and what is myth',
    'Warming up: why and how',
    'Exercise and mood',
    'Grip strength and healthy ageing',
  ],
  sleep: [
    'How sleep cycles work',
    'Light, the body clock and morning sunlight',
    'Caffeine timing and sleep',
    'Naps: when they help and when they hurt',
    'Sleep and memory',
    'A wind-down routine that works',
    'Slow breathing and the nervous system',
    'Recovery: why rest is part of training',
    'Screens at night: what the evidence says',
    'Keeping a steady wake-up time',
  ],
  focus: [
    'Attention residue and the cost of switching tasks',
    'Deep work: protecting long stretches of focus',
    'The Pomodoro technique and timed work blocks',
    'Phone notifications and attention',
    'Single-tasking',
    'Boredom, and why it is useful',
    'Mind-wandering: when it helps and when it hurts',
    'Meditation as attention training',
    'Planning tomorrow the night before',
    'Working with your energy peaks',
  ],
  learning: [
    'Spaced repetition: remembering what you study',
    'Retrieval practice: testing yourself to learn',
    'Deliberate practice and building a skill',
    'Note-taking that helps you think',
    'The Feynman technique: explaining to learn',
    'Interleaving: mixing practice to learn better',
    'Ways to read more books',
    'Learning plateaus and how to get past them',
    'Curiosity and memory',
    'Learning by teaching others',
  ],
  philosophy: [
    'Stoicism and the dichotomy of control',
    'Marcus Aurelius and the Meditations',
    'Seneca on time',
    'Epictetus on what is up to us',
    'Aristotle on virtue as habit',
    "Zen and the beginner's mind",
    'Bushido in history: the samurai code and its myths',
    'The examined life: Socrates and self-reflection',
    'Memento mori: remembering mortality to live well',
    'Confucius on self-cultivation',
  ],
  history: [
    'Miyamoto Musashi and The Book of Five Rings',
    "Benjamin Franklin's thirteen virtues",
    'The Endurance expedition and planning for the unknown',
    'Pre-mortems: imagining failure before it happens',
    'Second-order thinking',
    'The OODA loop: observe, orient, decide, act',
    'Checklists in surgery and aviation',
    'Inversion: solving problems backwards',
    'Sunk costs and knowing when to quit',
    'The Wright brothers and patient experiments',
  ],
};
```

- [ ] **Step 4: Add the article lint**

In `packages/content/src/lint.ts`, after `lintShadowLine`, add:

```ts
/**
 * Articles may discuss failure, shame and excuses as subjects (an article about habits will); they never call the
 * reader names (M8a decision 5).
 */
export const ARTICLE_SHAMING: readonly string[] = [
  'lazy', 'pathetic', 'weakling', 'loser', 'worthless', 'disgrace', 'disappointed in you', 'coward', 'no excuses', 'you failed',
];

const ARTICLE_SHAME = matchers(ARTICLE_SHAMING);

/** Problems in a piece of an article (spec §4.1 step 3): robotic phrases, name-calling, emoji. */
export function lintArticle(text: string): string[] {
  const problems: string[] = [];
  for (const [phrase, re] of ROBOTIC) if (re.test(text)) problems.push(`robotic phrase "${phrase}"`);
  for (const [phrase, re] of ARTICLE_SHAME) if (re.test(text)) problems.push(`shaming word "${phrase}"`);
  if (EMOJI.test(text)) problems.push('emoji');
  return problems;
}
```

In `packages/content/src/index.ts`, after `export * from './notify.ts';`, add `export * from './articles.ts';`.

- [ ] **Step 5: Run the tests**

Run: `npm -w @levelmeup/content test` → all pass (1076 + 13 new).
Run: `npm -w @levelmeup/content run typecheck` → clean. Run: `npm run check:portable` → ok.

- [ ] **Step 6: Commit**

```bash
git add packages/content
git commit -m "M8a content: 80 article topics in 8 clusters, the article lint (failure may be discussed, never name-calling)"
```

---

### Task 2: Migration 0014

**Files:**
- Create: `supabase/migrations/0014_article_library.sql`
- Test: `supabase/tests/unit/articles-schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// supabase/tests/unit/articles-schema.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARTICLE_CLUSTERS } from '../../../packages/content/src/index.ts';

const SQL = readFileSync(join(import.meta.dirname, '..', '..', 'migrations', '0014_article_library.sql'), 'utf8');

describe('migration 0014 (M8a)', () => {
  it("allows exactly the content package's clusters", () => {
    const list = /cluster text not null check \(cluster in \(([^)]*)\)\)/.exec(SQL)?.[1];
    expect(list?.split(',').map((s) => s.trim().replace(/'/g, ''))).toEqual([...ARTICLE_CLUSTERS]);
  });

  it('gives lmu_service the pipeline functions and nothing on the tables', () => {
    expect(SQL).toMatch(/grant execute on function levelmeup\.article_store\(bigint, jsonb, jsonb\)/);
    expect(SQL).not.toMatch(/grant (select|insert|update|delete)[^;]*to lmu_service/i);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm -w supabase test -- articles-schema` → FAIL (no such file).

- [ ] **Step 3: Write the migration**

```sql
-- M8a, the article library (plan decisions 6–9): the nightly pipeline's jobs, the articles it makes and their sources,
-- a lease so one tick runs at a time, and the monthly AI budget ($25, spec §4.1), checked before every Claude call.
-- These tables hold no player data; lmu_service changes them only through the functions below, as everywhere in this
-- schema. Players will read published articles and their sources as lmu_player (M8b).

create table levelmeup.article_pipeline (
  id int primary key default 1 check (id = 1),
  ticking_until timestamptz,
  queued_night date
);
insert into levelmeup.article_pipeline (id) values (1);

create table levelmeup.article_jobs (
  id bigint generated always as identity primary key,
  cluster text not null check (cluster in ('habits', 'psychology', 'movement', 'sleep', 'focus', 'learning', 'philosophy', 'history')),
  topic text not null check (char_length(topic) between 3 and 120),
  evergreen boolean not null default false,
  status text not null default 'queued'
    check (status in ('queued', 'researching', 'researched', 'writing', 'retry', 'done', 'failed')),
  attempt int not null default 1 check (attempt between 1 and 2),
  batch_id text check (char_length(batch_id) <= 100),
  ai_call_id bigint,
  submitted_at timestamptz,
  brief jsonb,
  error text check (char_length(error) <= 1000),
  article_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index article_jobs_open_idx on levelmeup.article_jobs (id) where status not in ('done', 'failed');

create table levelmeup.articles (
  id text primary key check (id ~ '^article-[0-9]+$'),
  job_id bigint not null unique references levelmeup.article_jobs (id),
  cluster text not null,
  topic text not null,
  title text not null check (char_length(title) between 1 and 120),
  summary text not null check (char_length(summary) between 1 and 400),
  sections jsonb not null check (jsonb_typeof(sections) = 'array' and jsonb_array_length(sections) between 1 and 10),
  takeaways jsonb not null check (jsonb_typeof(takeaways) = 'array' and jsonb_array_length(takeaways) between 1 and 6),
  reflection_question text not null check (char_length(reflection_question) between 1 and 300),
  reading_minutes int not null check (reading_minutes between 1 and 15),
  words int not null check (words between 1 and 5000),
  evergreen boolean not null,
  status text not null check (status in ('review', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index articles_published_idx on levelmeup.articles (cluster) where status = 'published';

create table levelmeup.article_sources (
  article_id text not null references levelmeup.articles (id) on delete cascade,
  idx int not null check (idx between 1 and 50),
  url text not null check (url ~ '^https?://' and char_length(url) <= 2000),
  title text not null check (char_length(title) between 1 and 300),
  primary key (article_id, idx)
);

-- Which job a Claude call belonged to; the month's spend is summed by created_at.
alter table levelmeup.ai_generations add column job_id bigint references levelmeup.article_jobs (id);
create index ai_generations_created_idx on levelmeup.ai_generations (created_at);

alter table levelmeup.article_pipeline enable row level security;
alter table levelmeup.article_jobs enable row level security;
alter table levelmeup.articles enable row level security;
alter table levelmeup.article_sources enable row level security;

create policy "players read published articles" on levelmeup.articles for select to lmu_player using (status = 'published');
create policy "players read the sources of published articles" on levelmeup.article_sources for select to lmu_player
  using (exists (select 1 from levelmeup.articles a where a.id = article_sources.article_id and a.status = 'published'));
grant select on levelmeup.articles, levelmeup.article_sources to lmu_player;

-- This calendar month's spend (UTC): real costs, and the estimates of calls still pending. Internal (reserve_ai_spend).
create function levelmeup.ai_month_spend() returns numeric language sql stable set search_path = levelmeup, pg_temp as $$
  select coalesce(sum(cost_usd), 0) from levelmeup.ai_generations
  where created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'
$$;

-- Spec §4.1: every Claude call is reserved before it is sent, under one lock: refused when its estimate would take the
-- month past p_month_cap (lmu:ai_budget) or, for a player, past their lifetime p_player_cap of calls of that kind
-- (lmu:ai_cap). The row holds the estimate as its cost until finish_ai_call records the real one.
create function levelmeup.reserve_ai_spend(p_user uuid, p_kind text, p_model text, p_estimate numeric, p_month_cap numeric,
  p_player_cap int, p_job bigint)
returns bigint language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  new_id bigint;
begin
  if p_estimate is null or p_estimate < 0 or p_month_cap is null then raise exception 'lmu:bad_budget'; end if;
  perform pg_advisory_xact_lock(hashtextextended('levelmeup:ai_budget', 0));
  if p_player_cap is not null
    and (select count(*) from levelmeup.ai_generations where user_id is not distinct from p_user and kind = p_kind) >= p_player_cap then
    raise exception 'lmu:ai_cap';
  end if;
  if levelmeup.ai_month_spend() + p_estimate > p_month_cap then raise exception 'lmu:ai_budget'; end if;
  insert into levelmeup.ai_generations (user_id, kind, model, status, cost_usd, job_id)
  values (p_user, p_kind, p_model, 'pending', p_estimate, p_job)
  returning ai_generations.id into new_id;
  return new_id;
end $$;

-- One tick at a time: true for the caller that takes the lease. A tick that dies frees it when it lapses.
create function levelmeup.article_tick_begin(p_seconds int) returns boolean language sql security definer
set search_path = levelmeup, pg_temp as $$
  with taken as (
    update levelmeup.article_pipeline set ticking_until = now() + make_interval(secs => p_seconds)
    where id = 1 and (ticking_until is null or ticking_until < now())
    returning 1
  )
  select exists (select 1 from taken)
$$;

create function levelmeup.article_tick_end() returns void language sql security definer set search_path = levelmeup, pg_temp as $$
  update levelmeup.article_pipeline set ticking_until = null where id = 1
$$;

-- The night's jobs are queued once: true for the one call that claims a night later than the last one claimed.
create function levelmeup.article_claim_night(p_night date) returns boolean language sql security definer
set search_path = levelmeup, pg_temp as $$
  with claimed as (
    update levelmeup.article_pipeline set queued_night = p_night
    where id = 1 and (queued_night is null or queued_night < p_night)
    returning 1
  )
  select exists (select 1 from claimed)
$$;

-- Decision 6: players who started a quest day in the last 7 days and have fewer than p_min published articles that no
-- day of theirs has been given.
create function levelmeup.article_short_players(p_min int) returns int language sql stable security definer
set search_path = levelmeup, pg_temp as $$
  select count(*)::int from levelmeup.profiles p
  where exists (select 1 from levelmeup.quest_days d where d.user_id = p.user_id and d.created_at > now() - interval '7 days')
    and (select count(*) from levelmeup.articles a
         where a.status = 'published'
           and not exists (select 1 from levelmeup.quest_days d where d.user_id = p.user_id and d.article_id = a.id)) < p_min
$$;

-- Every topic ever queued, with when it was last queued (the rotation, decision 6).
create function levelmeup.article_topics_used() returns table (cluster text, topic text, queued_at timestamptz)
language sql stable security definer set search_path = levelmeup, pg_temp as $$
  select j.cluster, j.topic, max(j.created_at) from levelmeup.article_jobs j group by j.cluster, j.topic
$$;

-- New jobs from [{cluster, topic, evergreen}]; their ids in order.
create function levelmeup.article_queue(p_jobs jsonb) returns setof bigint language plpgsql security definer
set search_path = levelmeup, pg_temp as $$
begin
  return query
    insert into levelmeup.article_jobs (cluster, topic, evergreen)
    select j.cluster, j.topic, coalesce(j.evergreen, false)
    from jsonb_to_recordset(p_jobs) as j(cluster text, topic text, evergreen boolean)
    returning article_jobs.id;
end $$;

create function levelmeup.article_jobs_open() returns setof levelmeup.article_jobs language sql stable security definer
set search_path = levelmeup, pg_temp as $$
  select * from levelmeup.article_jobs where status not in ('done', 'failed') order by id
$$;

-- Moves a job from the status the pipeline saw to the next one, setting the fields p_set names (attempt, batchId,
-- aiCallId, submittedAt, brief, error; a JSON null clears one). False when another tick moved it first.
create function levelmeup.article_job_move(p_id bigint, p_from text, p_to text, p_set jsonb) returns boolean
language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  n int;
begin
  update levelmeup.article_jobs set
    status = p_to,
    attempt = coalesce((p_set ->> 'attempt')::int, attempt),
    batch_id = case when p_set ? 'batchId' then p_set ->> 'batchId' else batch_id end,
    ai_call_id = case when p_set ? 'aiCallId' then (p_set ->> 'aiCallId')::bigint else ai_call_id end,
    submitted_at = case when p_set ? 'submittedAt' then (p_set ->> 'submittedAt')::timestamptz else submitted_at end,
    brief = case when p_set ? 'brief' then nullif(p_set -> 'brief', 'null'::jsonb) else brief end,
    error = case when p_set ? 'error' then left(p_set ->> 'error', 1000) else error end,
    updated_at = now()
  where id = p_id and status = p_from;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- A checked article (the pipeline's checks ran; the constraints are the last guard): stored with the sources it cites,
-- published, or held for the owner's review when its job is evergreen (decision 10), and its job done.
create function levelmeup.article_store(p_job bigint, p_article jsonb, p_sources jsonb) returns text
language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  j levelmeup.article_jobs;
  new_id text;
begin
  select * into j from levelmeup.article_jobs where id = p_job for update;
  if not found or j.status <> 'writing' then raise exception 'lmu:conflict'; end if;
  new_id := 'article-' || j.id;
  insert into levelmeup.articles (id, job_id, cluster, topic, title, summary, sections, takeaways, reflection_question,
    reading_minutes, words, evergreen, status, published_at)
  values (new_id, j.id, j.cluster, j.topic, p_article ->> 'title', p_article ->> 'summary', p_article -> 'sections',
    p_article -> 'takeaways', p_article ->> 'reflectionQuestion', (p_article ->> 'readingMinutes')::int,
    (p_article ->> 'words')::int, j.evergreen, case when j.evergreen then 'review' else 'published' end,
    case when j.evergreen then null else now() end);
  insert into levelmeup.article_sources (article_id, idx, url, title)
  select new_id, s.idx, s.url, s.title from jsonb_to_recordset(p_sources) as s(idx int, url text, title text);
  update levelmeup.article_jobs set status = 'done', article_id = new_id, error = null, updated_at = now() where id = p_job;
  return new_id;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.reserve_ai_spend(uuid, text, text, numeric, numeric, int, bigint) to lmu_service;
grant execute on function levelmeup.article_tick_begin(int) to lmu_service;
grant execute on function levelmeup.article_tick_end() to lmu_service;
grant execute on function levelmeup.article_claim_night(date) to lmu_service;
grant execute on function levelmeup.article_short_players(int) to lmu_service;
grant execute on function levelmeup.article_topics_used() to lmu_service;
grant execute on function levelmeup.article_queue(jsonb) to lmu_service;
grant execute on function levelmeup.article_jobs_open() to lmu_service;
grant execute on function levelmeup.article_job_move(bigint, text, text, jsonb) to lmu_service;
grant execute on function levelmeup.article_store(bigint, jsonb, jsonb) to lmu_service;
```

- [ ] **Step 4: Run the server's unit tests**

Run: `npm -w supabase test` → all pass, including the migration lints (numbering, inside `levelmeup`, the revoke after
new functions) and the two new tests. Run: `npm run db:deploy -- --dry-run` → lists 0014 as pending, changes nothing.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0014_article_library.sql supabase/tests/unit/articles-schema.test.ts
git commit -m "M8a migration 0014: article jobs, articles and sources, the tick lease, the monthly AI budget reserved before every call"
```

---

### Task 3: Database tests (pgTAP)

**Files:**
- Create: `supabase/tests/db/articles.sql`

The existing `tables.sql` (RLS on every table) and `functions.sql` (`test_permissions`: every definer function is an
entry point for `lmu_service`, nothing for players, the search path pinned) cover the new tables and functions
without change.

- [ ] **Step 1: Write the tests**

```sql
-- The article library (migration 0014): the budget, the pipeline's functions, and what players may read.
-- Runs inside a transaction that always rolls back, after _helpers.sql.

-- A job moved to 'writing', as the pipeline leaves it before an article is stored.
create function lmu_test.writing_job(p_topic text, p_evergreen boolean) returns bigint language plpgsql as $$
declare
  id bigint;
begin
  select q into id from levelmeup.article_queue(jsonb_build_array(jsonb_build_object('cluster', 'sleep', 'topic', p_topic, 'evergreen', p_evergreen))) q;
  perform levelmeup.article_job_move(id, 'queued', 'writing', '{}');
  return id;
end $$;

create function lmu_test.article_json() returns jsonb language sql immutable as $$
  select '{"title": "How sleep cycles work", "summary": "A night of sleep runs in cycles of about ninety minutes.",
    "sections": [{"heading": "Cycles", "paragraphs": ["Text."], "systemNote": null, "sourceIds": [1]}],
    "takeaways": ["Keep a steady wake-up time."], "reflectionQuestion": "When do you wake up?", "words": 900, "readingMinutes": 5}'::jsonb
$$;

create function lmu_test.test_ai_budget() returns setof text language plpgsql as $$
declare
  rid bigint;
begin
  -- Mocked costs: last month's spend doesn't count; this month's is brought to $0.10 under the cap.
  insert into levelmeup.ai_generations (kind, model, status, cost_usd, created_at)
    values ('article', 'claude-opus-5-5', 'ok', 100, now() - interval '40 days');
  insert into levelmeup.ai_generations (kind, model, status, cost_usd)
    values ('article', 'claude-opus-5-5', 'ok', greatest(25 - levelmeup.ai_month_spend() - 0.10, 0));
  return next throws_ok($q$ select levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', 0.20, 25, null, null) $q$,
    'P0001', 'lmu:ai_budget', 'a call that would pass the month''s cap is refused');
  rid := levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', 0.05, 25, null, null);
  return next is((select cost_usd from levelmeup.ai_generations where id = rid), 0.05::numeric(10, 6), 'the estimate is held while the call runs');
  return next is((select status from levelmeup.ai_generations where id = rid), 'pending', 'the call is pending');
  return next throws_ok($q$ select levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', 0.06, 25, null, null) $q$,
    'P0001', 'lmu:ai_budget', 'pending estimates count against the cap');
  perform levelmeup.finish_ai_call(rid, 'ok', 1000, 500, 0.01, null);
  return next is((select cost_usd from levelmeup.ai_generations where id = rid), 0.01::numeric(10, 6), 'the real cost replaces the estimate');
  return next ok(levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', 0.05, 25, null, null) is not null, 'the freed room can be used');
  return next throws_ok($q$ select levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', -1, 25, null, null) $q$,
    'P0001', 'lmu:bad_budget', 'a negative estimate is refused');
end $$;

create function lmu_test.test_ai_player_cap() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
begin
  perform levelmeup.reserve_ai_spend(a, 'onboarding', 'claude-opus-5-5', 0, 1000000, 1, null);
  return next throws_ok(format($q$ select levelmeup.reserve_ai_spend(%L, 'onboarding', 'claude-opus-5-5', 0, 1000000, 1, null) $q$, a),
    'P0001', 'lmu:ai_cap', 'a player''s own cap still applies');
end $$;

create function lmu_test.test_article_lease_and_night() returns setof text language plpgsql as $$
begin
  update levelmeup.article_pipeline set ticking_until = null, queued_night = null;
  return next ok(levelmeup.article_tick_begin(60), 'the first tick takes the lease');
  return next ok(not levelmeup.article_tick_begin(60), 'a second tick waits');
  perform levelmeup.article_tick_end();
  return next ok(levelmeup.article_tick_begin(60), 'the lease is free again after the end');
  update levelmeup.article_pipeline set ticking_until = now() - interval '1 second';
  return next ok(levelmeup.article_tick_begin(60), 'a lapsed lease can be taken');
  return next ok(levelmeup.article_claim_night('2026-10-13'), 'the first tick of a night claims it');
  return next ok(not levelmeup.article_claim_night('2026-10-13'), 'a night is claimed once');
  return next ok(not levelmeup.article_claim_night('2026-10-12'), 'an earlier night can''t be claimed');
  return next ok(levelmeup.article_claim_night('2026-10-14'), 'the next night can');
end $$;

create function lmu_test.test_article_jobs() returns setof text language plpgsql as $$
declare
  ids bigint[];
  a bigint;
begin
  select array_agg(q) into ids from levelmeup.article_queue('[{"cluster": "habits", "topic": "Topic A"}, {"cluster": "focus", "topic": "Topic B", "evergreen": true}]') q;
  a := ids[1];
  return next is(array_length(ids, 1), 2, 'two jobs are queued');
  return next is((select status from levelmeup.article_jobs where id = a), 'queued', 'a job starts queued');
  return next ok((select evergreen from levelmeup.article_jobs where id = ids[2]), 'the evergreen flag is kept');
  return next ok(exists (select 1 from levelmeup.article_jobs_open() j where j.id = a), 'open jobs include it');
  return next ok(exists (select 1 from levelmeup.article_topics_used() t where t.cluster = 'habits' and t.topic = 'Topic A'), 'its topic counts as used');
  return next ok(levelmeup.article_job_move(a, 'queued', 'researching', '{"aiCallId": 7, "submittedAt": "2026-10-13T18:00:00Z", "batchId": null}'), 'a job moves from the status seen');
  return next ok(not levelmeup.article_job_move(a, 'queued', 'researching', '{}'), 'a second move from the old status fails');
  return next is((select ai_call_id from levelmeup.article_jobs where id = a), 7::bigint, 'the call id is set');
  perform levelmeup.article_job_move(a, 'researching', 'researched', '{"brief": {"sources": []}, "aiCallId": null, "error": "x"}');
  return next is((select brief from levelmeup.article_jobs where id = a), '{"sources": []}'::jsonb, 'the brief is stored');
  return next is((select ai_call_id from levelmeup.article_jobs where id = a), null::bigint, 'a JSON null clears a field');
  perform levelmeup.article_job_move(a, 'researched', 'researched', '{"brief": null}');
  return next is((select brief from levelmeup.article_jobs where id = a), null::jsonb, 'the brief can be cleared');
  perform levelmeup.article_job_move(a, 'researched', 'queued', '{"attempt": 2}');
  return next is((select attempt from levelmeup.article_jobs where id = a), 2, 'the attempt is set');
  return next throws_ok(format($q$ select levelmeup.article_job_move(%s, 'queued', 'queued', '{"attempt": 3}') $q$, a), '23514', null, 'a third attempt is refused');
end $$;

create function lmu_test.test_article_store() returns setof text language plpgsql as $$
declare
  daily bigint := lmu_test.writing_job('Topic daily', false);
  green bigint := lmu_test.writing_job('Topic evergreen', true);
  stored text;
begin
  stored := levelmeup.article_store(daily, lmu_test.article_json(), '[{"idx": 1, "url": "https://example.org/sleep", "title": "Sleep"}]');
  return next is(stored, 'article-' || daily, 'an article''s id is article-<job>');
  return next is((select status from levelmeup.articles where id = stored), 'published', 'a daily article is published');
  return next ok((select published_at from levelmeup.articles where id = stored) is not null, 'with its publishing time');
  return next is((select reading_minutes from levelmeup.articles where id = stored), 5, 'the reading time is stored');
  return next is((select count(*) from levelmeup.article_sources where article_id = stored), 1::bigint, 'its sources are stored');
  return next is((select status from levelmeup.article_jobs where id = daily), 'done', 'its job is done');
  return next is((select article_id from levelmeup.article_jobs where id = daily), stored, 'the job names its article');
  stored := levelmeup.article_store(green, lmu_test.article_json(), '[]');
  return next is((select status from levelmeup.articles where id = stored), 'review', 'an evergreen article waits for review');
  return next is((select published_at from levelmeup.articles where id = stored), null::timestamptz, 'unpublished');
  return next throws_ok(format($q$ select levelmeup.article_store(%s, lmu_test.article_json(), '[]') $q$, daily), 'P0001', 'lmu:conflict', 'a job stores one article');
  return next throws_ok(format($q$ select levelmeup.article_store(%s, lmu_test.article_json(), '[{"idx": 1, "url": "ftp://x", "title": "X"}]') $q$,
    lmu_test.writing_job('Topic bad source', false)), '23514', null, 'a source must be a web address');
end $$;

create function lmu_test.test_article_short_players() returns setof text language plpgsql as $$
declare
  big int := (select count(*)::int from levelmeup.articles where status = 'published') + 1;
  before int := levelmeup.article_short_players(big);
  a uuid := lmu_test.start(1);
begin
  return next is(levelmeup.article_short_players(big), before + 1, 'a player who played this week and has too few articles counts');
  update levelmeup.quest_days set created_at = now() - interval '8 days' where user_id = a;
  return next is(levelmeup.article_short_players(big), before, 'a player away for a week does not');
  return next is(levelmeup.article_short_players(0), 0, 'nobody is short of zero articles');
end $$;

create function lmu_test.test_article_reads() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  daily text := levelmeup.article_store(lmu_test.writing_job('Read daily', false), lmu_test.article_json(), '[{"idx": 1, "url": "https://example.org/a", "title": "A"}]');
  green text := levelmeup.article_store(lmu_test.writing_job('Read evergreen', true), lmu_test.article_json(), '[{"idx": 1, "url": "https://example.org/b", "title": "B"}]');
begin
  return next is(lmu_test.count_as(a, format('select 1 from levelmeup.articles where id = %L', daily)), 1::bigint, 'a player reads a published article');
  return next is(lmu_test.count_as(a, format('select 1 from levelmeup.articles where id = %L', green)), 0::bigint, 'not one waiting for review');
  return next is(lmu_test.count_as(a, format('select 1 from levelmeup.article_sources where article_id = %L', daily)), 1::bigint, 'the sources of a published one');
  return next is(lmu_test.count_as(a, format('select 1 from levelmeup.article_sources where article_id = %L', green)), 0::bigint, 'not of one waiting');
  return next matches(lmu_test.try_as(a, 'select * from levelmeup.article_jobs'), '^42501', 'players cannot read the jobs');
  return next matches(lmu_test.try_as(a, 'select * from levelmeup.article_pipeline'), '^42501', 'or the lease');
  return next matches(lmu_test.try_service('select * from levelmeup.articles'), '^42501', 'lmu_service reads articles only as a player');
  return next is(lmu_test.try_service('select * from levelmeup.article_jobs_open()'), null, 'lmu_service runs the pipeline''s functions');
  return next matches(lmu_test.try_service('update levelmeup.article_jobs set status = ''done'''), '^42501', 'but cannot write a job directly');
end $$;
```

- [ ] **Step 2: Check it offline**

Run: `npm -w supabase test` → passes (the DB-test lint checks every `lmu_test.test_*` returns `setof text` and the file
has no transaction control). The file runs on the live project with `npm run db:test -- articles` in Task 12, after
0014 is deployed.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/db/articles.sql
git commit -m "M8a DB tests: the budget with mocked costs, the lease, the night, jobs, storing, short players, who reads what"
```

---

### Task 4: Costs, and the reveal under the budget

**Files:**
- Create: `supabase/functions/_shared/costs.ts`
- Modify: `supabase/functions/lmu-onboarding/index.ts`
- Test: `supabase/tests/unit/articles-costs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// supabase/tests/unit/articles-costs.test.ts
import { describe, expect, it } from 'vitest';
import { ESTIMATE_USD, MONTHLY_CAP_USD, costUsd } from '../../functions/_shared/costs.ts';

describe('costUsd (spec §4.1, prices of 2026-10-12)', () => {
  it('prices Opus 5.5 at $4 / $20 per million tokens, half in a batch', () => {
    expect(costUsd('claude-opus-5-5', { input_tokens: 1_000_000, output_tokens: 1_000_000 }, false)).toBe(24);
    expect(costUsd('claude-opus-5-5', { input_tokens: 1_000_000, output_tokens: 1_000_000 }, true)).toBe(12);
  });

  it('adds $0.01 a web search, batch or not', () => {
    const usage = { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 3 } };
    expect(costUsd('claude-opus-5-5', usage, true)).toBe(0.03);
    expect(costUsd('claude-opus-5-5', usage, false)).toBe(0.03);
  });

  it('prices cache writes and reads', () => {
    expect(costUsd('claude-opus-5-5', { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 }, false)).toBe(5.2);
  });

  it('rounds to the micro-dollar the log keeps', () => {
    expect(costUsd('claude-opus-5-5', { input_tokens: 1234, output_tokens: 567 }, true)).toBe(0.008138);
  });

  it('keeps the cap and generous estimates', () => {
    expect(MONTHLY_CAP_USD).toBe(25);
    expect(ESTIMATE_USD).toEqual({ reveal: 0.05, research: 0.4, write: 0.25 });
  });
});
```

(1,234 × $2 + 567 × $10 per million = $0.002468 + $0.00567 = $0.008138.)

- [ ] **Step 2: Run it to see it fail**

Run: `npm -w supabase test -- articles-costs` → FAIL (no module).

- [ ] **Step 3: Write `costs.ts`**

```ts
// What a Claude call costs (spec §4.1: every AI call logs model, tokens and cost, and a $25 monthly cap is checked
// before each one). Prices of 2026-10-12 from platform.claude.com/docs/en/about-claude/pricing: Claude Opus 5.5 $4 / $20
// per million input / output tokens, cache writes $5 and reads $0.20, all halved in a batch; web search $10 per 1,000
// searches, batch or not. Update this table when the pricing page changes.

export const MONTHLY_CAP_USD = 25;

/** Held against the cap while a call runs, until its real cost replaces it: generous, so the cap is never passed. */
export const ESTIMATE_USD = { reveal: 0.05, research: 0.4, write: 0.25 } as const;

const PRICES = { 'claude-opus-5-5': { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 } } as const;
const SEARCH_USD = 0.01;

export type PricedModel = keyof typeof PRICES;

/** The parts of the API's `usage` that cost money. */
export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
};

export function costUsd(model: PricedModel, usage: Usage, batch: boolean): number {
  const p = PRICES[model];
  const perMillion = usage.input_tokens * p.input + usage.output_tokens * p.output
    + (usage.cache_creation_input_tokens ?? 0) * p.cacheWrite + (usage.cache_read_input_tokens ?? 0) * p.cacheRead;
  const tokens = (perMillion / 1_000_000) * (batch ? 0.5 : 1);
  return Math.round((tokens + (usage.server_tool_use?.web_search_requests ?? 0) * SEARCH_USD) * 1e6) / 1e6;
}
```

- [ ] **Step 4: Put the reveal under the budget**

In `supabase/functions/lmu-onboarding/index.ts`, add the import
`import { ESTIMATE_USD, MONTHLY_CAP_USD, costUsd } from '../_shared/costs.ts';` and replace the `reveal` function with:

```ts
async function reveal(userId: string, choices: Choices): Promise<Reveal> {
  const fallback = templateReveal(choices);
  if (!claudeConfigured()) return fallback;
  let callId: string;
  try {
    callId = one(await db()<{ id: string }[]>`select levelmeup.reserve_ai_spend(${userId}::uuid, 'onboarding', ${REVEAL_MODEL},
      ${ESTIMATE_USD.reveal}::numeric, ${MONTHLY_CAP_USD}::numeric, ${AI_CAP}::int, null::bigint) as id`).id;
  } catch (error) {
    // Over the player's three calls or the month's budget (M8a decision 7): the template reveal, as when Claude is off.
    const code = lmuCode(error);
    if (code === 'ai_cap' || code === 'ai_budget') return fallback;
    throw error;
  }
  const call = await writeReveal(revealFacts(choices));
  const parsed = 'value' in call ? parseReveal(call.value) : null;
  const status = parsed !== null ? 'ok' : 'error' in call ? 'failed' : 'fallback';
  const cost = 'value' in call ? costUsd(REVEAL_MODEL, { input_tokens: call.inputTokens, output_tokens: call.outputTokens }, false) : 0;
  await db()`select levelmeup.finish_ai_call(${callId}::bigint, ${status}, ${'value' in call ? call.inputTokens : null}::int,
    ${'value' in call ? call.outputTokens : null}::int, ${cost}::numeric, ${'error' in call ? call.error : parsed === null ? 'invalid reveal' : null})`;
  return parsed ?? fallback;
}
```

(`reserve_ai_call` from 0003 stays in the database, unused once the functions are deployed; it is removed with the next
migration that touches the AI log. Removing it in 0014 would break the deployed `lmu-onboarding` between `db:deploy`
and `deploy:functions`.)

- [ ] **Step 5: Run the checks**

Run: `npm -w supabase test` → passes. Run: `npm run check:functions` → clean.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/costs.ts supabase/functions/lmu-onboarding/index.ts supabase/tests/unit/articles-costs.test.ts
git commit -m "M8a costs: Opus 5.5 and web search prices, the reveal reserved under the monthly budget with its cost logged"
```

---

### Task 5: The brief from citations

**Files:**
- Create: `supabase/functions/_shared/articles/text.ts`, `supabase/functions/_shared/articles/brief.ts`
- Test: `supabase/tests/unit/articles-brief.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// supabase/tests/unit/articles-brief.test.ts
import { describe, expect, it } from 'vitest';
import { BRIEF_LIMITS, buildBrief, checkBrief } from '../../functions/_shared/articles/brief.ts';
import { shingles, wordCount, wordsOf } from '../../functions/_shared/articles/text.ts';

const cite = (url: string, cited_text = 'Sleep runs in cycles of about ninety minutes each night.', title: string | null = `Title of ${url}`) =>
  ({ type: 'web_search_result_location', url, title, cited_text, encrypted_index: 'x' });

describe('text helpers', () => {
  it('splits words without case or punctuation', () => {
    expect(wordsOf('Sleep, it turns out — matters!')).toEqual(['sleep', 'it', 'turns', 'out', 'matters']);
    expect(wordCount('Ninety-minute cycles.')).toBe(3);
  });

  it('makes runs of n words', () => {
    expect(shingles('a b c d', 3)).toEqual(['a b c', 'b c d']);
    expect(shingles('a b', 3)).toEqual([]);
  });
});

describe('buildBrief (M8a decision 2)', () => {
  const content = [
    { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'sleep cycles' } },
    { type: 'web_search_tool_result', tool_use_id: 's1', content: [] },
    { type: 'text', text: 'Here is what I found.', citations: null },
    { type: 'text', text: 'A sleep cycle lasts about 90 minutes.', citations: [cite('https://a.org/1')] },
    { type: 'text', text: 'Deep sleep comes mostly early in the night.', citations: [cite('https://b.org/2', 'Deep sleep is concentrated in the first half.'), cite('https://a.org/1')] },
    { type: 'text', text: 'Too short.', citations: [cite('https://c.org/3')] },
    { type: 'text', text: 'A fact from a document citation is skipped.', citations: [{ type: 'char_location', cited_text: 'x' }] },
  ];

  it('numbers the cited pages in the order they are first cited', () => {
    expect(buildBrief(content).sources).toEqual([
      { id: 1, url: 'https://a.org/1', title: 'Title of https://a.org/1' },
      { id: 2, url: 'https://b.org/2', title: 'Title of https://b.org/2' },
      { id: 3, url: 'https://c.org/3', title: 'Title of https://c.org/3' },
    ]);
  });

  it('keeps cited passages of 4 words or more as facts, with their sources', () => {
    expect(buildBrief(content).facts).toEqual([
      { id: 1, text: 'A sleep cycle lasts about 90 minutes.', sources: [1] },
      { id: 2, text: 'Deep sleep comes mostly early in the night.', sources: [2, 1] },
    ]);
  });

  it('keeps each cited excerpt once, for the copying check', () => {
    expect(buildBrief(content).excerpts).toEqual(['Sleep runs in cycles of about ninety minutes each night.', 'Deep sleep is concentrated in the first half.']);
  });

  it('names a page by its address when the title is missing, and ignores anything not a web address', () => {
    const brief = buildBrief([{ type: 'text', text: 'One two three four.', citations: [cite('https://d.org/x', 'y', null), cite('javascript:alert(1)')] }]);
    expect(brief.sources).toEqual([{ id: 1, url: 'https://d.org/x', title: 'd.org' }]);
  });

  it('survives anything the model sends', () => {
    expect(buildBrief([null, 3, 'text', { type: 'text' }, { type: 'text', text: 5, citations: [] }])).toEqual({ sources: [], facts: [], excerpts: [] });
  });

  it('caps the facts', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ type: 'text', text: `Fact number ${i} is here.`, citations: [cite('https://a.org/1')] }));
    expect(buildBrief(many).facts).toHaveLength(BRIEF_LIMITS.maxFacts);
  });
});

describe('checkBrief', () => {
  it('needs 2 cited sources and 6 cited facts', () => {
    const facts = (n: number, sources: number[]) => Array.from({ length: n }, (_, i) => ({ id: i + 1, text: 'A fact of words.', sources }));
    expect(checkBrief({ sources: [], facts: facts(6, [1, 2]), excerpts: [] })).toEqual([]);
    expect(checkBrief({ sources: [], facts: facts(6, [1]), excerpts: [] })).toEqual(['the research cites 1 source(s); it needs 2']);
    expect(checkBrief({ sources: [], facts: facts(5, [1, 2]), excerpts: [] })).toEqual(['the research has 5 cited facts; it needs 6']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm -w supabase test -- articles-brief` → FAIL (no module).

- [ ] **Step 3: Write `text.ts`**

```ts
// Word helpers for the article checks (M8a).

/** Lowercase words, letters and digits only, so punctuation and case can't hide a copied run. */
export function wordsOf(text: string): string[] {
  return text.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w !== '');
}

export function wordCount(text: string): number {
  return wordsOf(text).length;
}

/** Every run of n consecutive words, joined by spaces. */
export function shingles(text: string, n: number): string[] {
  const words = wordsOf(text);
  const runs: string[] = [];
  for (let i = 0; i + n <= words.length; i++) runs.push(words.slice(i, i + n).join(' '));
  return runs;
}
```

- [ ] **Step 4: Write `brief.ts`**

```ts
// The research step's brief (architecture §5.2), built by code from the API's own citations (M8a decision 2): each fact
// is a passage Claude wrote while citing search results, and its sources are the pages the API says it cited, so a fact
// can't claim a source it didn't use. The cited excerpts are kept for the copying check.
import { isObject } from '../http.ts';
import { wordCount } from './text.ts';

export type BriefSource = { id: number; url: string; title: string };
export type BriefFact = { id: number; text: string; sources: number[] };
export type Brief = { sources: BriefSource[]; facts: BriefFact[]; excerpts: string[] };

export const BRIEF_LIMITS = { minSources: 2, minFacts: 6, maxSources: 20, maxFacts: 40, factChars: 600 } as const;

function sourceTitle(title: unknown, url: string): string {
  const text = typeof title === 'string' ? title.replace(/\s+/g, ' ').trim() : '';
  if (text !== '') return text.slice(0, 300);
  return new URL(url).hostname;
}

/** The brief in a research answer's content blocks; anything unexpected is skipped (AI output is untrusted input). */
export function buildBrief(content: readonly unknown[]): Brief {
  const sources: BriefSource[] = [];
  const ids = new Map<string, number>();
  const facts: BriefFact[] = [];
  const excerpts = new Set<string>();
  for (const block of content) {
    if (!isObject(block) || block.type !== 'text' || typeof block.text !== 'string' || !Array.isArray(block.citations)) continue;
    const cited = new Set<number>();
    for (const c of block.citations) {
      if (!isObject(c) || c.type !== 'web_search_result_location' || typeof c.url !== 'string') continue;
      if (!/^https?:\/\/[^\s]+$/.test(c.url) || c.url.length > 2000 || !URL.canParse(c.url)) continue;
      let id = ids.get(c.url);
      if (id === undefined) {
        if (sources.length >= BRIEF_LIMITS.maxSources) continue;
        id = sources.length + 1;
        ids.set(c.url, id);
        sources.push({ id, url: c.url, title: sourceTitle(c.title, c.url) });
      }
      cited.add(id);
      if (typeof c.cited_text === 'string' && c.cited_text.trim() !== '') excerpts.add(c.cited_text.trim());
    }
    const text = block.text.replace(/\s+/g, ' ').trim();
    if (cited.size > 0 && wordCount(text) >= 4 && facts.length < BRIEF_LIMITS.maxFacts) {
      facts.push({ id: facts.length + 1, text: text.slice(0, BRIEF_LIMITS.factChars), sources: [...cited] });
    }
  }
  return { sources, facts, excerpts: [...excerpts] };
}

/** Why a brief can't be written from (architecture §5.2: at least 2 sources), or nothing. */
export function checkBrief(brief: Brief): string[] {
  const problems: string[] = [];
  const cited = new Set(brief.facts.flatMap((f) => f.sources));
  if (cited.size < BRIEF_LIMITS.minSources) problems.push(`the research cites ${cited.size} source(s); it needs ${BRIEF_LIMITS.minSources}`);
  if (brief.facts.length < BRIEF_LIMITS.minFacts) problems.push(`the research has ${brief.facts.length} cited facts; it needs ${BRIEF_LIMITS.minFacts}`);
  return problems;
}
```

- [ ] **Step 5: Run the tests**

Run: `npm -w supabase test -- articles-brief` → PASS. Run: `npm -w supabase run typecheck` → clean.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/articles supabase/tests/unit/articles-brief.test.ts
git commit -m "M8a brief: facts and sources built by code from the web search citations, excerpts kept for the copying check"
```

---

### Task 6: The house style, the two requests and the checks

**Files:**
- Create: `supabase/functions/_shared/prompts/style.ts`, `supabase/functions/_shared/prompts/articles.ts`,
  `supabase/functions/_shared/articles/check.ts`
- Test: `supabase/tests/unit/articles-prompts.test.ts`, `supabase/tests/unit/articles-check.test.ts`,
  `supabase/tests/unit/articles-fixtures.ts`

- [ ] **Step 1: Write the shared fixtures**

```ts
// supabase/tests/unit/articles-fixtures.ts
// A brief and an article that pass every check (M8a), for the check and pipeline tests.
import type { Brief } from '../../functions/_shared/articles/brief.ts';

const WORDS = ['steady', 'practice', 'builds', 'calm', 'strength', 'over', 'many', 'weeks', 'while', 'rest', 'keeps',
  'the', 'body', 'ready', 'for', 'more', 'work', 'and', 'small', 'gains', 'stack', 'into', 'real', 'change'];

/** A paragraph of n words, different for each seed, with no run that appears in the excerpts. */
export function paragraph(seed: number, n = 90): string {
  return `${Array.from({ length: n }, (_, i) => WORDS[(i * 7 + seed) % WORDS.length]).join(' ')}.`;
}

export const BRIEF: Brief = {
  sources: [
    { id: 1, url: 'https://a.org/sleep', title: 'Sleep cycles' },
    { id: 2, url: 'https://b.org/rest', title: 'Rest and recovery' },
    { id: 3, url: 'https://c.org/training', title: 'Training' },
  ],
  facts: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, text: `Fact ${i + 1} about sleep and training.`, sources: [(i % 3) + 1] })),
  excerpts: ['A typical night has four to six cycles of about ninety minutes.', 'Muscles adapt during the rest between sessions.'],
};

/** The model's JSON for an article of 5 sections × 2 paragraphs × 90 words (900 words). */
export function articleJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Why rest makes you stronger',
    summary: 'Training breaks the body down a little; rest is when it builds back stronger.',
    sections: [0, 1, 2, 3, 4].map((i) => ({
      heading: `Part ${i + 1}`,
      paragraphs: [paragraph(i * 2), paragraph(i * 2 + 1)],
      system_note: i === 2 ? 'System: Rest days count. They are part of training.' : null,
      source_ids: i < 3 ? [i + 1] : [],
    })),
    takeaways: ['Plan one full rest day this week.', 'Sleep is part of the training plan.'],
    reflection_question: 'Which day this week will you rest on purpose?',
    ...overrides,
  };
}
```

(Each paragraph is 90 words of a 24-word cycle stepped by 7: no 8-word run matches either excerpt, and none of the
words is in a lint list.)

- [ ] **Step 2: Write the failing check test**

```ts
// supabase/tests/unit/articles-check.test.ts
import { describe, expect, it } from 'vitest';
import { articleWords, checkArticle, parseArticle, readingMinutes } from '../../functions/_shared/articles/check.ts';
import type { ArticleDraft } from '../../functions/_shared/articles/check.ts';
import { BRIEF, articleJson, paragraph } from './articles-fixtures.ts';

const draft = (overrides: Record<string, unknown> = {}): ArticleDraft => parseArticle(articleJson(overrides))!;
const withParagraph = (text: string): ArticleDraft => {
  const a = draft();
  a.sections[0]!.paragraphs[0] = text;
  return a;
};

describe('parseArticle', () => {
  it('reads the model JSON into camelCase and trims it', () => {
    const a = draft({ title: '  Why rest makes you stronger ' });
    expect(a.title).toBe('Why rest makes you stronger');
    expect(a.sections[2]!.systemNote).toBe('System: Rest days count. They are part of training.');
    expect(a.sections[0]!.sourceIds).toEqual([1]);
    expect(a.reflectionQuestion).toBe('Which day this week will you rest on purpose?');
  });

  it('turns an empty System note into none', () => {
    const json = articleJson();
    (json.sections as { system_note: string | null }[])[0]!.system_note = '  ';
    expect(parseArticle(json)!.sections[0]!.systemNote).toBeNull();
  });

  it('refuses the wrong shape', () => {
    expect(parseArticle(null)).toBeNull();
    expect(parseArticle(articleJson({ title: 3 }))).toBeNull();
    expect(parseArticle(articleJson({ takeaways: [1] }))).toBeNull();
    expect(parseArticle(articleJson({ sections: [{ heading: 'x', paragraphs: ['y'], system_note: null, source_ids: ['1'] }] }))).toBeNull();
  });
});

describe('words and reading time (M8a decision 3)', () => {
  it('counts the body: paragraphs and System notes', () => {
    expect(articleWords(draft())).toBe(900 + 9);
  });

  it('reads at 180 words a minute: 800 words are 5 minutes, 1,200 are 7', () => {
    expect(readingMinutes(800)).toBe(5);
    expect(readingMinutes(1200)).toBe(7);
    expect(readingMinutes(10)).toBe(1);
  });
});

describe('checkArticle (spec §4.1 step 3)', () => {
  it('passes a good article', () => {
    expect(checkArticle(draft(), BRIEF)).toEqual([]);
  });

  it('needs 800–1,200 words', () => {
    const short = draft();
    short.sections.forEach((s) => s.paragraphs.splice(1));
    expect(checkArticle(short, BRIEF)).toContain('the body has 459 words; it must have 800–1200');
  });

  it('needs 4–7 sections, 2–4 takeaways and a question', () => {
    expect(checkArticle(draft({ sections: (articleJson().sections as unknown[]).slice(0, 3) }), BRIEF)).toContain('an article has 4–7 sections');
    expect(checkArticle(draft({ takeaways: ['Only one takeaway here.'] }), BRIEF)).toContain('2–4 takeaways of 10–200 characters');
    expect(checkArticle(draft({ reflection_question: 'Rest on purpose this week.' }), BRIEF)).toContain(
      'the reflection question must be 10–200 characters and end with "?"');
  });

  it('cites only the brief, at least 2 sources, in at least half the sections', () => {
    const unknown = draft();
    unknown.sections[0]!.sourceIds = [9];
    expect(checkArticle(unknown, BRIEF)).toContain('source 9 is not in the brief');
    const one = draft();
    one.sections.forEach((s) => (s.sourceIds = s.sourceIds.length > 0 ? [1] : []));
    expect(checkArticle(one, BRIEF)).toContain('an article cites at least 2 sources');
    const few = draft();
    few.sections[2]!.sourceIds = [];
    expect(checkArticle(few, BRIEF)).toContain('at least half the sections cite a source');
  });

  it('refuses a quotation of 4 words or more, in any quotes', () => {
    expect(checkArticle(withParagraph(`${paragraph(0, 80)} As one coach put it, "rest is where you grow".`), BRIEF)).toContain(
      'no quotations: "rest is where you grow"');
    expect(checkArticle(withParagraph(`${paragraph(0, 80)} He called it “the slow way to get strong”.`), BRIEF)).toContain(
      'no quotations: "the slow way to get strong"');
    expect(checkArticle(withParagraph(`${paragraph(0, 85)} The word "kaizen" means change.`), BRIEF)).toEqual([]);
  });

  it('refuses 8 words copied from a source', () => {
    expect(checkArticle(withParagraph(`${paragraph(0, 80)} A typical night has four to six cycles of sleep.`), BRIEF)).toContain(
      'repeats 8 or more words of a source');
  });

  it('refuses links, markdown and reference numbers', () => {
    expect(checkArticle(withParagraph(`${paragraph(0, 85)} See https://a.org for more.`), BRIEF).some((p) => p.startsWith('no links'))).toBe(true);
    expect(checkArticle(withParagraph(`${paragraph(0, 85)} This is **important** here.`), BRIEF).some((p) => p.startsWith('no links'))).toBe(true);
    expect(checkArticle(withParagraph(`${paragraph(0, 85)} Studies agree [2].`), BRIEF).some((p) => p.startsWith('no links'))).toBe(true);
  });

  it('runs the article lint on every piece', () => {
    expect(checkArticle(draft({ title: 'Delve into the science of rest' }), BRIEF)).toContain('robotic phrase "delve"');
    expect(checkArticle(draft({ takeaways: ['Only the lazy skip rest days.', 'Sleep is part of training.'] }), BRIEF)).toContain('shaming word "lazy"');
  });
});
```

(The System note "System: Rest days count. They are part of training." is 9 words, so the full body is 909 and the
short article, 5 sections × 90 words + 9, is 459.)

- [ ] **Step 3: Write the failing prompts test**

```ts
// supabase/tests/unit/articles-prompts.test.ts
import { describe, expect, it } from 'vitest';
import { ARTICLE_SHAMING, ROBOTIC_PHRASES } from '../../../packages/content/src/index.ts';
import { ARTICLE_MODEL, ARTICLE_SCHEMA, MAX_SEARCHES, customId, researchRequest, writeRequest } from '../../functions/_shared/prompts/articles.ts';
import { HOUSE_STYLE } from '../../functions/_shared/prompts/style.ts';
import { BRIEF } from './articles-fixtures.ts';

const JOB = { id: 12, attempt: 1, cluster: 'sleep' as const, topic: 'How sleep cycles work' };

/** Every object in a JSON schema, depth first. */
function objects(schema: unknown): Record<string, unknown>[] {
  if (typeof schema !== 'object' || schema === null) return [];
  const node = schema as Record<string, unknown>;
  const children = Object.values(node).flatMap((v) => (Array.isArray(v) ? v.flatMap(objects) : objects(v)));
  return node.type === 'object' ? [node, ...children] : children;
}

describe('the two batch requests (architecture §5.2)', () => {
  it('names each request by job, attempt and step, within the API\'s custom id rules', () => {
    expect(customId(12, 2, 'write')).toBe('job-12-2-write');
    expect(customId(12, 2, 'write')).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
  });

  it('researches with web search, capped, as plain text (citations need it)', () => {
    const r = researchRequest(JOB);
    expect(r.custom_id).toBe('job-12-1-research');
    expect(r.params.model).toBe(ARTICLE_MODEL);
    expect(r.params.tools).toEqual([{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }]);
    expect(MAX_SEARCHES).toBe(5);
    expect(r.params.output_config).toEqual({ effort: 'medium' });
    expect(JSON.stringify(r.params.messages)).toContain('How sleep cycles work');
  });

  it('writes as structured output from the brief, without tools or the pages\' addresses', () => {
    const w = writeRequest(JOB, BRIEF);
    expect(w.custom_id).toBe('job-12-1-write');
    expect(w.params.tools).toBeUndefined();
    expect(w.params.output_config).toEqual({ effort: 'medium', format: { type: 'json_schema', schema: ARTICLE_SCHEMA } });
    const message = JSON.stringify(w.params.messages);
    expect(message).toContain('Sleep cycles');
    expect(message).toContain('Fact 1 about sleep and training.');
    expect(message).not.toContain('https://');
  });

  it('has a schema the API accepts: every object closed, every property required', () => {
    for (const node of objects(ARTICLE_SCHEMA)) {
      expect(node.additionalProperties).toBe(false);
      expect([...(node.required as string[])].sort()).toEqual(Object.keys(node.properties as object).sort());
    }
  });

  it('gives the writer every banned phrase in the house style', () => {
    for (const phrase of [...ROBOTIC_PHRASES, ...ARTICLE_SHAMING]) expect(HOUSE_STYLE).toContain(phrase);
    expect(writeRequest(JOB, BRIEF).params.system).toContain(HOUSE_STYLE);
  });
});
```

- [ ] **Step 4: Run them to see them fail**

Run: `npm -w supabase test -- articles-check articles-prompts` → FAIL (no modules).

- [ ] **Step 5: Write the house style**

```ts
// supabase/functions/_shared/prompts/style.ts
// The house style for LevelMeUp's daily articles (spec §4.1, architecture §5.1): the written guide the writer follows.
// It is copy: edit it like any other words in the game. The hard rules are enforced again by `articles/check.ts`.
import { ARTICLE_SHAMING, ROBOTIC_PHRASES } from '../../../../packages/content/src/index.ts';

export const HOUSE_STYLE = `House style for LevelMeUp articles

Who reads them: players of a self-improvement game with an anime and manhwa feel. They are adults building habits and training body and mind. They read one article a day, in 5 to 7 minutes, often on a phone.

Voice:
- Plain words and short sentences. Explain like a well-read friend, not like a textbook or an advert.
- A strong opening: a concrete scene, a surprising finding or a sharp question. Never open with a definition.
- Memorable examples: a specific study, a moment from history, an everyday situation. Numbers where the brief gives them.
- A light manhwa flavour: the reader is someone levelling up, training is a quest, habits are stats that grow. Use it in a few phrases, never in every paragraph, and never let it bend a fact.
- Occasional System commentary: at most two short System notes in the whole article, in the System's terse game-screen voice (for example: "System: Recovery is part of training. Rest days count."). They sum up or nudge; they never add facts.
- Practical lessons: the last section says what the reader can do this week, small and specific.
- Respect the reader: no shaming, no guilt, no fear. Struggle and failure are normal parts of learning and may be discussed as subjects; the reader is never called names.

Accuracy:
- Every fact comes from the brief, and each section lists the ids of the sources it relies on. Add no facts, numbers, names or dates that are not in the brief.
- Say how strong the evidence is when the brief shows it (one small study, a large review, a historical account).
- No medical or legal advice beyond general, well-established guidance. When pain, injury or illness comes up, suggest a doctor or physiotherapist.

Originality:
- Write every sentence in your own words. Never copy a phrase from the brief or a source.
- No quotations: never put more than three words inside quotation marks, and never attribute words to a real person. Describe ideas instead (Seneca argued that time is the one thing we can't earn back).
- No links, no markdown, no reference numbers in the text. The app lists the sources separately.

Shape: a title under 70 characters; a summary of one or two sentences; 4 to 6 sections with short headings; 800 to 1,200 words in the sections' paragraphs and System notes together; 2 to 4 takeaways of one sentence each; one reflection question that ends with a question mark.

Never use these phrases: ${ROBOTIC_PHRASES.join(', ')}.
Never use these words about anyone: ${ARTICLE_SHAMING.join(', ')}.
No emoji.`;
```

- [ ] **Step 6: Write the requests**

```ts
// supabase/functions/_shared/prompts/articles.ts
// The two Claude requests of the article pipeline (architecture §5.2), both sent through the Message Batches API:
// research with web search, as plain text so its citations come back (code builds the brief from them, M8a decision 2),
// then the article as structured output from that brief (decision 3).
import { CLUSTER_NAMES } from '../../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../../packages/content/src/index.ts';
import type { Brief } from '../articles/brief.ts';
import { HOUSE_STYLE } from './style.ts';

export const ARTICLE_MODEL = 'claude-opus-5-5';

/** Searches per research request (architecture §5.2: "max ~5 uses"). */
export const MAX_SEARCHES = 5;

export type BatchRequest = { custom_id: string; params: Record<string, unknown> };
export type JobRef = { id: number; attempt: number; cluster: ArticleCluster; topic: string };

/** Unique per job, attempt and step, as the Batch API requires within a batch. */
export function customId(jobId: number, attempt: number, step: 'research' | 'write'): string {
  return `job-${jobId}-${attempt}-${step}`;
}

export const RESEARCH_SYSTEM = `You research one topic for a short, evidence-based article in LevelMeUp, a self-improvement game.
Search the web (at most ${MAX_SEARCHES} searches) for reliable sources: research papers and their summaries, universities, public health bodies, reputable encyclopedias, museums and long-form journalism. Avoid forums, shops, product pages and content farms.
Then write 8 to 14 key facts, each as its own short paragraph and each drawn from the search results, so that every fact carries its citation. Include numbers, study sizes and dates where the sources give them, and say when the evidence is weak or disputed.
Write the facts in your own words and never quote. No introduction, no conclusion, no advice: facts only.`;

export function researchRequest(job: JobRef): BatchRequest {
  return {
    custom_id: customId(job.id, job.attempt, 'research'),
    params: {
      model: ARTICLE_MODEL,
      max_tokens: 12000,
      system: RESEARCH_SYSTEM,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }],
      output_config: { effort: 'medium' },
      messages: [{ role: 'user', content: `Topic: ${job.topic}\nArea: ${CLUSTER_NAMES[job.cluster]}` }],
    },
  };
}

const text = (description: string) => ({ type: 'string', description }) as const;

/** The writer's answer (decision 3). Lengths are in the descriptions: the API's schemas take no length limits. */
export const ARTICLE_SCHEMA = {
  type: 'object',
  properties: {
    title: text('Under 70 characters.'),
    summary: text('One or two sentences, under 240 characters.'),
    sections: {
      type: 'array',
      description: '4 to 6 sections. Together their paragraphs and System notes have 800 to 1,200 words.',
      items: {
        type: 'object',
        properties: {
          heading: text('A short heading, under 60 characters.'),
          paragraphs: { type: 'array', items: text('One paragraph of plain prose.'), description: '1 to 4 paragraphs.' },
          system_note: {
            anyOf: [text('A short System note in its terse game-screen voice, starting with "System:".'), { type: 'null' }],
            description: 'At most two sections in the article have one; null otherwise.',
          },
          source_ids: { type: 'array', items: { type: 'integer' }, description: 'The ids of the brief\'s sources this section relies on.' },
        },
        required: ['heading', 'paragraphs', 'system_note', 'source_ids'],
        additionalProperties: false,
      },
    },
    takeaways: { type: 'array', items: text('One sentence.'), description: '2 to 4 takeaways.' },
    reflection_question: text('One question for the reader, ending with a question mark.'),
  },
  required: ['title', 'summary', 'sections', 'takeaways', 'reflection_question'],
  additionalProperties: false,
} as const;

export const WRITE_SYSTEM = `You write one daily article for LevelMeUp from a research brief. Follow the house style exactly.

${HOUSE_STYLE}`;

export function writeRequest(job: JobRef, brief: Brief): BatchRequest {
  // The pages' addresses stay out: the writer cites by id, and the app lists the sources.
  const input = {
    topic: job.topic,
    area: CLUSTER_NAMES[job.cluster],
    sources: brief.sources.map(({ id, title }) => ({ id, title })),
    facts: brief.facts,
  };
  return {
    custom_id: customId(job.id, job.attempt, 'write'),
    params: {
      model: ARTICLE_MODEL,
      max_tokens: 16000,
      system: WRITE_SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ARTICLE_SCHEMA } },
      messages: [{ role: 'user', content: `The research brief (JSON):\n${JSON.stringify(input)}` }],
    },
  };
}
```

(`objects()` in the test walks `anyOf` arrays too; the `anyOf` member is a string schema, not an object, so only the
two object schemas are checked.)

- [ ] **Step 7: Write the checks**

```ts
// supabase/functions/_shared/articles/check.ts
// The code checks an article must pass before anyone reads it (spec §4.1 step 3, M8a decision 4). Never left to the
// model: shape and lengths, sources that exist in the brief, no quotations, no copied wording, no links or markdown,
// and the article lint.
import { lintArticle } from '../../../../packages/content/src/index.ts';
import { isObject } from '../http.ts';
import type { Brief } from './brief.ts';
import { shingles, wordCount } from './text.ts';

export type ArticleSection = { heading: string; paragraphs: string[]; systemNote: string | null; sourceIds: number[] };
export type ArticleDraft = { title: string; summary: string; sections: ArticleSection[]; takeaways: string[]; reflectionQuestion: string };

export const ARTICLE_WORDS = { min: 800, max: 1200 } as const;
/** Words a minute for the reading time: 800 words are 5 minutes, 1,200 are 7 (spec §4.1). */
const WORDS_PER_MINUTE = 180;
/** A run of this many words shared with a source's excerpt is copying. */
export const COPY_RUN = 8;
/** A quotation this long or longer is refused (MVP: no quotes attributed to real people). */
export const QUOTE_WORDS = 4;

const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');
const integers = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => Number.isInteger(n));

/** The model's JSON as an article, or null when its shape is wrong (types only: the checks judge the content). */
export function parseArticle(value: unknown): ArticleDraft | null {
  if (!isObject(value) || typeof value.title !== 'string' || typeof value.summary !== 'string' || !strings(value.takeaways)
    || typeof value.reflection_question !== 'string' || !Array.isArray(value.sections)) return null;
  const sections: ArticleSection[] = [];
  for (const s of value.sections) {
    if (!isObject(s) || typeof s.heading !== 'string' || !strings(s.paragraphs) || !integers(s.source_ids)) return null;
    if (s.system_note !== null && typeof s.system_note !== 'string') return null;
    const note = typeof s.system_note === 'string' ? s.system_note.trim() : '';
    sections.push({ heading: s.heading.trim(), paragraphs: s.paragraphs.map((p) => p.trim()), systemNote: note === '' ? null : note, sourceIds: s.source_ids });
  }
  return {
    title: value.title.trim(),
    summary: value.summary.trim(),
    sections,
    takeaways: value.takeaways.map((t) => t.trim()),
    reflectionQuestion: value.reflection_question.trim(),
  };
}

/** Every piece of text a reader sees. */
export function articleTexts(a: ArticleDraft): string[] {
  return [
    a.title, a.summary,
    ...a.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.systemNote === null ? [] : [s.systemNote])]),
    ...a.takeaways, a.reflectionQuestion,
  ];
}

/** The body's words: paragraphs and System notes. */
export function articleWords(a: ArticleDraft): number {
  return a.sections.reduce((n, s) => n + s.paragraphs.reduce((m, p) => m + wordCount(p), 0) + (s.systemNote === null ? 0 : wordCount(s.systemNote)), 0);
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

const between = (text: string, min: number, max: number): boolean => text.length >= min && text.length <= max;
const QUOTED = /["“”„«»]([^"“”„«»]*)["“”„«»]|‘([^‘’]*)’/g;
const MARKUP = /https?:\/\/|www\.|\*\*|__|##|`|^#|\[\d+\]/m;

/** Why an article can't be published, or nothing. */
export function checkArticle(a: ArticleDraft, brief: Brief): string[] {
  const problems: string[] = [];
  if (!between(a.title, 10, 80)) problems.push('the title must be 10–80 characters');
  if (!between(a.summary, 40, 300)) problems.push('the summary must be 40–300 characters');
  if (a.sections.length < 4 || a.sections.length > 7) problems.push('an article has 4–7 sections');
  for (const s of a.sections) {
    if (!between(s.heading, 2, 70)) problems.push(`heading "${s.heading.slice(0, 40)}" must be 2–70 characters`);
    if (s.paragraphs.length < 1 || s.paragraphs.length > 5 || s.paragraphs.some((p) => !between(p, 20, 1200))) {
      problems.push(`section "${s.heading.slice(0, 40)}" needs 1–5 paragraphs of 20–1,200 characters`);
    }
    if (s.systemNote !== null && !between(s.systemNote, 10, 300)) problems.push('a System note must be 10–300 characters');
  }
  if (a.takeaways.length < 2 || a.takeaways.length > 4 || a.takeaways.some((t) => !between(t, 10, 200))) problems.push('2–4 takeaways of 10–200 characters');
  if (!between(a.reflectionQuestion, 10, 200) || !a.reflectionQuestion.endsWith('?')) {
    problems.push('the reflection question must be 10–200 characters and end with "?"');
  }
  const words = articleWords(a);
  if (words < ARTICLE_WORDS.min || words > ARTICLE_WORDS.max) problems.push(`the body has ${words} words; it must have ${ARTICLE_WORDS.min}–${ARTICLE_WORDS.max}`);

  const known = new Set(brief.sources.map((s) => s.id));
  const cited = new Set(a.sections.flatMap((s) => s.sourceIds));
  for (const id of cited) if (!known.has(id)) problems.push(`source ${id} is not in the brief`);
  if ([...cited].filter((id) => known.has(id)).length < 2) problems.push('an article cites at least 2 sources');
  if (a.sections.filter((s) => s.sourceIds.length > 0).length * 2 < a.sections.length) problems.push('at least half the sections cite a source');

  const texts = articleTexts(a);
  for (const t of texts) {
    for (const m of t.matchAll(QUOTED)) {
      const quoted = m[1] ?? m[2] ?? '';
      if (wordCount(quoted) >= QUOTE_WORDS) problems.push(`no quotations: "${quoted.slice(0, 40)}"`);
    }
    if (MARKUP.test(t)) problems.push(`no links, markdown or reference numbers: "${t.slice(0, 40)}"`);
    problems.push(...lintArticle(t));
  }
  const excerpts = new Set(brief.excerpts.flatMap((e) => shingles(e, COPY_RUN)));
  if (texts.some((t) => shingles(t, COPY_RUN).some((run) => excerpts.has(run)))) problems.push(`repeats ${COPY_RUN} or more words of a source`);
  return [...new Set(problems)];
}
```

- [ ] **Step 8: Run the tests**

Run: `npm -w supabase test -- articles-check articles-prompts` → PASS. Run: `npm -w supabase run typecheck` → clean.
If the fixture's 8-word runs ever collide with an excerpt (they don't with the two above), change an excerpt, not the
check.

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/_shared/prompts supabase/functions/_shared/articles/check.ts supabase/tests/unit/articles-check.test.ts supabase/tests/unit/articles-prompts.test.ts supabase/tests/unit/articles-fixtures.ts
git commit -m "M8a: the house style, the research and writing requests, and the article checks (sources, quotes, copying, lint)"
```

---

### Task 7: Topics and the pipeline

**Files:**
- Create: `supabase/functions/_shared/articles/topics.ts`, `supabase/functions/_shared/articles/pipeline.ts`
- Test: `supabase/tests/unit/articles-topics.test.ts`, `supabase/tests/unit/articles-pipeline.test.ts`

- [ ] **Step 1: Write the failing topics test**

```ts
// supabase/tests/unit/articles-topics.test.ts
import { describe, expect, it } from 'vitest';
import { ARTICLE_CLUSTERS, ARTICLE_TOPICS } from '../../../packages/content/src/index.ts';
import { chooseTopics } from '../../functions/_shared/articles/topics.ts';

describe('chooseTopics (M8a decision 6)', () => {
  it('starts with the first clusters and their first topics', () => {
    expect(chooseTopics([], 2)).toEqual([
      { cluster: 'habits', topic: ARTICLE_TOPICS.habits[0] },
      { cluster: 'psychology', topic: ARTICLE_TOPICS.psychology[0] },
    ]);
  });

  it('takes the clusters queued least recently, never-queued first', () => {
    const used = ARTICLE_CLUSTERS.map((cluster, i) => ({ cluster, topic: ARTICLE_TOPICS[cluster][0]!, queuedAtMs: 100 - i }));
    expect(chooseTopics(used, 2)).toEqual([
      { cluster: 'history', topic: ARTICLE_TOPICS.history[1] },
      { cluster: 'philosophy', topic: ARTICLE_TOPICS.philosophy[1] },
    ]);
  });

  it('never repeats a topic and skips a cluster with none left', () => {
    const used = ARTICLE_TOPICS.habits.map((topic) => ({ cluster: 'habits' as const, topic, queuedAtMs: 0 }));
    expect(chooseTopics(used, 1)).toEqual([{ cluster: 'psychology', topic: ARTICLE_TOPICS.psychology[0] }]);
  });

  it('spreads a large batch over every cluster', () => {
    const picks = chooseTopics([], 20);
    expect(picks).toHaveLength(20);
    expect(new Set(picks.map((p) => p.topic)).size).toBe(20);
    for (const c of ARTICLE_CLUSTERS) expect(picks.filter((p) => p.cluster === c).length).toBeGreaterThanOrEqual(2);
  });

  it('gives fewer when the topics run out', () => {
    const used = ARTICLE_CLUSTERS.flatMap((cluster) => ARTICLE_TOPICS[cluster].map((topic) => ({ cluster, topic, queuedAtMs: 0 })));
    expect(chooseTopics(used, 2)).toEqual([]);
  });
});
```

- [ ] **Step 2: Write `topics.ts`**

```ts
// supabase/functions/_shared/articles/topics.ts
// Which topics the next jobs take (spec §4.1 "rotating through about 8 topic clusters", M8a decision 6): the cluster
// queued least recently first (never-queued ones first, in the content's order), and in it the first topic never
// queued. A cluster whose topics are all used is skipped.
import { ARTICLE_CLUSTERS, ARTICLE_TOPICS } from '../../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../../packages/content/src/index.ts';

export type UsedTopic = { cluster: ArticleCluster; topic: string; queuedAtMs: number };
export type TopicPick = { cluster: ArticleCluster; topic: string };

export function chooseTopics(used: readonly UsedTopic[], count: number): TopicPick[] {
  const taken = new Set(used.map((u) => `${u.cluster}\n${u.topic}`));
  const last = new Map<ArticleCluster, number>();
  for (const u of used) last.set(u.cluster, Math.max(last.get(u.cluster) ?? -1, u.queuedAtMs));
  const order = [...ARTICLE_CLUSTERS].sort((a, b) => (last.get(a) ?? -1) - (last.get(b) ?? -1));
  const picks: TopicPick[] = [];
  let found = true;
  while (picks.length < count && found) {
    found = false;
    for (const cluster of order) {
      if (picks.length >= count) break;
      const topic = ARTICLE_TOPICS[cluster].find((t) => !taken.has(`${cluster}\n${t}`));
      if (topic === undefined) continue;
      taken.add(`${cluster}\n${topic}`);
      picks.push({ cluster, topic });
      found = true;
    }
  }
  return picks;
}
```

- [ ] **Step 3: Run the topics test**

Run: `npm -w supabase test -- articles-topics` → PASS.

- [ ] **Step 4: Write the failing pipeline test**

```ts
// supabase/tests/unit/articles-pipeline.test.ts
import { describe, expect, it } from 'vitest';
import { ARTICLE_TOPICS } from '../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../packages/content/src/index.ts';
import { BATCH_GIVE_UP_MS, nightOf, tick } from '../../functions/_shared/articles/pipeline.ts';
import type { BatchResult, Batches, Finish, Job, JobSet, JobStatus, Store, StoredArticle, StoredSource } from '../../functions/_shared/articles/pipeline.ts';
import type { BatchRequest } from '../../functions/_shared/prompts/articles.ts';
import { articleJson } from './articles-fixtures.ts';

const HOUR = 3_600_000;
const NIGHT = Date.parse('2026-10-13T18:05:00Z');
const DAY = Date.parse('2026-10-13T09:00:00Z');

/** The store as the migration's functions behave, in memory. */
class FakeStore implements Store {
  leased = false;
  night: string | null = null;
  short = 1;
  jobs: Job[] = [];
  calls: { id: number; jobId: number; estimate: number; finish: Finish | null }[] = [];
  articles: { id: string; jobId: number; article: StoredArticle; sources: readonly StoredSource[]; status: 'published' | 'review' }[] = [];
  budgetLeft = 25;
  queuedAt = new Map<string, number>();
  clock = NIGHT;

  async begin() { if (this.leased) return false; this.leased = true; return true; }
  async end() { this.leased = false; }
  async claimNight(night: string) { if (this.night !== null && this.night >= night) return false; this.night = night; return true; }
  async shortPlayers() { return this.short; }
  async topicsUsed() { return this.jobs.map((j) => ({ cluster: j.cluster, topic: j.topic, queuedAtMs: this.queuedAt.get(`${j.id}`) ?? 0 })); }
  async queue(jobs: readonly { cluster: ArticleCluster; topic: string; evergreen: boolean }[]) {
    return jobs.map((j) => {
      const id = this.jobs.length + 1;
      this.jobs.push({ id, ...j, status: 'queued', attempt: 1, batchId: null, aiCallId: null, submittedAtMs: null, brief: null });
      this.queuedAt.set(`${id}`, this.clock);
      return id;
    });
  }
  async openJobs() { return this.jobs.filter((j) => j.status !== 'done' && j.status !== 'failed').map((j) => ({ ...j })); }
  async move(id: number, from: JobStatus, to: JobStatus, set: JobSet) {
    const job = this.jobs.find((j) => j.id === id);
    if (job === undefined || job.status !== from) return false;
    job.status = to;
    if (set.attempt !== undefined) job.attempt = set.attempt;
    if (set.batchId !== undefined) job.batchId = set.batchId;
    if (set.aiCallId !== undefined) job.aiCallId = set.aiCallId;
    if (set.submittedAt !== undefined) job.submittedAtMs = set.submittedAt === null ? null : Date.parse(set.submittedAt);
    if (set.brief !== undefined) job.brief = set.brief;
    if (set.error !== undefined) (job as Job & { error?: string | null }).error = set.error;
    return true;
  }
  async reserve(jobId: number, estimate: number) {
    if (estimate > this.budgetLeft) return 'budget' as const;
    this.budgetLeft -= estimate;
    const id = this.calls.length + 1;
    this.calls.push({ id, jobId, estimate, finish: null });
    return id;
  }
  async finish(id: number, finish: Finish) { this.calls[id - 1]!.finish = finish; }
  async store(jobId: number, article: StoredArticle, sources: readonly StoredSource[]) {
    const job = this.jobs.find((j) => j.id === jobId)!;
    const id = `article-${jobId}`;
    this.articles.push({ id, jobId, article, sources, status: job.evergreen ? 'review' : 'published' });
    job.status = 'done';
    return id;
  }
  job(id: number) { return this.jobs.find((j) => j.id === id)! as Job & { error?: string | null }; }
}

/** The Batch API: submissions are kept; each batch ends when the test gives it results. */
class FakeBatches implements Batches {
  submitted: { id: string; requests: readonly BatchRequest[]; createdAtMs: number }[] = [];
  ended = new Map<string, BatchResult[]>();
  cancelled: string[] = [];
  failNext = false;
  clock = NIGHT;
  async submit(requests: readonly BatchRequest[]) {
    if (this.failNext) { this.failNext = false; throw new Error('overloaded'); }
    const id = `batch-${this.submitted.length + 1}`;
    this.submitted.push({ id, requests, createdAtMs: this.clock });
    return id;
  }
  async state(id: string) { return { ended: this.ended.has(id), createdAtMs: this.submitted.find((b) => b.id === id)!.createdAtMs }; }
  async results(id: string) { return this.ended.get(id) ?? []; }
  async cancel(id: string) { this.cancelled.push(id); }
  /** Ends the last batch with one result per request. */
  finishLast(result: (customId: string) => Omit<BatchResult, 'customId'>) {
    const last = this.submitted.at(-1)!;
    this.ended.set(last.id, last.requests.map((r) => ({ customId: r.custom_id, ...result(r.custom_id) })));
  }
}

const usage = { input_tokens: 20_000, output_tokens: 3_000, server_tool_use: { web_search_requests: 4 } };
const cite = (n: number) => ({ type: 'web_search_result_location', url: `https://s${n % 3}.org/page`, title: `Source ${n % 3}`, cited_text: `Excerpt number ${n} from a page.`, encrypted_index: 'x' });
const researchAnswer = (facts = 8): Omit<BatchResult, 'customId'> => ({
  type: 'succeeded',
  message: { content: Array.from({ length: facts }, (_, i) => ({ type: 'text', text: `Fact ${i} about rest and training.`, citations: [cite(i)] })), stop_reason: 'end_turn', usage },
  error: null,
});
const writeAnswer = (json: unknown = articleJson()): Omit<BatchResult, 'customId'> => ({
  type: 'succeeded',
  message: { content: [{ type: 'text', text: JSON.stringify(json), citations: null }], stop_reason: 'end_turn', usage: { input_tokens: 5_000, output_tokens: 6_000 } },
  error: null,
});

function setup() {
  const store = new FakeStore();
  const batches = new FakeBatches();
  return { store, batches, run: (now = NIGHT) => tick(store, batches, now) };
}

describe('nightOf', () => {
  it('is the UTC date from 18:00 UTC (02:00 in Manila), else none', () => {
    expect(nightOf(Date.parse('2026-10-13T17:59:00Z'))).toBeNull();
    expect(nightOf(Date.parse('2026-10-13T18:00:00Z'))).toBe('2026-10-13');
    expect(nightOf(Date.parse('2026-10-13T23:59:00Z'))).toBe('2026-10-13');
  });
});

describe('tick (architecture §5.2)', () => {
  it('does nothing while another tick holds the lease', async () => {
    const { store, batches, run } = setup();
    store.leased = true;
    expect((await run()).ran).toBe(false);
    expect(store.jobs).toEqual([]);
    expect(batches.submitted).toEqual([]);
  });

  it('queues two topics once a night and submits their research in one batch', async () => {
    const { store, batches, run } = setup();
    const report = await run();
    expect(report).toMatchObject({ ran: true, queued: 2, submitted: 2 });
    expect(store.jobs.map((j) => [j.cluster, j.topic, j.status, j.batchId])).toEqual([
      ['habits', ARTICLE_TOPICS.habits[0], 'researching', 'batch-1'],
      ['psychology', ARTICLE_TOPICS.psychology[0], 'researching', 'batch-1'],
    ]);
    expect(batches.submitted[0]!.requests.map((r) => r.custom_id)).toEqual(['job-1-1-research', 'job-2-1-research']);
    expect(store.calls.map((c) => c.estimate)).toEqual([0.4, 0.4]);
    expect((await run(NIGHT + HOUR)).queued).toBe(0);
    expect(store.leased).toBe(false);
  });

  it('queues nothing before the night, or while every player has enough to read', async () => {
    const day = setup();
    expect((await day.run(DAY)).queued).toBe(0);
    const full = setup();
    full.store.short = 0;
    expect((await full.run()).queued).toBe(0);
  });

  it('turns finished research into a brief and submits the writing in the same tick', async () => {
    const { store, batches, run } = setup();
    await run();
    batches.finishLast(() => researchAnswer());
    const report = await run(NIGHT + HOUR);
    expect(report).toMatchObject({ collected: 2, submitted: 2 });
    expect(store.job(1).status).toBe('writing');
    expect(store.job(1).brief!.sources).toHaveLength(3);
    expect(store.job(1).brief!.facts).toHaveLength(8);
    expect(batches.submitted[1]!.requests.map((r) => r.custom_id)).toEqual(['job-1-1-write', 'job-2-1-write']);
    // The research's real batch cost: 20,000 × $2 + 3,000 × $10 per million, and 4 searches.
    expect(store.calls[0]!.finish).toEqual({ status: 'ok', usage, costUsd: 0.11, error: null });
  });

  it('publishes a checked article with the sources it cites', async () => {
    const { store, batches, run } = setup();
    await run();
    batches.finishLast(() => researchAnswer());
    await run(NIGHT + HOUR);
    batches.finishLast(() => writeAnswer());
    const report = await run(NIGHT + 2 * HOUR);
    expect(report.published).toEqual(['article-1', 'article-2']);
    const [first] = store.articles;
    expect(first!.article.words).toBe(909);
    expect(first!.article.readingMinutes).toBe(6);
    expect(first!.sources.map((s) => s.idx)).toEqual([1, 2, 3]);
    expect(store.calls[2]!.finish).toMatchObject({ status: 'ok', costUsd: 0.07 });
  });

  it('holds an evergreen article for review', async () => {
    const { store, batches, run } = setup();
    store.short = 0;
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: true }]);
    await run(DAY);
    batches.finishLast(() => researchAnswer());
    await run(DAY + HOUR);
    batches.finishLast(() => writeAnswer());
    expect((await run(DAY + 2 * HOUR)).review).toEqual(['article-1']);
    expect(store.articles[0]!.status).toBe('review');
  });

  it('tries a failed article once more the next night, from the research, then gives up', async () => {
    const { store, batches, run } = setup();
    store.short = 0;
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: false }]);
    await run(DAY);
    batches.finishLast(() => researchAnswer(3));
    expect((await run(DAY + HOUR)).retry).toBe(1);
    expect(store.job(1)).toMatchObject({ status: 'retry', attempt: 1, batchId: null, brief: null, error: 'the research has 3 cited facts; it needs 6' });
    expect(store.calls[0]!.finish!.status).toBe('failed');
    await run(DAY + 2 * HOUR);
    expect(store.job(1).status).toBe('retry');
    await run(NIGHT);
    expect(store.job(1)).toMatchObject({ status: 'researching', attempt: 2 });
    expect(batches.submitted.at(-1)!.requests[0]!.custom_id).toBe('job-1-2-research');
    batches.finishLast(() => ({ type: 'errored', message: null, error: 'overloaded_error: busy' }));
    expect((await run(NIGHT + HOUR)).failed).toBe(1);
    expect(store.job(1)).toMatchObject({ status: 'failed', error: 'overloaded_error: busy' });
    expect(store.calls[1]!.finish).toEqual({ status: 'failed', usage: null, costUsd: 0, error: 'overloaded_error: busy' });
  });

  it('counts requeued retries in the night\'s two', async () => {
    const { store, run } = setup();
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: false }]);
    store.jobs[0]!.status = 'retry';
    expect((await run()).queued).toBe(2);
    expect(store.jobs).toHaveLength(2);
  });

  it('refuses an article whose JSON or checks fail', async () => {
    const { store, batches, run } = setup();
    store.short = 0;
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: false }]);
    await run(DAY);
    batches.finishLast(() => researchAnswer());
    await run(DAY + HOUR);
    batches.finishLast(() => writeAnswer({ ...articleJson(), title: 'Delve into rest and how it builds you' }));
    await run(DAY + 2 * HOUR);
    expect(store.job(1)).toMatchObject({ status: 'retry', error: 'robotic phrase "delve"' });
    expect(store.articles).toEqual([]);
  });

  it('keeps a job queued when the month\'s budget is spent, and says so', async () => {
    const { store, batches, run } = setup();
    store.budgetLeft = 0.5;
    const report = await run();
    expect(report).toMatchObject({ queued: 2, submitted: 1, budget: true });
    expect(store.jobs.map((j) => j.status)).toEqual(['researching', 'queued']);
    expect(batches.submitted[0]!.requests).toHaveLength(1);
  });

  it('puts the jobs back when the submission fails, using no attempt', async () => {
    const { store, batches, run } = setup();
    batches.failNext = true;
    expect((await run()).submitted).toBe(0);
    expect(store.jobs.map((j) => [j.status, j.attempt, j.aiCallId])).toEqual([['queued', 1, null], ['queued', 1, null]]);
    expect(store.calls.map((c) => c.finish!.costUsd)).toEqual([0, 0]);
    expect((await run(NIGHT + HOUR)).submitted).toBe(2);
  });

  it('notices a submission that died midway and keeps its estimate on the books', async () => {
    const { store, batches, run } = setup();
    store.short = 0;
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: false }]);
    const call = await store.reserve(1, 0.4);
    await store.move(1, 'queued', 'researching', { aiCallId: call as number, submittedAt: new Date(DAY).toISOString(), batchId: null });
    await run(DAY + 2 * HOUR);
    expect(store.calls[0]!.finish).toEqual({ status: 'failed', usage: null, costUsd: 0.4, error: 'the submission did not finish' });
    expect(store.job(1).status).toBe('researching');
    expect(store.job(1).batchId).toBe('batch-1');
    expect(batches.submitted).toHaveLength(1);
  });

  it('cancels a batch still running after 25 hours, and fails its jobs when it ends', async () => {
    const { store, batches, run } = setup();
    await run();
    store.short = 0; // the next night queues nothing, so batch-1 stays the last batch
    await run(NIGHT + BATCH_GIVE_UP_MS + HOUR);
    expect(batches.cancelled).toEqual(['batch-1']);
    batches.finishLast(() => ({ type: 'canceled', message: null, error: 'canceled' }));
    await run(NIGHT + BATCH_GIVE_UP_MS + 2 * HOUR);
    expect(store.jobs.map((j) => j.status)).toEqual(['retry', 'retry']);
  });

  it('treats a paused or cut-off answer as a failure', async () => {
    const { store, batches, run } = setup();
    await run();
    batches.finishLast(() => ({ ...researchAnswer(), message: { ...researchAnswer().message!, stop_reason: 'pause_turn' } }));
    await run(NIGHT + HOUR);
    expect(store.job(1)).toMatchObject({ status: 'retry', error: 'stop_reason pause_turn' });
  });
});
```

Notes for the numbers: the research costs 20,000 × $2 / 1M + 3,000 × $10 / 1M + 4 × $0.01 = $0.04 + $0.03 + $0.04 =
$0.11; the writing 5,000 × $2 / 1M + 6,000 × $10 / 1M = $0.01 + $0.06 = $0.07. 909 words at 180 a minute is 6 minutes.
In "notices a submission that died midway", the stale job goes back to `queued` and the same tick submits it again (a
new batch), so it ends `researching` with `batch-1` (the fake numbers batches from 1).

- [ ] **Step 5: Run it to see it fail**

Run: `npm -w supabase test -- articles-pipeline` → FAIL (no module).

- [ ] **Step 6: Write `pipeline.ts`**

```ts
// supabase/functions/_shared/articles/pipeline.ts
// The article pipeline (architecture §5.2), one step per tick: queue the night's jobs, collect finished batches
// (research becomes a brief, writing a checked article), and submit what is ready. Pure apart from its two ports, so
// the whole state machine is tested with fakes; `store.ts` (Postgres) and `batches.ts` (the Batch API) are the real
// ones. Every job moves only from the status this tick saw (M8a decision 8).
import type { ArticleCluster } from '../../../../packages/content/src/index.ts';
import { ESTIMATE_USD, costUsd } from '../costs.ts';
import type { Usage } from '../costs.ts';
import { ARTICLE_MODEL, customId, researchRequest, writeRequest } from '../prompts/articles.ts';
import type { BatchRequest } from '../prompts/articles.ts';
import { buildBrief, checkBrief } from './brief.ts';
import type { Brief } from './brief.ts';
import { articleWords, checkArticle, parseArticle, readingMinutes } from './check.ts';
import type { ArticleDraft } from './check.ts';
import { chooseTopics } from './topics.ts';
import type { UsedTopic } from './topics.ts';

/** A tick holds the pipeline this long at most; a tick that dies frees it when the lease lapses. */
export const LEASE_SECONDS = 240;
/** The night starts at 18:00 UTC, 02:00 in Manila. */
export const NIGHT_HOUR_UTC = 18;
/** Spec §4.1: two new articles a night… */
export const ARTICLES_PER_NIGHT = 2;
/** …while some player who played this week has fewer than two weeks of articles they haven't been given. */
export const MIN_UNREAD = 14;
/** A batch still running after this is cancelled (the API's own limit is 24 hours). */
export const BATCH_GIVE_UP_MS = 25 * 60 * 60 * 1000;
/** A job marked submitted, still without a batch id after this: its submission died midway. */
export const SUBMIT_STALE_MS = 60 * 60 * 1000;

export type JobStatus = 'queued' | 'researching' | 'researched' | 'writing' | 'retry' | 'done' | 'failed';
export type Job = {
  id: number;
  cluster: ArticleCluster;
  topic: string;
  evergreen: boolean;
  status: JobStatus;
  attempt: number;
  batchId: string | null;
  aiCallId: number | null;
  submittedAtMs: number | null;
  brief: Brief | null;
};
/** The fields a move sets (`article_job_move`); null clears one. */
export type JobSet = { attempt?: number; batchId?: string | null; aiCallId?: number | null; submittedAt?: string | null; brief?: Brief | null; error?: string | null };
export type StoredArticle = ArticleDraft & { words: number; readingMinutes: number };
export type StoredSource = { idx: number; url: string; title: string };
export type Finish = { status: 'ok' | 'failed'; usage: Usage | null; costUsd: number; error: string | null };

export interface Store {
  begin(seconds: number): Promise<boolean>;
  end(): Promise<void>;
  claimNight(night: string): Promise<boolean>;
  shortPlayers(minUnread: number): Promise<number>;
  topicsUsed(): Promise<UsedTopic[]>;
  queue(jobs: readonly { cluster: ArticleCluster; topic: string; evergreen: boolean }[]): Promise<number[]>;
  openJobs(): Promise<Job[]>;
  move(id: number, from: JobStatus, to: JobStatus, set: JobSet): Promise<boolean>;
  /** The reserved call's id, or 'budget' when the estimate would take the month past the cap. */
  reserve(jobId: number, estimateUsd: number): Promise<number | 'budget'>;
  finish(aiCallId: number, finish: Finish): Promise<void>;
  store(jobId: number, article: StoredArticle, sources: readonly StoredSource[]): Promise<string>;
}

export type BatchMessage = { content: readonly unknown[]; stop_reason: string | null; usage: Usage };
export type BatchResult = { customId: string; type: 'succeeded' | 'errored' | 'canceled' | 'expired'; message: BatchMessage | null; error: string | null };

export interface Batches {
  submit(requests: readonly BatchRequest[]): Promise<string>;
  state(batchId: string): Promise<{ ended: boolean; createdAtMs: number }>;
  results(batchId: string): Promise<BatchResult[]>;
  cancel(batchId: string): Promise<void>;
}

export type TickReport = {
  ran: boolean; queued: number; submitted: number; collected: number; published: string[]; review: string[]; retry: number; failed: number; budget: boolean;
};

/** The UTC date whose night has begun by `nowMs`, or null before 18:00 UTC. */
export function nightOf(nowMs: number): string | null {
  const at = new Date(nowMs);
  return at.getUTCHours() >= NIGHT_HOUR_UTC ? at.toISOString().slice(0, 10) : null;
}

export async function tick(store: Store, batches: Batches, nowMs: number): Promise<TickReport> {
  const report: TickReport = { ran: false, queued: 0, submitted: 0, collected: 0, published: [], review: [], retry: 0, failed: 0, budget: false };
  if (!(await store.begin(LEASE_SECONDS))) return report;
  report.ran = true;
  try {
    report.queued = await queueNight(store, nowMs);
    await collect(store, batches, nowMs, report);
    await submit(store, batches, nowMs, report, 'queued');
    await submit(store, batches, nowMs, report, 'researched');
  } finally {
    await store.end();
  }
  return report;
}

async function queueNight(store: Store, nowMs: number): Promise<number> {
  const night = nightOf(nowMs);
  if (night === null || !(await store.claimNight(night))) return 0;
  // Spec §4.1: a failed article is tried once more the next night.
  let retried = 0;
  for (const job of await store.openJobs()) {
    if (job.status === 'retry' && (await store.move(job.id, 'retry', 'queued', { attempt: 2, error: null }))) retried++;
  }
  const wanted = (await store.shortPlayers(MIN_UNREAD)) > 0 ? Math.max(0, ARTICLES_PER_NIGHT - retried) : 0;
  if (wanted === 0) return retried;
  const picks = chooseTopics(await store.topicsUsed(), wanted);
  if (picks.length > 0) await store.queue(picks.map((p) => ({ ...p, evergreen: false })));
  return retried + picks.length;
}

const inFlight = (job: Job): boolean => job.status === 'researching' || job.status === 'writing';
const stepOf = (job: Job): 'research' | 'write' => (job.status === 'researching' || job.status === 'queued' ? 'research' : 'write');

async function collect(store: Store, batches: Batches, nowMs: number, report: TickReport): Promise<void> {
  const jobs = await store.openJobs();
  for (const job of jobs) {
    if (inFlight(job) && job.batchId === null && job.submittedAtMs !== null && nowMs - job.submittedAtMs > SUBMIT_STALE_MS) {
      await unsubmit(store, job, 'the submission did not finish');
    }
  }
  const batchIds = [...new Set(jobs.flatMap((j) => (inFlight(j) && j.batchId !== null ? [j.batchId] : [])))];
  for (const batchId of batchIds) {
    const state = await batches.state(batchId);
    if (!state.ended) {
      // Its jobs fail when the cancelled batch ends (its results say "canceled").
      if (nowMs - state.createdAtMs > BATCH_GIVE_UP_MS) await batches.cancel(batchId);
      continue;
    }
    const results = new Map((await batches.results(batchId)).map((r) => [r.customId, r]));
    for (const job of jobs.filter((j) => j.batchId === batchId && inFlight(j))) {
      report.collected++;
      const result = results.get(customId(job.id, job.attempt, stepOf(job)));
      if (job.status === 'researching') await collectResearch(store, job, result, report);
      else await collectWrite(store, job, result, report);
    }
  }
}

/** A submission that died midway: its estimate stays spent (it may have gone out) and the job goes back a step. */
async function unsubmit(store: Store, job: Job, error: string): Promise<void> {
  const step = stepOf(job);
  if (job.aiCallId !== null) await store.finish(job.aiCallId, { status: 'failed', usage: null, costUsd: ESTIMATE_USD[step], error });
  await store.move(job.id, job.status, step === 'research' ? 'queued' : 'researched', { aiCallId: null, submittedAt: null, error });
}

/** The usable answer in a result, or why there is none; its cost is known whenever the API answered. */
function answered(result: BatchResult | undefined): { message: BatchMessage | null; error: string | null } {
  if (result === undefined) return { message: null, error: 'no result in the batch' };
  if (result.type !== 'succeeded' || result.message === null) return { message: null, error: result.error ?? result.type };
  const stop = result.message.stop_reason;
  return { message: result.message, error: stop === 'end_turn' ? null : `stop_reason ${stop}` };
}

async function finishCall(store: Store, job: Job, message: BatchMessage | null, problems: readonly string[]): Promise<void> {
  if (job.aiCallId === null) return;
  await store.finish(job.aiCallId, {
    status: problems.length === 0 ? 'ok' : 'failed',
    usage: message?.usage ?? null,
    costUsd: message === null ? 0 : costUsd(ARTICLE_MODEL, message.usage, true),
    error: problems.length === 0 ? null : problems.join('; '),
  });
}

async function collectResearch(store: Store, job: Job, result: BatchResult | undefined, report: TickReport): Promise<void> {
  const { message, error } = answered(result);
  const brief = message !== null && error === null ? buildBrief(message.content) : null;
  const problems = brief === null ? [error ?? 'no answer'] : checkBrief(brief);
  await finishCall(store, job, message, problems);
  if (problems.length > 0) return failAttempt(store, job, problems.join('; '), report);
  await store.move(job.id, 'researching', 'researched', { brief, batchId: null, aiCallId: null, submittedAt: null, error: null });
}

/** The JSON in an answer's text blocks, or undefined. */
function answerJson(content: readonly unknown[]): unknown {
  const text = content.flatMap((b) => (typeof b === 'object' && b !== null && (b as { type?: unknown }).type === 'text' ? [String((b as { text?: unknown }).text ?? '')] : [])).join('');
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function collectWrite(store: Store, job: Job, result: BatchResult | undefined, report: TickReport): Promise<void> {
  const { message, error } = answered(result);
  const draft = message !== null && error === null ? parseArticle(answerJson(message.content)) : null;
  const problems = error !== null ? [error]
    : draft === null ? ['the article does not match its schema']
    : job.brief === null ? ['the brief is missing']
    : checkArticle(draft, job.brief);
  await finishCall(store, job, message, problems);
  if (problems.length > 0 || draft === null || job.brief === null) return failAttempt(store, job, problems.join('; '), report);
  const words = articleWords(draft);
  const cited = new Set(draft.sections.flatMap((s) => s.sourceIds));
  const sources = job.brief.sources.filter((s) => cited.has(s.id)).map((s) => ({ idx: s.id, url: s.url, title: s.title }));
  const id = await store.store(job.id, { ...draft, words, readingMinutes: readingMinutes(words) }, sources);
  (job.evergreen ? report.review : report.published).push(id);
}

async function failAttempt(store: Store, job: Job, error: string, report: TickReport): Promise<void> {
  const to: JobStatus = job.attempt < 2 ? 'retry' : 'failed';
  await store.move(job.id, job.status, to, { batchId: null, aiCallId: null, submittedAt: null, brief: null, error: error.slice(0, 1000) });
  if (to === 'retry') report.retry++;
  else report.failed++;
}

async function submit(store: Store, batches: Batches, nowMs: number, report: TickReport, from: 'queued' | 'researched'): Promise<void> {
  if (report.budget) return;
  const step = from === 'queued' ? 'research' : 'write';
  const to: JobStatus = from === 'queued' ? 'researching' : 'writing';
  const ready: { job: Job; aiCallId: number }[] = [];
  for (const job of (await store.openJobs()).filter((j) => j.status === from)) {
    if (step === 'write' && job.brief === null) {
      await failAttempt(store, job, 'the brief is missing', report);
      continue;
    }
    const reserved = await store.reserve(job.id, ESTIMATE_USD[step]);
    if (reserved === 'budget') {
      report.budget = true;
      break;
    }
    if (await store.move(job.id, from, to, { aiCallId: reserved, submittedAt: new Date(nowMs).toISOString(), batchId: null })) {
      ready.push({ job, aiCallId: reserved });
    } else {
      await store.finish(reserved, { status: 'failed', usage: null, costUsd: 0, error: 'another tick moved the job' });
    }
  }
  if (ready.length === 0) return;
  let batchId: string;
  try {
    batchId = await batches.submit(ready.map(({ job }) => (step === 'research' ? researchRequest(job) : writeRequest(job, job.brief!))));
  } catch (error) {
    // Nothing was sent: the jobs go back and the next tick tries again. A technical error uses no attempt.
    for (const { job, aiCallId } of ready) {
      await store.finish(aiCallId, { status: 'failed', usage: null, costUsd: 0, error: `submit: ${String(error).slice(0, 200)}` });
      await store.move(job.id, to, from, { aiCallId: null, submittedAt: null });
    }
    return;
  }
  for (const { job } of ready) await store.move(job.id, to, to, { batchId });
  report.submitted += ready.length;
}
```

- [ ] **Step 7: Run the tests**

Run: `npm -w supabase test -- articles-pipeline articles-topics` → PASS.
Run: `npm -w supabase run typecheck` → clean.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/_shared/articles/topics.ts supabase/functions/_shared/articles/pipeline.ts supabase/tests/unit/articles-topics.test.ts supabase/tests/unit/articles-pipeline.test.ts
git commit -m "M8a pipeline: the nightly topics, research -> brief -> writing -> checked article, retries, the budget, stale and stuck batches"
```

---

### Task 8: The tick function

**Files:**
- Create: `supabase/functions/_shared/articles/auth.ts`, `supabase/functions/_shared/articles/store.ts`,
  `supabase/functions/_shared/articles/batches.ts`, `supabase/functions/lmu-articles-tick/index.ts`,
  `supabase/tests/unit/articles-auth.test.ts`, `supabase/tests/live/articles.test.ts`
- Modify: `supabase/tsconfig.json`, `package.json`

- [ ] **Step 1: Write the failing auth test**

```ts
// supabase/tests/unit/articles-auth.test.ts
import { describe, expect, it } from 'vitest';
import { TICK_SECRET_MIN, tickAllowed } from '../../functions/_shared/articles/auth.ts';

const SECRET = 'a'.repeat(64);

describe('tickAllowed (M8a decision 8)', () => {
  it('lets the secret in', () => {
    expect(tickAllowed(SECRET, SECRET)).toBe(true);
  });

  it('refuses anything else', () => {
    expect(tickAllowed(null, SECRET)).toBe(false);
    expect(tickAllowed('', SECRET)).toBe(false);
    expect(tickAllowed('a'.repeat(63), SECRET)).toBe(false);
    expect(tickAllowed(`${SECRET}a`, SECRET)).toBe(false);
    expect(tickAllowed(`${'a'.repeat(63)}b`, SECRET)).toBe(false);
  });

  it('is off while the secret is missing or short', () => {
    expect(tickAllowed('', '')).toBe(false);
    expect(tickAllowed('short', 'short')).toBe(false);
    expect(TICK_SECRET_MIN).toBe(32);
  });
});
```

- [ ] **Step 2: Write `auth.ts`**

```ts
// supabase/functions/_shared/articles/auth.ts
// Who may run a tick (M8a decision 8): whoever holds LMU_TICK_SECRET, which is the cron (through the Vault) and the
// owner's `npm run articles -- tick`. The gateway's JWT check stays on; this is the check behind it.

/** The shortest secret accepted: `articles setup` makes 64 hex characters. */
export const TICK_SECRET_MIN = 32;

const encoder = new TextEncoder();

/** Constant time, so the answer's timing doesn't reveal how much of a guess was right. */
export function tickAllowed(given: string | null, secret: string): boolean {
  if (secret.length < TICK_SECRET_MIN || given === null) return false;
  const a = encoder.encode(given);
  const b = encoder.encode(secret);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i]!;
  return diff === 0;
}
```

Run: `npm -w supabase test -- articles-auth` → PASS.

- [ ] **Step 3: Write the store**

```ts
// supabase/functions/_shared/articles/store.ts
// The pipeline's store on Postgres (migration 0014). lmu_service calls the article functions; it can't touch the
// tables (M8a decision 9).
import type postgres from 'npm:postgres@3.4.9';
import type { ArticleCluster } from '../../../../packages/content/src/index.ts';
import { MONTHLY_CAP_USD } from '../costs.ts';
import { lmuCode, one } from '../db.ts';
import type { Sql } from '../db.ts';
import { ARTICLE_MODEL } from '../prompts/articles.ts';
import type { Brief } from './brief.ts';
import type { Job, JobStatus, Store } from './pipeline.ts';

type JobRow = {
  id: string; cluster: ArticleCluster; topic: string; evergreen: boolean; status: JobStatus; attempt: number;
  batch_id: string | null; ai_call_id: string | null; submitted_at: Date | null; brief: Brief | null;
};

const toJob = (r: JobRow): Job => ({
  id: Number(r.id), cluster: r.cluster, topic: r.topic, evergreen: r.evergreen, status: r.status, attempt: r.attempt,
  batchId: r.batch_id, aiCallId: r.ai_call_id === null ? null : Number(r.ai_call_id),
  submittedAtMs: r.submitted_at === null ? null : r.submitted_at.getTime(), brief: r.brief,
});

export function sqlStore(sql: Sql): Store {
  const j = (value: unknown) => sql.json(value as postgres.JSONValue);
  return {
    async begin(seconds) {
      return one(await sql<{ ok: boolean }[]>`select levelmeup.article_tick_begin(${seconds}::int) as ok`).ok;
    },
    async end() {
      await sql`select levelmeup.article_tick_end()`;
    },
    async claimNight(night) {
      return one(await sql<{ ok: boolean }[]>`select levelmeup.article_claim_night(${night}::date) as ok`).ok;
    },
    async shortPlayers(minUnread) {
      return one(await sql<{ n: number }[]>`select levelmeup.article_short_players(${minUnread}::int) as n`).n;
    },
    async topicsUsed() {
      const rows = await sql<{ cluster: ArticleCluster; topic: string; queued_at: Date }[]>`select * from levelmeup.article_topics_used()`;
      return rows.map((r) => ({ cluster: r.cluster, topic: r.topic, queuedAtMs: r.queued_at.getTime() }));
    },
    async queue(jobs) {
      return (await sql<{ id: string }[]>`select levelmeup.article_queue(${j(jobs)}::jsonb) as id`).map((r) => Number(r.id));
    },
    async openJobs() {
      return (await sql<JobRow[]>`select * from levelmeup.article_jobs_open()`).map(toJob);
    },
    async move(id, from, to, set) {
      return one(await sql<{ ok: boolean }[]>`select levelmeup.article_job_move(${id}::bigint, ${from}, ${to}, ${j(set)}::jsonb) as ok`).ok;
    },
    async reserve(jobId, estimateUsd) {
      try {
        const row = one(await sql<{ id: string }[]>`select levelmeup.reserve_ai_spend(null::uuid, 'article', ${ARTICLE_MODEL},
          ${estimateUsd}::numeric, ${MONTHLY_CAP_USD}::numeric, null::int, ${jobId}::bigint) as id`);
        return Number(row.id);
      } catch (error) {
        if (lmuCode(error) === 'ai_budget') return 'budget';
        throw error;
      }
    },
    async finish(aiCallId, f) {
      await sql`select levelmeup.finish_ai_call(${aiCallId}::bigint, ${f.status}, ${f.usage?.input_tokens ?? null}::int,
        ${f.usage?.output_tokens ?? null}::int, ${f.costUsd}::numeric, ${f.error})`;
    },
    async store(jobId, article, sources) {
      return one(await sql<{ id: string }[]>`select levelmeup.article_store(${jobId}::bigint, ${j(article)}::jsonb, ${j(sources)}::jsonb) as id`).id;
    },
  };
}
```

- [ ] **Step 4: Write the Batch API port**

```ts
// supabase/functions/_shared/articles/batches.ts
// The Message Batches API for the pipeline (architecture §5.2). With claude.ts, the only files that talk to Claude.
import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import type { BatchRequest } from '../prompts/articles.ts';
import type { BatchResult, Batches } from './pipeline.ts';

export function claudeBatches(): Batches {
  const client = new Anthropic({ apiKey: Deno.env.get('LMU_ANTHROPIC_API_KEY'), maxRetries: 2, timeout: 60_000 });
  return {
    async submit(requests: readonly BatchRequest[]) {
      // The requests are built and tested in prompts/articles.ts; the SDK's own types are too strict for plain records.
      const batch = await client.messages.batches.create({ requests: requests as unknown as Anthropic.Messages.Batches.BatchCreateParams.Request[] });
      return batch.id;
    },
    async state(batchId) {
      const batch = await client.messages.batches.retrieve(batchId);
      return { ended: batch.processing_status === 'ended', createdAtMs: Date.parse(batch.created_at) };
    },
    async results(batchId) {
      const out: BatchResult[] = [];
      for await (const entry of await client.messages.batches.results(batchId)) {
        const r = entry.result;
        if (r.type === 'succeeded') {
          out.push({ customId: entry.custom_id, type: 'succeeded', message: { content: r.message.content, stop_reason: r.message.stop_reason, usage: r.message.usage }, error: null });
        } else {
          const error = r.type === 'errored' ? `${r.error.error.type}: ${r.error.error.message}`.slice(0, 300) : r.type;
          out.push({ customId: entry.custom_id, type: r.type, message: null, error });
        }
      }
      return out;
    },
    async cancel(batchId) {
      await client.messages.batches.cancel(batchId);
    },
  };
}
```

- [ ] **Step 5: Write the function**

```ts
// supabase/functions/lmu-articles-tick/index.ts
// POST /functions/v1/lmu-articles-tick — the article pipeline's heartbeat (architecture §5.2): Supabase Cron calls it
// every 30 minutes, and the owner's `npm run articles -- tick` on demand. It answers only to the tick secret, compared
// in constant time (M8a decision 8): players get a 401 like anyone else. Off until LMU_TICK_SECRET and
// LMU_ANTHROPIC_API_KEY are both set.
import { claudeConfigured } from '../_shared/claude.ts';
import { db } from '../_shared/db.ts';
import { json, problem, problemResponse } from '../_shared/http.ts';
import { tickAllowed } from '../_shared/articles/auth.ts';
import { claudeBatches } from '../_shared/articles/batches.ts';
import { tick } from '../_shared/articles/pipeline.ts';
import { sqlStore } from '../_shared/articles/store.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return problemResponse(problem(405, 'method_not_allowed'));
  if (!tickAllowed(req.headers.get('x-lmu-tick'), Deno.env.get('LMU_TICK_SECRET') ?? '')) return problemResponse(problem(401, 'unauthorized'));
  if (!claudeConfigured()) return problemResponse(problem(503, 'off'));
  try {
    return json(200, await tick(sqlStore(db()), claudeBatches(), Date.now()));
  } catch (error) {
    console.error('lmu-articles-tick failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
```

- [ ] **Step 6: Wire it in**

`supabase/tsconfig.json`: add `"functions/_shared/articles/store.ts"` and `"functions/_shared/articles/batches.ts"` to
`exclude` (they import `npm:` modules, like `db.ts` and `claude.ts`; `deno check` covers them).

`package.json` (root): append ` supabase/functions/lmu-articles-tick/index.ts` to `check:functions`, insert
` lmu-articles-tick` after `lmu-account-delete` in `deploy:functions`, and add the script
`"articles": "node scripts/articles.ts",` after `lmu:password`.

- [ ] **Step 7: Write the live test**

```ts
// supabase/tests/live/articles.test.ts
// lmu-articles-tick (M8a decision 8): the gateway lets the publishable key through, the function refuses anyone
// without the tick secret, a player included. No Claude call is made.
import { describe, expect, it } from 'vitest';
import { ANON_KEY, PUBLISHABLE_KEY, URL_BASE } from './helpers.ts';

const tick = (headers: Record<string, string>) =>
  fetch(`${URL_BASE}/functions/v1/lmu-articles-tick`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}' });

describe('lmu-articles-tick', () => {
  it('reaches the function with the publishable key, which refuses a caller without the secret', async () => {
    const res = await tick({ apikey: PUBLISHABLE_KEY });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('refuses a wrong secret with a valid JWT', async () => {
    const res = await tick({ apikey: ANON_KEY, authorization: `Bearer ${ANON_KEY}`, 'x-lmu-tick': 'x'.repeat(64) });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });
});
```

(If the first test gets the gateway's own 401 instead of `{ error: 'unauthorized' }`, the gateway doesn't accept the
publishable key on `apikey` alone: then the cron sends it as `Authorization: Bearer <publishable key>` too (the docs say
the check accepts it there), `cronOnSql` gains that header, and the test sends it.)

- [ ] **Step 8: Run the checks**

Run: `npm run check:functions` → clean (four functions). Run: `npm -w supabase test` → passes. Run:
`npm -w supabase run typecheck` → clean.

- [ ] **Step 9: Commit**

```bash
git add supabase/functions supabase/tsconfig.json supabase/tests package.json
git commit -m "M8a: lmu-articles-tick (the tick secret in constant time), the Postgres store and the Batch API port"
```

---

### Task 9: The owner's commands

**Files:**
- Create: `scripts/lib/articles.ts`, `scripts/articles.ts`, `supabase/tests/unit/articles-scripts.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing test**

```ts
// supabase/tests/unit/articles-scripts.test.ts
import { describe, expect, it } from 'vitest';
import { CRON_OFF_SQL, TICK_JOB, cronOnSql, reviewHtml, sqlJson, vaultSql } from '../../../scripts/lib/articles.ts';

describe('the cron (M8a decision 11)', () => {
  const sql = cronOnSql('https://x.supabase.co/functions/v1/lmu-articles-tick', 'sb_publishable_abc');

  it('enables the two extensions where Supabase documents them and schedules one job every 30 minutes', () => {
    expect(sql).toContain('create extension if not exists pg_cron with schema pg_catalog;');
    expect(sql).toContain('create extension if not exists pg_net with schema extensions;');
    expect(sql).toContain(`select cron.schedule('${TICK_JOB}', '*/30 * * * *',`);
    expect(TICK_JOB).toBe('lmu-articles-tick');
  });

  it('reads the tick secret from the Vault when the job runs, never from its text', () => {
    expect(sql).toContain("'x-lmu-tick', (select decrypted_secret from vault.decrypted_secrets where name = 'lmu_tick_secret')");
    expect(sql).toContain("'apikey', 'sb_publishable_abc'");
  });

  it('unschedules only its own job', () => {
    expect(CRON_OFF_SQL).toBe("select cron.unschedule(jobname) from cron.job where jobname = 'lmu-articles-tick';");
  });
});

describe('the Vault copy of the secret', () => {
  it('creates or updates lmu_tick_secret', () => {
    const sql = vaultSql('f'.repeat(64));
    expect(sql).toContain("perform vault.update_secret((select id from vault.secrets where name = 'lmu_tick_secret'), 'ffff");
    expect(sql).toContain("perform vault.create_secret('ffff");
  });

  it('takes only 64 hex characters', () => {
    expect(() => vaultSql("x'; drop table y; --")).toThrow();
  });
});

describe('sqlJson', () => {
  it('quotes JSON for SQL', () => {
    expect(sqlJson([{ topic: "Zen and the beginner's mind" }])).toBe(`'[{"topic":"Zen and the beginner''s mind"}]'::jsonb`);
  });
});

describe('the review page (M8a decision 10)', () => {
  const article = {
    id: 'article-3', cluster: 'sleep', topic: 'How sleep cycles work', title: 'Sleep <b>cycles</b>', summary: 'A summary.', words: 900,
    reading_minutes: 5, takeaways: ['Keep a steady wake-up time.'], reflection_question: 'When do you wake?',
    sections: [{ heading: 'Cycles', paragraphs: ['First & second.'], systemNote: 'System: Sleep counts.', sourceIds: [1] }],
    sources: [{ idx: 1, url: 'https://a.org/"x"', title: 'A' }],
  };

  it('shows every part of each article with its id, escaped', () => {
    const html = reviewHtml([article]);
    expect(html).toContain('article-3');
    expect(html).toContain('Sleep &lt;b&gt;cycles&lt;/b&gt;');
    expect(html).toContain('First &amp; second.');
    expect(html).toContain('System: Sleep counts.');
    expect(html).toContain('href="https://a.org/&quot;x&quot;"');
    expect(html).toContain('When do you wake?');
  });

  it('says when nothing waits', () => {
    expect(reviewHtml([])).toContain('No articles are waiting for review.');
  });
});
```

- [ ] **Step 2: Write `scripts/lib/articles.ts`**

```ts
// Pure parts of the owner's article commands (scripts/articles.ts, M8a decisions 10–11), tested offline.

export const TICK_JOB = 'lmu-articles-tick';
export const TICK_SCHEDULE = '*/30 * * * *';
export const VAULT_SECRET = 'lmu_tick_secret';

const literal = (text: string): string => `'${text.replace(/'/g, "''")}'`;

export function sqlJson(value: unknown): string {
  return `${literal(JSON.stringify(value))}::jsonb`;
}

/**
 * Turns the cron on (architecture §12: one job, `lmu-articles-tick`). The extensions are created where Supabase
 * documents them; the secret is read from the Vault each time the job runs, so it is never in the job's text.
 */
export function cronOnSql(functionUrl: string, publishableKey: string): string {
  return `create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
create extension if not exists pg_net with schema extensions;
select cron.schedule(${literal(TICK_JOB)}, ${literal(TICK_SCHEDULE)}, $lmu$
  select net.http_post(
    url := ${literal(functionUrl)},
    headers := jsonb_build_object('content-type', 'application/json', 'apikey', ${literal(publishableKey)},
      'x-lmu-tick', (select decrypted_secret from vault.decrypted_secrets where name = ${literal(VAULT_SECRET)})),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
$lmu$);`;
}

export const CRON_OFF_SQL = `select cron.unschedule(jobname) from cron.job where jobname = ${literal(TICK_JOB)};`;

/** Stores the tick secret in the Vault for the cron, replacing an older one. Run from a file, never a command line. */
export function vaultSql(secret: string): string {
  if (!/^[0-9a-f]{64}$/.test(secret)) throw new Error('the tick secret is 64 hex characters');
  return `do $lmu$
begin
  if exists (select 1 from vault.secrets where name = ${literal(VAULT_SECRET)}) then
    perform vault.update_secret((select id from vault.secrets where name = ${literal(VAULT_SECRET)}), ${literal(secret)});
  else
    perform vault.create_secret(${literal(secret)}, ${literal(VAULT_SECRET)}, 'LevelMeUp: the lmu-articles-tick secret');
  end if;
end $lmu$;`;
}

export type ReviewArticle = {
  id: string; cluster: string; topic: string; title: string; summary: string; words: number; reading_minutes: number;
  sections: { heading: string; paragraphs: string[]; systemNote: string | null; sourceIds: number[] }[];
  takeaways: string[]; reflection_question: string; sources: { idx: number; url: string; title: string }[];
};

const esc = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The owner's review page: every article waiting, in full, with its sources. */
export function reviewHtml(articles: readonly ReviewArticle[]): string {
  const body = articles.length === 0
    ? '<p>No articles are waiting for review.</p>'
    : articles.map((a) => `<article>
  <p class="meta">${esc(a.id)} · ${esc(a.cluster)} · ${esc(a.topic)} · ${a.words} words · ${a.reading_minutes} min</p>
  <h2>${esc(a.title)}</h2>
  <p class="summary">${esc(a.summary)}</p>
  ${a.sections.map((s) => `<h3>${esc(s.heading)} <span class="cites">[${s.sourceIds.join(', ')}]</span></h3>
  ${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n  ')}${s.systemNote === null ? '' : `\n  <p class="system">${esc(s.systemNote)}</p>`}`).join('\n  ')}
  <h3>Takeaways</h3>
  <ul>${a.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  <p class="question">${esc(a.reflection_question)}</p>
  <h3>Sources</h3>
  <ol>${a.sources.map((s) => `<li value="${s.idx}"><a href="${esc(s.url)}">${esc(s.title)}</a></li>`).join('')}</ol>
</article>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Articles for review</title>
<style>
  body { font: 17px/1.6 Georgia, serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #1d1b18; background: #faf8f4; }
  article { border-top: 2px solid #1d1b18; padding-top: 1rem; margin-top: 2.5rem; }
  .meta { font: 13px/1.4 system-ui, sans-serif; color: #6b645a; }
  .summary { font-style: italic; }
  .system { font: 15px/1.5 ui-monospace, monospace; border-left: 3px solid #f0765e; padding-left: .75rem; }
  .cites { font: 12px system-ui, sans-serif; color: #6b645a; }
  .question { font-weight: bold; }
</style></head>
<body><h1>Articles for review (${articles.length})</h1>
<p>Publish: <code>npm run articles -- publish &lt;id…&gt;</code> · Keep out: <code>npm run articles -- reject &lt;id…&gt;</code></p>
${body}
</body></html>
`;
}
```

- [ ] **Step 3: Write `scripts/articles.ts`**

```ts
// The owner's article commands (M8a). Each one that changes the project or spends money needs the owner's yes in chat
// first (CLAUDE.md: remote changes, monthly costs).
//   npm run articles -- setup             make the tick secret: LMU_TICK_SECRET and its Vault copy (nothing printed)
//   npm run articles -- tick              run one pipeline step now, as the cron does
//   npm run articles -- evergreen <n>     queue n evergreen articles (they wait for review)
//   npm run articles -- jobs              the latest jobs
//   npm run articles -- review            write .reviews/articles.html with every article waiting for review
//   npm run articles -- publish <id…>     publish reviewed articles
//   npm run articles -- reject <id…>      keep reviewed articles out
//   npm run articles -- spend             this month's Claude spend against the cap
//   npm run articles -- cron on|off|status
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ArticleCluster } from '../packages/content/src/index.ts';
import { chooseTopics } from '../supabase/functions/_shared/articles/topics.ts';
import { ESTIMATE_USD, MONTHLY_CAP_USD } from '../supabase/functions/_shared/costs.ts';
import { PROJECT_REF } from './lib/guard.ts';
import { CRON_OFF_SQL, TICK_JOB, VAULT_SECRET, cronOnSql, reviewHtml, sqlJson, vaultSql } from './lib/articles.ts';
import type { ReviewArticle } from './lib/articles.ts';
import { query, supabase } from './sb.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
const FUNCTION_URL = `${env.LMU_SUPABASE_URL}/functions/v1/${TICK_JOB}`;
const ARTICLE_ID = /^article-\d+$/;

/** Runs SQL from a temporary file (so a secret never reaches a command line), then deletes it. */
function runSqlFile(sql: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'lmu-'));
  try {
    const file = join(dir, 'run.sql');
    writeFileSync(file, sql, { mode: 0o600 });
    const run = supabase(['db', 'query', '--linked', '--project-ref', PROJECT_REF, '--file', file]);
    if (run.status !== 0) throw new Error(`the query failed: ${run.stderr.trim()}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function setup(): void {
  const secret = randomBytes(32).toString('hex');
  const dir = mkdtempSync(join(tmpdir(), 'lmu-'));
  try {
    const envFile = join(dir, 'tick.env');
    writeFileSync(envFile, `LMU_TICK_SECRET=${secret}\n`, { mode: 0o600 });
    const set = supabase(['secrets', 'set', '--env-file', envFile, '--project-ref', PROJECT_REF]);
    if (set.status !== 0) throw new Error(`secrets set failed: ${set.stderr.trim()}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  runSqlFile(vaultSql(secret));
  console.log('The tick secret is set: LMU_TICK_SECRET for the function and its Vault copy for the cron. Nothing secret was printed.');
}

async function tickNow(): Promise<void> {
  const [row] = query<{ secret: string }>([`select decrypted_secret as secret from vault.decrypted_secrets where name = '${VAULT_SECRET}'`]);
  if (row === undefined) throw new Error('no tick secret yet: run `npm run articles -- setup` first');
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: env.LMU_SUPABASE_PUBLISHABLE_KEY!, 'x-lmu-tick': row.secret },
    body: '{}',
  });
  console.log(res.status, await res.text());
}

function evergreen(count: number): void {
  if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error('evergreen takes a count from 1 to 30');
  const used = query<{ cluster: ArticleCluster; topic: string; queued_at: string }>([
    'select cluster, topic, max(created_at) as queued_at from levelmeup.article_jobs group by cluster, topic',
  ]).map((r) => ({ cluster: r.cluster, topic: r.topic, queuedAtMs: Date.parse(r.queued_at) }));
  const picks = chooseTopics(used, count).map((p) => ({ ...p, evergreen: true }));
  if (picks.length === 0) throw new Error('every topic has been used');
  const ids = query<{ id: number }>([`select levelmeup.article_queue(${sqlJson(picks)}) as id`]);
  console.log(`Queued ${ids.length} evergreen jobs:\n${picks.map((p) => `  ${p.cluster}: ${p.topic}`).join('\n')}`);
  console.log(`Reserved as they run: at most $${(ids.length * (ESTIMATE_USD.research + ESTIMATE_USD.write)).toFixed(2)}; the real cost is logged per call.`);
}

function jobs(): void {
  console.table(query(['select id, cluster, topic, evergreen, status, attempt, batch_id is not null as in_batch, article_id, left(error, 100) as error, updated_at from levelmeup.article_jobs order by id desc limit 30']));
}

function review(): void {
  const articles = query<ReviewArticle>([`select a.id, a.cluster, a.topic, a.title, a.summary, a.words, a.reading_minutes, a.sections,
    a.takeaways, a.reflection_question,
    coalesce((select jsonb_agg(jsonb_build_object('idx', s.idx, 'url', s.url, 'title', s.title) order by s.idx)
      from levelmeup.article_sources s where s.article_id = a.id), '[]'::jsonb) as sources
    from levelmeup.articles a where a.status = 'review' order by a.job_id`]);
  const file = join(ROOT, '.reviews', 'articles.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, reviewHtml(articles));
  console.log(`${articles.length} article(s) waiting: ${file}`);
}

function decide(ids: readonly string[], status: 'published' | 'rejected'): void {
  if (ids.length === 0 || ids.some((id) => !ARTICLE_ID.test(id))) throw new Error('name articles as article-<n>');
  const list = ids.map((id) => `'${id}'`).join(', ');
  const done = query<{ id: string }>([`update levelmeup.articles set status = '${status}', published_at = ${status === 'published' ? 'now()' : 'null'}
    where id in (${list}) and status = 'review' returning id`]);
  console.log(`${status}: ${done.map((r) => r.id).join(', ') || 'none (only articles waiting for review can be decided)'}`);
}

function spend(): void {
  const rows = query<{ kind: string; status: string; calls: number; usd: string }>([`select kind, status, count(*)::int as calls, coalesce(sum(cost_usd), 0)::text as usd
    from levelmeup.ai_generations where created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'
    group by kind, status order by kind, status`]);
  console.table(rows);
  const total = rows.reduce((sum, r) => sum + Number(r.usd), 0);
  console.log(`This month: $${total.toFixed(4)} of the $${MONTHLY_CAP_USD} cap (pending calls count at their estimate).`);
}

function cron(action: string | undefined): void {
  if (action === 'on') {
    runSqlFile(cronOnSql(FUNCTION_URL, env.LMU_SUPABASE_PUBLISHABLE_KEY!));
    console.log(`${TICK_JOB} runs every 30 minutes.`);
  } else if (action === 'off') {
    runSqlFile(CRON_OFF_SQL);
    console.log(`${TICK_JOB} is unscheduled (the extensions stay, inert).`);
  } else if (action === 'status') {
    const [installed] = query<{ n: number }>(["select count(*)::int as n from pg_extension where extname = 'pg_cron'"]);
    if (installed?.n !== 1) return console.log('pg_cron is not enabled: the cron is off.');
    console.table(query([`select jobname, schedule, active from cron.job where jobname = '${TICK_JOB}'`]));
    console.table(query([`select status, left(return_message, 80) as message, start_time from cron.job_run_details
      where jobid = (select jobid from cron.job where jobname = '${TICK_JOB}') order by runid desc limit 5`]));
  } else {
    throw new Error('cron takes on, off or status');
  }
}

const [command, ...rest] = process.argv.slice(2);
try {
  switch (command) {
    case 'setup': setup(); break;
    case 'tick': await tickNow(); break;
    case 'evergreen': evergreen(Number(rest[0])); break;
    case 'jobs': jobs(); break;
    case 'review': review(); break;
    case 'publish': decide(rest, 'published'); break;
    case 'reject': decide(rest, 'rejected'); break;
    case 'spend': spend(); break;
    case 'cron': cron(rest[0]); break;
    default: throw new Error('commands: setup, tick, evergreen <n>, jobs, review, publish <id…>, reject <id…>, spend, cron on|off|status');
  }
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
```

Add `.reviews/` to `.gitignore` (after `.backups/`).

- [ ] **Step 4: Run the tests**

Run: `npm -w supabase test -- articles-scripts` → PASS. Run: `npm -w supabase run typecheck` (it includes `../scripts`) →
clean. Run: `npm run articles` → prints the commands and exits 1 (no remote call).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/articles.ts scripts/articles.ts supabase/tests/unit/articles-scripts.test.ts .gitignore
git commit -m "M8a: the owner's article commands (setup, tick, evergreen, jobs, review page, publish/reject, spend, cron on/off/status)"
```

---

### Task 10: Docs

**Files:** `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md`, `…-architecture.md`,
`docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`, `supabase/README.md`, `CLAUDE.md`

- [ ] **Step 1: MVP spec §4.1** — after the "Generation" list, add: "*Built in M8a (2026-10-13):* research is web search
  only, with the API's citations; code builds the brief from them (each fact cites the pages the API says it used) and
  keeps the cited excerpts; the writer sees only the brief. The checks also refuse any quotation of 4+ words, any run of
  8 words from a cited excerpt, links and markdown; the reading time is computed (180 words a minute). The night's two
  articles are queued only while a player who played this week has fewer than 14 articles they haven't been given; 80
  topic seeds in 8 clusters. Evergreen articles wait for the owner's review (`npm run articles -- review`)." Under
  "Cost control" add: "*M8a:* the cap covers every Claude call (the reveal too) for the UTC calendar month; each call
  is reserved with an estimate before it is sent."

- [ ] **Step 2: Architecture** — §5.1: "every call is logged with its cost (M8a; `_shared/costs.ts`, prices of
  2026-10-12)". §5.2: replace the table's statuses with the built ones (`queued → researching → researched → writing →
  done`, `retry` once the next night, `failed`), and add: "The tick is called with the publishable key on `apikey` and
  the tick secret on `x-lmu-tick` (from the Vault); it runs one at a time (a lease in `article_pipeline`). Research uses
  `web_search_20250305` (max 5) without web fetch (M8a decision 2)." §12 Cron row: "One job, `lmu-articles-tick`
  (pg_cron and pg_net enabled by `npm run articles -- cron on` with the owner's yes, M8a)". Database table list: add
  `article_pipeline` (the tick's lease and the last night queued).

- [ ] **Step 3: Roadmap** — row 8 becomes two rows:

  `| 8a | **The article library** | The Batch API pipeline (`lmu-articles-tick`, research with web search → a brief from the citations → writing → code checks), the $25 monthly budget on every Claude call (the reveal's cost logged), migration 0014, the owner's `npm run articles` commands, the evergreen articles and their review, the cron (pg_cron + pg_net, with the owner's yes); spike 3. M8 split in two (M8a decision 1). **Built 2026-10-13**; merges after M7d. | `2026-10-13-m8a-article-library.md` |`

  `| 8b | **Reading** | Each new day gets one unread published article (60 % from the player's goals and class; the evergreen library when nothing else), the phone caches a few for offline days, the reader and the takeaway quest, past readings in the Chronicle, the Mage's Insight (choose tomorrow's topic from 3). | later |`

  Mark the carried rows done: M2 "Reuse `lintText` for articles…" → "*(Done in M8a: `lintArticle`.)* Insight: M8b."; M3
  "`ai_generations.cost_usd` is not filled yet…" → "*(Done in M8a.)*"; M6d's Insight row → "M8b". Add a "Carried forward
  from M8a" section with: "| M8b | Remove `reserve_ai_call` (0003), unused since M8a, in the next migration that touches
  the AI log. |", "| Later | Topic seeds run out after 80 articles (about 40 nights at full demand): add seeds, or let a
  used cluster repeat with a new angle. |", "| Later | Dynamic filtering (`web_search_20260209`) as a cost lever, once the
  spike has measured the basic tool. |", and "| Owner | The wedding day (30 Jan 2027): `npm run articles -- cron off`
  the day before, `cron on` after (architecture §12). |" Update the spikes table row 3: "M8a (Task 13)".

- [ ] **Step 4: `supabase/README.md`** — the commands table gains `npm run articles -- …` (one line per subcommand, as in
  the script's header); `check:functions` and `deploy:functions` name four functions; a short "Articles" section: the
  tick, the secret (`LMU_TICK_SECRET` and the Vault's `lmu_tick_secret`), the cron, and that `setup`, `tick`,
  `evergreen`, `publish`, `reject` and `cron` change the live project or spend money (the owner's yes first).

- [ ] **Step 5: `CLAUDE.md`** — in "The backend is live", after the commands, add: "`npm run articles -- …` (M8a): the
  article pipeline's owner commands; `setup`, `tick`, `evergreen`, `publish`/`reject` and `cron on|off` change the live
  project or spend money, so they need the owner's yes. Claude calls go through `_shared/claude.ts` and
  `_shared/articles/batches.ts` only, and every one is reserved against the monthly budget first."

- [ ] **Step 6: Commit**

```bash
git add docs CLAUDE.md supabase/README.md
git commit -m "M8a docs: the specs, the roadmap (M8 split in two), the server README and CLAUDE.md"
```

---

### Task 11: Checks and review

- [ ] **Step 1: Every suite**

Run: `npm test` → content 1089, rules 449, server 376 + the new unit tests (about 80), app 742, all passing.
Run: `npm run typecheck` → clean. Run: `npm run check:functions` → clean. Run: `npm run check:portable` → ok.
Run: `npm run check:bundle` → clean (nothing in the app changed).

- [ ] **Step 2: Code review**

Dispatch a reviewer (superpowers:requesting-code-review) on `3fa6c97..HEAD` with this plan as the requirements. Ask it
to look hardest at: the money (every Claude call reserved first; estimates and real costs; batch prices; the cap
across kinds), the state machine (a job moved only from the status seen; nothing submitted twice; stale submissions;
cancelled and expired batches; retries once), the security of the tick (constant time, the gateway, the Vault, nothing
secret printed or committed), the SQL (definer functions, search paths, grants, constraints), and the checks (can a
quotation, copied wording or a source outside the brief slip through?). Fix what it finds; re-run Step 1.

- [ ] **Step 3: Commit the fixes**

```bash
git commit -am "M8a review: <what was fixed>"
```

---

### Task 12: Deploy (needs the owner's yes)

Ask in chat: "M8a is built and reviewed. May I deploy it? Migration 0014 (four new tables, the budget and pipeline
functions; nothing of the wedding's), the functions (lmu-onboarding now logs the reveal's cost under the cap; the new
lmu-articles-tick), the live tests, and the tick secret (`npm run articles -- setup`). No money is spent and no cron
yet." Wait for a clear yes.

- [ ] **Step 1:** `npm run db:deploy` → 0014 applied; the wedding's migration history unchanged (the runner checks).
- [ ] **Step 2:** `npm run db:test` → every file ok, `articles` included; nothing left behind.
- [ ] **Step 3:** `npm run deploy:functions` → four functions deployed (versions noted).
- [ ] **Step 4:** `npm run test:live` → all pass, the two tick tests included; the leftovers check (0 Live Test
  profiles).
- [ ] **Step 5:** `npm run articles -- setup` → "The tick secret is set…". Then `npm run articles -- tick` → `200`
  with `{"ran":true,"queued":0,…}` (before 18:00 UTC; or no player short of articles), proving the secret, the
  gateway, the lease and the store work end to end without a Claude call. `npm run articles -- jobs` → empty.
- [ ] **Step 6:** Note the versions and results in the plan's As built section; commit.

---

### Task 13: Spike 3 — the first real article (needs the owner's yes)

Ask in chat: "May I make the first real article? One evergreen job: a batch research request with web search (up to 5
searches) and a batch writing request, both Opus 5.5 at batch prices. Expected about $0.10–0.30; at most $0.65 is
reserved against the cap." Wait for a clear yes.

- [ ] **Step 1:** `npm run articles -- evergreen 1` → one job (habits, the first topic).
- [ ] **Step 2:** `npm run articles -- tick` → `submitted: 1`. Then, every 10–15 minutes (a Monitor until-loop, not a
  foreground sleep), `npm run articles -- tick` until the job is `writing`, then until `done` (or `retry`, with its
  error in `npm run articles -- jobs`). Most batches end within an hour.
- [ ] **Step 3:** `npm run articles -- spend` → the two calls' real costs. `npm run articles -- review` → read the
  article in `.reviews/articles.html`: facts match the sources, the voice is the house style, no quotations, the
  System notes, the takeaways.
- [ ] **Step 4:** Record in the plan's As built section: tokens in and out, searches, cost of each step, minutes from
  submission to result, the article's words, and anything the checks refused. If the research brief was thin or the
  writing failed a check, adjust the prompt or the limits (a commit), and repeat with the owner's yes.
- [ ] **Step 5:** Report to the owner: the real cost per article, the estimate for 20 evergreen articles, and the monthly
  cost at full demand (2 a night, 30 nights) against the $25 cap; send the review page (`SendUserFile`).

---

### Task 14: The evergreen library (needs the owner's yes)

Ask in chat, with the spike's numbers: "May I make the other 19 evergreen articles? About $<spike cost × 19>, one-time.
They wait for your review." Wait for a clear yes.

- [ ] **Step 1:** `npm run articles -- evergreen 19` → 19 jobs across the 8 clusters.
- [ ] **Step 2:** Tick until every job is `done` or `retry` (the batch of 19 may take longer: web search in batches is
  throttled per organization). Jobs in `retry` wait for a night tick; run `npm run articles -- tick` after 18:00 UTC to
  requeue them (they are tried once more).
- [ ] **Step 3:** `npm run articles -- review` → send the page to the owner. The owner reads; publish what they approve
  (`npm run articles -- publish …`, with their yes), reject the rest; replace rejected ones with new evergreen jobs if
  they ask.
- [ ] **Step 4:** As built: counts, real total cost, how many failed which check.

---

### Task 15: The cron (needs the owner's yes)

Ask in chat: "May I turn on the scheduler? It enables two Supabase extensions on the shared project, pg_cron and
pg_net (the wedding has neither, uses neither, and nothing of its changes), and schedules one job, lmu-articles-tick,
every 30 minutes. From then on the server writes up to 2 articles a night, only while a player who played this week is
short of articles: at most about $<2 × 30 × spike cost> a month, under the $25 cap. `npm run articles -- cron off`
stops it." Wait for a clear yes.

- [ ] **Step 1:** `npm run articles -- cron on` → "lmu-articles-tick runs every 30 minutes."
- [ ] **Step 2:** After the next :00 or :30, `npm run articles -- cron status` → the job active and a `succeeded` run;
  check pg_net's answer: `node scripts/sb.ts db query --linked --project-ref knlgpcwoaaygncmlnbsm "select status_code,
  left(content::text, 120) as body, created from net._http_response order by id desc limit 3"` → `200` with a tick
  report.
- [ ] **Step 3:** As built: the time it was turned on, the first runs. Update the roadmap (row 8a: cron on).

---

## Self-review (done while writing)

- **Spec coverage.** §4.1 generation: nightly 2 (demand-gated, decision 6), 8 clusters, Opus 5.5, research with web
  search → brief, write as structured output, checks (schema, sources in the brief, no quotes, lint), publish only
  passes, one retry the next night, ~20 evergreen owner-reviewed, original wording (copying check). Cost control:
  every call logged with cost, $25 cap before each call (Task 2, 4, 7). Assignment, offline cache, Insight and the
  article quest: M8b (decision 1). §5 acceptance: "publishes only articles that pass" (pipeline tests), "the cap …
  test with mocked costs" (pgTAP `test_ai_budget`); "the evergreen library is used" when the cap is reached: M8b.
  Architecture §5.2 statuses, 30-minute tick, Batch API, research max ~5 uses, 2+ sources: Tasks 5–8. §12 one cron
  job, `lmu-` / `LMU_` names: Tasks 8, 9, 15. Spike 3: Task 13.
- **Placeholders.** None in the code; the As built numbers are filled at Tasks 12–15 from real runs. The test numbers
  were worked out by hand (costs, word counts) and are noted next to the tests.
- **Types.** `Job`, `JobSet`, `Store`, `Batches`, `BatchResult`, `Finish`, `StoredArticle`, `StoredSource` are defined
  once in `pipeline.ts` and used by `store.ts`, `batches.ts` and the test fakes; `Brief` in `brief.ts`; `ArticleDraft`
  in `check.ts`; `BatchRequest`/`JobRef` in `prompts/articles.ts`; the SQL's JSON keys (`batchId`, `aiCallId`,
  `submittedAt`, `brief`, `error`, `attempt`; the article's `reflectionQuestion`, `readingMinutes`, `words`) match the
  TypeScript names.

## As built (2026-10-13)

- **Commits** (branch `m8a-article-library` from `m7d-notifications` 3fa6c97): 4c1b32f content, a2b3468 migration
  0014, 1745613 the DB tests, f695b06 costs and the reveal under the budget, 33ae09b the brief, 1c89e73 the house style,
  the requests and the checks, 1fdf7e1 topics and the pipeline, 5234698 the tick function, e8b5f7c the owner's
  commands, c10aee9 docs, then the review's fixes.
- **Review (Task 11) fixes**, each with tests:
  - The Batch API client never retries a create (the API takes no idempotency key, so a retry after a lost answer could
    make a second, billed batch). A failed submission is sorted by `SubmitError`: `busy` (429, 5xx: the jobs go back,
    no attempt used, $0), `refused` (other 4xx: the attempt is used, $0), or no answer (timeout, lost connection: the
    estimate stays spent and the attempt is used). A stale submission (no batch id after an hour) also keeps its
    estimate and uses the attempt, so nothing can book an estimate every tick.
  - One answer that breaks something no longer stops the pipeline: each batch and each job is collected inside its
    own `try`; a broken job fails its attempt (`internal: …`), the report counts `errors`. Untrusted text is cut with
    `clip` (whole characters, no control characters: Postgres's jsonb refuses half an emoji and U+0000), and a
    source's address is stored as the URL parser's ASCII form.
  - The checks also refuse quotations in straight single quotes (apostrophes allowed), an unclosed quotation mark, bare
    domains and email addresses, reference ranges (`[1, 2]`), `*`, `_`, link syntax, HTML tags, list markers, and
    control characters or half an emoji; whitespace inside a paragraph is one space.
  - The reveal's cost: an answer that can't be used is still billed by its tokens; a call that never answered keeps
    the $0.05 estimate.
  - `npm run articles -- tick` and `setup` never print the CLI's output on a failure that might hold the secret.
  - Writing is submitted before new research, so near the cap a paid-for brief gets the budget first.
  - A brief's sources are only pages a kept fact cites; `article_short_players` counts published articles less the
    ones a player's days hold (cheaper, same answer).
- **Re-review fixes:** only 429, 503 and 529 (and 401/403, a key problem the owner fixes) count as busy; another 5xx is
  treated like no answer (it doesn't prove no batch was made). A batch the API still can't show after 48 hours is given
  up (estimates kept, attempts used). Upper-case domains, single-quoted quotations that start with a number, and feet and
  inches (6'2", a 6" step: not quotation marks) are handled.
- **Left as found** (minor): an orphaned `pending` reservation (a tick killed between reserving and moving) holds its
  estimate until the month ends; a tick that dies between claiming a night and queueing it loses that night's new
  jobs; `article_tick_end` doesn't check which tick holds the lease (every move is still guarded by status); research
  input tokens have no hard limit (the spike measures them); `reserve_ai_call` stays until M8b (roadmap).
- **Deployed (Task 12, owner's yes, 2026-10-12 ~19:00–19:35 UTC):** `db:deploy` applied 0014 (the wedding's history
  unchanged); `db:test` all ok (`articles.sql` 52 assertions, nothing left behind); functions `lmu-onboarding` and
  `lmu-account-delete` v15, `lmu-sync` v15, `lmu-articles-tick` v3; `test:live` 42 passed, 0 leftovers; `articles
  setup` set `LMU_TICK_SECRET` and the Vault's `lmu_tick_secret`; `articles tick` → 200 `{"ran":true,"queued":0,
  "submitted":0,…}`, no jobs, no Claude call. The reveal's cost is now logged (this month: $0.105 over the live tests'
  calls).
- **Found at deploy:** the plan assumed the deploy would run before 18:00 UTC; it ran at 19:00 UTC, inside the night
  window, with two players short of articles, so the test tick would have queued the night's two daily jobs (about
  $0.80 reserved). Fixed with 7780680: the owner's manual tick sends `{ "nights": false }` and only moves jobs along;
  the cron (body `{}`) and `tick --night` queue nights. Tonight (2026-10-12) was also marked queued in
  `article_pipeline` before the test tick, as a second guard while the new build propagated.
- **Supabase deploy errors:** redeploying `lmu-sync` (unchanged code) and `lmu-articles-tick` failed with "Function
  deploy failed due to an internal error" (500) from 19:14 to 19:21 UTC, while `lmu-onboarding` and
  `lmu-account-delete` redeployed fine; both succeeded on a retry at 19:31. The live functions kept serving the
  19:00 builds meanwhile.
