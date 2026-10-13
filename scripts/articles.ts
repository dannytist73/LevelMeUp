// The owner's article commands (M8a). Each one that changes the project or spends money needs the owner's yes in chat
// first (CLAUDE.md: remote changes, monthly costs).
//   npm run articles -- setup             make the tick secret: LMU_TICK_SECRET and its Vault copy (nothing printed)
//   npm run articles -- tick [--night]    run one pipeline step now: it moves the jobs along but queues no night's
//                                         articles (spends only on jobs already queued); --night does as the cron does
//   npm run articles -- evergreen <n>     queue n evergreen articles (they wait for review)
//   npm run articles -- jobs              the latest jobs
//   npm run articles -- review            write .reviews/articles.html with every article waiting for review
//   npm run articles -- publish <id…>     publish reviewed articles
//   npm run articles -- reject <id…>      keep reviewed articles out
//   npm run articles -- correct <file>    apply the owner's corrections (a JSON list of {id, find, replace, why}) to
//                                         articles waiting for review; nothing is written unless every one passes
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
import {
  CRON_OFF_SQL, TICK_JOB, VAULT_SECRET, applyCorrections, correctionSql, cronOnSql, parseCorrections, reviewHtml, sqlJson, vaultSql,
} from './lib/articles.ts';
import type { ReviewArticle, StoredArticle } from './lib/articles.ts';
import type { Brief } from '../supabase/functions/_shared/articles/brief.ts';
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

/**
 * Runs SQL from a temporary file (so a secret never reaches a command line), then deletes it. With `secret`, a failure
 * hides the CLI's output, which may repeat the statement (M8a review).
 */
function runSqlFile(sql: string, secret = false): void {
  const dir = mkdtempSync(join(tmpdir(), 'lmu-'));
  try {
    const file = join(dir, 'run.sql');
    writeFileSync(file, sql, { mode: 0o600 });
    const run = supabase(['db', 'query', '--linked', '--project-ref', PROJECT_REF, '--file', file]);
    if (run.status !== 0) throw new Error(secret ? 'the query failed (its output is hidden: it may hold the secret)' : `the query failed: ${run.stderr.trim()}`);
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
  runSqlFile(vaultSql(secret), true);
  console.log('The tick secret is set: LMU_TICK_SECRET for the function and its Vault copy for the cron. Nothing secret was printed.');
}

async function tickNow(night: boolean): Promise<void> {
  let rows: { secret: string }[];
  try {
    rows = query<{ secret: string }>([`select decrypted_secret as secret from vault.decrypted_secrets where name = '${VAULT_SECRET}'`]);
  } catch {
    // query() puts the CLI's output in its message, and that output may hold the secret (M8a review): never print it.
    throw new Error('could not read the tick secret from the Vault (the details are hidden: they may hold it)');
  }
  const [row] = rows;
  if (row === undefined) throw new Error('no tick secret yet: run `npm run articles -- setup` first');
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: env.LMU_SUPABASE_PUBLISHABLE_KEY!, 'x-lmu-tick': row.secret },
    body: night ? '{}' : '{"nights":false}',
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

/** The owner's corrections, checked like a written article against its job's research brief; all or nothing. */
function correct(file: string | undefined): void {
  if (file === undefined) throw new Error('name the corrections file: npm run articles -- correct <file.json>');
  const fixes = parseCorrections(JSON.parse(readFileSync(file, 'utf8')));
  if (typeof fixes === 'string') throw new Error(fixes);
  const ids = [...new Set(fixes.map((f) => f.id))];
  const rows = query<StoredArticle & { brief: Brief | null }>([`select a.id, a.title, a.summary, a.sections, a.takeaways, a.reflection_question, j.brief
    from levelmeup.articles a join levelmeup.article_jobs j on j.id = a.job_id
    where a.id in (${ids.map((id) => `'${id}'`).join(', ')}) and a.status = 'review'`]);
  const missing = ids.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length > 0) throw new Error(`not waiting for review: ${missing.join(', ')}`);
  const results = rows.map((row) => {
    if (row.brief === null) return { row, problems: [`${row.id}: its research brief is gone, so it can't be checked`] } as const;
    return { row, ...applyCorrections(row, fixes.filter((f) => f.id === row.id), row.brief) };
  });
  const problems = results.flatMap((r) => r.problems.map((p) => (p.startsWith(r.row.id) ? p : `${r.row.id}: ${p}`)));
  if (problems.length > 0) throw new Error(`nothing was changed:\n  ${problems.join('\n  ')}`);
  for (const r of results) {
    if (!('article' in r)) continue;
    const [done] = query<{ id: string }>([correctionSql(r.article, r.words, r.minutes)]);
    console.log(`${done?.id ?? r.row.id + ' (no longer waiting: unchanged)'}: ${fixes.filter((f) => f.id === r.row.id).length} correction(s), ${r.words} words`);
  }
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
    case 'tick': await tickNow(rest.includes('--night')); break;
    case 'evergreen': evergreen(Number(rest[0])); break;
    case 'correct': correct(rest[0]); break;
    case 'jobs': jobs(); break;
    case 'review': review(); break;
    case 'publish': decide(rest, 'published'); break;
    case 'reject': decide(rest, 'rejected'); break;
    case 'spend': spend(); break;
    case 'cron': cron(rest[0]); break;
    default: throw new Error('commands: setup, tick [--night], evergreen <n>, jobs, review, publish <id…>, reject <id…>, correct <file>, spend, cron on|off|status');
  }
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
