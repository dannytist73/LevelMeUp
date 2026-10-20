// M15, the daily studio on the owner's PC (plan 2026-10-20-m15-daily-studio.md): takes today's topic from
// lmu-articles-studio, researches it and writes the article and its story with Claude Code on the owner's plan, renders
// the story's picture in the local ComfyUI, and hands everything back to be checked again and stored. Each step's result
// is kept in ~/.levelmeup/studio/jobs/job-<id>/, so a run that stops is finished by the next one.
//   npm run studio -- setup        make LMU_STUDIO_SECRET (the function's copy, and this PC's in ~/.levelmeup/studio.env)
//   npm run studio -- token [TOKEN] save the token `claude setup-token` printed: typed after it, or from the clipboard
//   npm run studio -- run [--dry]  one day's article (--dry: everything, but the server only checks it)
//   npm run studio -- status       the last runs
// Setup changes the live project, so it needs the owner's yes (CLAUDE.md). Claude never writes to the database: it
// answers with JSON, and this script sends that JSON to the function, which checks it with the tick's own code.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { freemem, homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Brief } from '../../supabase/functions/_shared/articles/brief.ts';
import { checkBrief } from '../../supabase/functions/_shared/articles/brief.ts';
import { checkArticle, parseArticle } from '../../supabase/functions/_shared/articles/check.ts';
import { checkDeck, deckParams, parseDeck } from '../../supabase/functions/_shared/articles/deck.ts';
import type { StoryDeck } from '../../supabase/functions/_shared/articles/deck.ts';
import type { StudioJob } from '../../supabase/functions/_shared/articles/studio.ts';
import { ARTICLE_SCHEMA, writeRequest } from '../../supabase/functions/_shared/prompts/articles.ts';
import { PROJECT_REF } from '../lib/guard.ts';
import { supabase } from '../sb.ts';
import {
  PICK_SCHEMA, RESEARCH_SCHEMA, SCENE_SCHEMA, SCENE_SYSTEM, STUDIO_RESEARCH_SYSTEM, pickSystem, researchPrompt, researchUrls, scenePrompt, sharedRuns, verifyResearch,
} from './lib.ts';
import type { PageRead, Research } from './lib.ts';
import { fetchPage } from './page.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const HOME = join(homedir(), '.levelmeup');
const ENV_FILE = join(HOME, 'studio.env');
const JOBS = join(HOME, 'studio', 'jobs');
const LOG = join(HOME, 'studio', 'studio.log');
const CLAUDE = process.env.LMU_CLAUDE ?? join(process.env.APPDATA ?? '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
const COMFY = 'http://127.0.0.1:8188';
const COMFY_DIR = process.env.LMU_COMFY_DIR ?? 'D:\\ai\\ComfyUI';
/** Free memory ComfyUI needs to start beside everything else (Z-Image Turbo on the 4070 laptop; checked on the first runs). */
const COMFY_FREE_BYTES = 10 * 1024 ** 3;
/** How long a run waits for that memory (an emulator or a build may finish) before the story goes out without a picture. */
const MEMORY_WAIT_MS = 60 * 60 * 1000;

type Env = Record<string, string>;

function readEnv(file: string): Env {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
}

function writeEnv(values: Env): void {
  mkdirSync(HOME, { recursive: true });
  writeFileSync(ENV_FILE, Object.entries(values).map(([k, v]) => `${k}=${v}\n`).join(''), { mode: 0o600 });
}

function log(line: string): void {
  mkdirSync(dirname(LOG), { recursive: true });
  const stamped = `${new Date().toISOString()} ${line}`;
  appendFileSync(LOG, `${stamped}\n`);
  console.log(stamped);
}

/** A Windows notification; a failure to show one never stops the run. */
function notify(message: string): void {
  const script = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$x = $t.GetElementsByTagName('text'); $x[0].AppendChild($t.CreateTextNode('LevelMeUp studio')) > $null; $x[1].AppendChild($t.CreateTextNode($env:LMU_TOAST)) > $null
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($t))`;
  spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, LMU_TOAST: message }, timeout: 20_000 });
}

/** A step's result: read from the job's folder when an earlier run made it, else made now and kept. */
async function step<T>(dir: string, file: string, make: () => Promise<T> | T): Promise<T> {
  const path = join(dir, file);
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as T;
  const value = await make();
  writeFileSync(path, JSON.stringify(value, null, 2));
  return value;
}

/** The studio's checks refused the work: the job keeps the reason and the next run tries again. */
class Refused extends Error {}

async function studio(env: Env, body: Record<string, unknown>): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${env.LMU_SUPABASE_URL}/functions/v1/lmu-articles-studio`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: env.LMU_SUPABASE_PUBLISHABLE_KEY!, 'x-lmu-studio': env.LMU_STUDIO_SECRET! },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const text = await res.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = { error: text.slice(0, 300) };
  }
  return { status: res.status, body: parsed };
}

type ClaudeCall = { system: string; prompt: string; schema: object; cwd: string; tools?: string[]; allow?: string[]; effort?: 'low' | 'medium' | 'high'; minutes: number };

/**
 * One headless Claude Code call on the owner's plan (CLAUDE_CODE_OAUTH_TOKEN; an API key in the environment is removed,
 * so nothing is billed to the API). Only the named tools exist and only the allowed ones run; no settings, hooks, MCP
 * servers or skills are loaded. The answer is the schema's JSON, checked by code afterwards like any AI output.
 */
function claude(env: Env, c: ClaudeCall): unknown {
  const args = ['-p', '--model', 'opus', '--effort', c.effort ?? 'medium', '--output-format', 'json', '--no-session-persistence',
    '--setting-sources', '', '--strict-mcp-config', '--disable-slash-commands', '--permission-mode', 'dontAsk',
    '--system-prompt', c.system, '--json-schema', JSON.stringify(c.schema), '--tools', (c.tools ?? []).join(',')];
  if (c.allow !== undefined) args.push('--allowedTools', ...c.allow);
  const childEnv: NodeJS.ProcessEnv = { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: env.CLAUDE_CODE_OAUTH_TOKEN };
  delete childEnv.ANTHROPIC_API_KEY;
  const run = spawnSync(CLAUDE, args, { cwd: c.cwd, input: c.prompt, env: childEnv, encoding: 'utf8', timeout: c.minutes * 60_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (run.error !== undefined) throw new Error(`Claude Code did not run: ${run.error.message}`);
  let out: { is_error?: boolean; result?: string; structured_output?: unknown };
  try {
    out = JSON.parse(run.stdout) as typeof out;
  } catch {
    throw new Error(`Claude Code gave no answer (exit ${run.status}): ${(run.stderr || run.stdout).slice(0, 300)}`);
  }
  if (out.is_error === true || out.structured_output === undefined) throw new Error(`Claude Code: ${String(out.result ?? 'no structured answer').slice(0, 300)}`);
  return out.structured_output;
}

async function research(env: Env, job: StudioJob): Promise<Research> {
  return claude(env, {
    system: STUDIO_RESEARCH_SYSTEM, prompt: researchPrompt(job), schema: RESEARCH_SCHEMA, cwd: HERE,
    tools: ['WebSearch', 'Bash'], allow: ['WebSearch', 'Bash(node read-page.ts:*)'], minutes: 30,
  }) as Research;
}

async function verify(r: Research): Promise<{ brief: Brief; dropped: string[] }> {
  const pages = new Map<string, PageRead>();
  for (const url of researchUrls(r)) {
    const page = await fetchPage(url);
    pages.set(url, 'error' in page ? page : { text: page.text });
  }
  const verified = verifyResearch(r, pages);
  const problems = checkBrief(verified.brief);
  if (problems.length > 0) throw new Refused(`research: ${problems.join('; ')} (${verified.dropped.length} quotes not found on their pages)`);
  return verified;
}

/** Tries at the article and at the story: free on the PC, so one more than the tick's two. */
const DRAFTS = 3;

/**
 * The article from the brief with the tick's own prompt, warned up front about the wording its facts share with the
 * sources (the copying check refused both drafts of the first test over such runs); a refused draft is written again,
 * told every reason so far, as the tick tells its one rewrite.
 */
function write(env: Env, job: StudioJob, brief: Brief): unknown {
  const runs = sharedRuns(brief);
  const warning = runs.length === 0 ? ''
    : `\n\nSome wording in the facts is word for word from the sources. Never repeat 8 or more of a source's words in a row: say these in your own words: ${runs.map((r) => `"${r}"`).join('; ')}`;
  const refused: string[] = [];
  for (let attempt = 1; attempt <= DRAFTS; attempt++) {
    const error = refused.length === 0 ? null : refused.join('; ');
    const params = writeRequest({ id: job.id, attempt, cluster: job.cluster, topic: job.topic, error }, brief).params as { system: string; messages: { content: string }[] };
    const value = claude(env, { system: params.system, prompt: params.messages[0]!.content + warning, schema: ARTICLE_SCHEMA, cwd: HERE, minutes: 20 });
    const draft = parseArticle(value);
    const problems = draft === null ? ['the article does not match its schema'] : checkArticle(draft, brief);
    if (problems.length === 0) return value;
    refused.push(...problems.filter((p) => !refused.includes(p)));
    log(`job ${job.id}: draft ${attempt} refused: ${problems.join('; ').slice(0, 300)}`);
  }
  throw new Refused(`article: ${refused.join('; ')}`);
}

/** The story with the tick's own deck prompt; a refused one is written again, told every reason so far. */
function deck(env: Env, job: StudioJob, article: unknown, brief: Brief): unknown {
  const draft = parseArticle(article)!;
  const params = deckParams(draft) as { system: string; messages: { content: string }[]; output_config: { format: { schema: object } } };
  const refused: string[] = [];
  for (let attempt = 1; attempt <= DRAFTS; attempt++) {
    const fix = refused.length === 0 ? '' : `\n\nYour earlier story lessons for this article failed these checks, so write it again and fix every one: ${refused.join('; ')}`;
    const value = claude(env, { system: params.system, prompt: params.messages[0]!.content + fix, schema: params.output_config.format.schema, cwd: HERE, effort: 'low', minutes: 10 });
    const d = parseDeck(value);
    const problems = d === null ? ['the deck does not match its schema'] : checkDeck(d, draft, brief.excerpts);
    if (problems.length === 0) return value;
    refused.push(...problems.filter((p) => !refused.includes(p)));
    log(`job ${job.id}: story ${attempt} refused: ${problems.join('; ').slice(0, 300)}`);
  }
  throw new Refused(`story: ${refused.join('; ')}`);
}

const comfyUp = async (): Promise<boolean> => {
  try {
    return (await fetch(`${COMFY}/system_stats`, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    return false;
  }
};

/** ComfyUI's queue is empty and stays so for 90 seconds: nobody else is rendering (a script queues one take at a time). */
async function comfyIdle(): Promise<boolean> {
  for (let i = 0; i < 6; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 15_000));
    try {
      const q = (await (await fetch(`${COMFY}/queue`, { signal: AbortSignal.timeout(5000) })).json()) as { queue_running?: unknown[]; queue_pending?: unknown[] };
      if ((q.queue_running?.length ?? 0) + (q.queue_pending?.length ?? 0) > 0) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * ComfyUI, started here when it isn't running and the memory allows; one already running is used only once nobody
 * else is rendering with it (the owner's own work comes first). Null when it can't be had within the wait.
 */
async function comfy(): Promise<{ started: number | null } | null> {
  const until = Date.now() + MEMORY_WAIT_MS;
  if (await comfyUp()) {
    while (!(await comfyIdle())) {
      if (Date.now() > until) return null;
      log('ComfyUI is busy with other renders: waiting');
      await new Promise((r) => setTimeout(r, 5 * 60_000));
    }
    return { started: null };
  }
  while (freemem() < COMFY_FREE_BYTES) {
    if (Date.now() > until) return null;
    log(`waiting for memory for ComfyUI: ${(freemem() / 1024 ** 3).toFixed(1)} GB free, ${COMFY_FREE_BYTES / 1024 ** 3} GB needed`);
    await new Promise((r) => setTimeout(r, 5 * 60_000));
  }
  const out = join(HOME, 'studio', 'comfy.log');
  const logFile = openSync(out, 'a');
  const child = spawn(join(COMFY_DIR, 'venv', 'Scripts', 'python.exe'), ['run_noaudio.py'], {
    cwd: COMFY_DIR, detached: true, windowsHide: true, stdio: ['ignore', logFile, logFile],
  });
  child.unref();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    if (await comfyUp()) return { started: child.pid ?? null };
  }
  if (child.pid !== undefined) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
  log(`ComfyUI did not start within 5 minutes (see ${out})`);
  return null;
}

function python(args: string[]): string {
  const run = spawnSync('python', [join(ROOT, 'scripts', 'art', 'story-art.py'), ...args], { encoding: 'utf8', timeout: 20 * 60_000, windowsHide: true });
  if (run.status !== 0) throw new Error(`story-art.py ${args[0]}: ${(run.stderr || run.stdout).slice(0, 300)}`);
  return run.stdout.trim();
}

/** The story's picture: the scene from the story, three takes, Claude's pick, then the published size; null without one. */
async function picture(env: Env, job: StudioJob, dir: string, d: StoryDeck): Promise<string | null> {
  const out = join(dir, 'picture.webp');
  if (existsSync(out)) return out;
  if (existsSync(join(dir, 'picture-none.json'))) return null;
  const none = (why: string) => {
    writeFileSync(join(dir, 'picture-none.json'), JSON.stringify({ why }));
    log(`job ${job.id}: no picture: ${why}`);
    return null;
  };
  const server = await comfy();
  if (server === null) {
    // Not kept as a decision: a later run of the same job (a check-only run, then the real one) tries again.
    log(`job ${job.id}: no picture: ComfyUI could not be had within the hour (busy with other renders, not enough free memory, or it did not start)`);
    return null;
  }
  try {
    const { scene } = await step(dir, 'scene.json', () => claude(env, { system: SCENE_SYSTEM, prompt: scenePrompt(d), schema: SCENE_SCHEMA, cwd: HERE, effort: 'low', minutes: 5 }) as { scene: string });
    const look = python(['look', d.cast]);
    const renders = join(dir, 'renders');
    for (const round of [0, 1]) {
      const seeds = [1, 2, 3].map((i) => job.id * 100 + round * 10 + i);
      python(['scene', renders, d.cast, scene, '--seeds', ...seeds.map(String)]);
      const files = seeds.map((s) => `${s}.png`);
      const { pick, why } = claude(env, {
        system: pickSystem(d.cast, look, scene, files), prompt: 'Choose the picture.', schema: PICK_SCHEMA, cwd: renders,
        tools: ['Read'], allow: ['Read'], effort: 'low', minutes: 5,
      }) as { pick: number; why: string };
      log(`job ${job.id}: picture round ${round + 1}: ${pick === 0 ? 'none usable' : files[pick - 1]} (${why})`);
      if (Number.isInteger(pick) && pick >= 1 && pick <= files.length) {
        python(['webp', join(renders, files[pick - 1]!), out]);
        return out;
      }
    }
    return none('no take was usable twice over');
  } finally {
    // Stopped only when this run started it and nobody else has queued work on it since.
    if (server.started !== null) {
      if (await comfyIdle()) spawnSync('taskkill', ['/PID', String(server.started), '/T', '/F']);
      else log('ComfyUI is left running: someone else is rendering with it');
    }
  }
}

async function run(dry: boolean): Promise<void> {
  const env = readEnv(ENV_FILE);
  for (const key of ['LMU_SUPABASE_URL', 'LMU_SUPABASE_PUBLISHABLE_KEY', 'LMU_STUDIO_SECRET', 'CLAUDE_CODE_OAUTH_TOKEN']) {
    if (!env[key]) throw new Error(`${key} is missing from ${ENV_FILE}: run \`npm run studio -- ${key === 'CLAUDE_CODE_OAUTH_TOKEN' ? 'token' : 'setup'}\``);
  }
  const claimed = await studio(env, { action: 'claim', dry });
  if (claimed.status !== 200) throw new Error(`claim: ${claimed.status} ${JSON.stringify(claimed.body)}`);
  if ('none' in claimed.body) {
    log(`no job today: ${String(claimed.body.none)}`);
    if (claimed.body.none === 'no_topics') notify('Every topic has been written. Add topics to keep the daily article going.');
    return;
  }
  const job = claimed.body.job as StudioJob;
  const dir = join(JOBS, `job-${job.id}`);
  mkdirSync(dir, { recursive: true });
  log(`job ${job.id} (try ${job.attempt}): ${job.area}: ${job.topic}${dry ? ' [dry]' : ''}`);
  try {
    const r = await step(dir, 'research.json', () => research(env, job));
    const { brief, dropped } = await step(dir, 'brief.json', () => verify(r));
    log(`job ${job.id}: research: ${brief.facts.length} facts from ${brief.sources.length} pages (${dropped.length} quotes not found)`);
    const article = await step(dir, 'article.json', () => write(env, job, brief));
    const d = await step(dir, 'deck.json', () => deck(env, job, article, brief));
    // A picture is a nicety: anything that breaks in making it leaves the story without one, never the day without its article.
    const pic = await picture(env, job, dir, parseDeck(d)!).catch((error: unknown) => {
      log(`job ${job.id}: no picture: ${(error as Error).message}`);
      return null;
    });
    const sent = await studio(env, {
      action: 'submit', jobId: job.id, brief, article, deck: d, picture: pic === null ? null : readFileSync(pic).toString('base64'), dry,
    });
    writeFileSync(join(dir, dry ? 'checked.json' : 'stored.json'), JSON.stringify(sent, null, 2));
    if (sent.status === 422) throw new Refused(`the server refused it: ${JSON.stringify(sent.body.problems).slice(0, 600)}`);
    if (sent.status !== 200) throw new Error(`submit: ${sent.status} ${JSON.stringify(sent.body)}`);
    const title = (article as { title: string }).title;
    log(`job ${job.id}: ${dry ? 'checked' : 'published'} ${String(sent.body.stored ?? sent.body.checked)}: ${title} (${String(sent.body.words)} words, ${pic === null ? 'no picture' : 'with its picture'})`);
    if (!dry) notify(`Published: ${title}${pic === null ? ' (no picture)' : ''}`);
  } catch (error) {
    const message = (error as Error).message;
    log(`job ${job.id}: stopped: ${message}`);
    if (!dry) await studio(env, { action: 'fail', jobId: job.id, error: message }).catch(() => undefined);
    notify(`Today's article stopped: ${message.slice(0, 120)}`);
    process.exitCode = 1;
  }
}

/** The studio secret: the function's copy (secrets set, from a temporary file) and this PC's; nothing is printed. */
function setup(): void {
  const local = readEnv(join(ROOT, '.env.local'));
  if (!local.LMU_SUPABASE_URL || !local.LMU_SUPABASE_PUBLISHABLE_KEY) throw new Error('.env.local needs LMU_SUPABASE_URL and LMU_SUPABASE_PUBLISHABLE_KEY');
  const secret = randomBytes(32).toString('hex');
  const dir = mkdtempSync(join(tmpdir(), 'lmu-'));
  try {
    const file = join(dir, 'studio.env');
    writeFileSync(file, `LMU_STUDIO_SECRET=${secret}\n`, { mode: 0o600 });
    const set = supabase(['secrets', 'set', '--env-file', file, '--project-ref', PROJECT_REF]);
    if (set.status !== 0) throw new Error('secrets set failed (its output is hidden: it may hold the secret)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  writeEnv({ ...readEnv(ENV_FILE), LMU_SUPABASE_URL: local.LMU_SUPABASE_URL, LMU_SUPABASE_PUBLISHABLE_KEY: local.LMU_SUPABASE_PUBLISHABLE_KEY, LMU_STUDIO_SECRET: secret });
  console.log(`The studio secret is set: LMU_STUDIO_SECRET on the server and in ${ENV_FILE}. Nothing secret was printed.`);
}

/**
 * Takes the token `claude setup-token` printed from the clipboard (a paste into a hidden prompt arrives wrapped in the
 * terminal's paste markers), keeps it in the studio's env file, empties the clipboard and checks the token with one
 * tiny call. The token is never printed.
 */
function token(given: readonly string[]): void {
  const clip = given.length > 0 ? null : spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Clipboard -Raw'], { encoding: 'utf8', windowsHide: true });
  // Or typed after the command. A token wrapped over two lines when it was copied is joined again: whitespace is
  // never part of it.
  const found = /sk-ant-oat[A-Za-z0-9_-]{20,}/.exec((clip === null ? given.join('') : clip.stdout ?? '').replace(/\s+/g, ''));
  if (found === null) throw new Error('the clipboard holds no token from `claude setup-token` (one starts with sk-ant-oat): copy it, then run this again; nothing was saved');
  const env = { ...readEnv(ENV_FILE), CLAUDE_CODE_OAUTH_TOKEN: found[0] };
  writeEnv(env);
  spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Set-Clipboard -Value $null'], { windowsHide: true });
  console.log(`Saved in ${ENV_FILE}, and the clipboard is emptied. Checking it with one small call…`);
  const answer = claude(env, {
    system: 'Answer in the requested JSON.', prompt: 'Is this working? Answer true.', cwd: HERE, effort: 'low', minutes: 3,
    schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
  }) as { ok?: unknown };
  console.log(answer.ok === true ? 'Signed in: Claude Code answered on your plan.' : 'Claude Code answered, but not as expected.');
}

function status(): void {
  if (existsSync(LOG)) console.log(readFileSync(LOG, 'utf8').trimEnd().split('\n').slice(-30).join('\n'));
  else console.log('No runs yet.');
  if (existsSync(JOBS)) console.log(`\nJobs kept in ${JOBS}: ${readdirSync(JOBS).join(', ') || 'none'}`);
}

const [command, ...rest] = process.argv.slice(2);
try {
  switch (command) {
    case 'setup': setup(); break;
    case 'token': token(rest); break;
    case 'run': await run(rest.includes('--dry')); break;
    case 'status': status(); break;
    default: throw new Error('commands: setup, token, run [--dry], status');
  }
} catch (error) {
  // Only a known command is named: anything else typed there (a token pasted in the wrong place) is never logged.
  log(`studio ${['setup', 'token', 'run', 'status'].includes(command ?? '') ? command : '(unknown command)'}: ${(error as Error).message}`);
  process.exitCode = 1;
}
