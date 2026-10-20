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
import { checkDeck, parseDeck } from './deck.ts';
import type { ArticleDeck } from './deck.ts';
import { clip } from './text.ts';
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
/** A batch the API still can't show after this is given up: its jobs keep their estimates and use their attempts. */
export const BATCH_LOST_MS = 48 * 60 * 60 * 1000;
/** M11: decks written per cron tick (two calls side by side fit the function's time limit). */
export const DECKS_PER_TICK = 2;

/** M15: 'studio' is a job the owner's PC has taken (the studio); the tick never moves one. */
export type JobStatus = 'queued' | 'researching' | 'researched' | 'writing' | 'retry' | 'done' | 'failed' | 'studio';
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
  /** Why the last attempt failed; a rewrite is told (M8a spike). */
  error: string | null;
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
  /** M11: published or waiting articles with no deck and fewer than two tries, newest first. */
  decksDue(limit: number): Promise<DeckSource[]>;
  /** M11: takes one of the article's two tries, from the count this tick saw; false when another tick took it. */
  claimDeck(articleId: string, attempts: number): Promise<boolean>;
  /** M11: what a try gave: the deck, or why there is none. */
  saveDeck(articleId: string, deck: ArticleDeck | null, error: string | null): Promise<void>;
}

/** M11: an article to deck, with its tries so far, its job (the budget's row) and its brief's excerpts (the copying check). */
export type DeckSource = { id: string; attempts: number; jobId: number; draft: ArticleDraft; excerpts: string[] };
export type DeckAnswer = { value: unknown; usage: Usage } | { error: string; usage: Usage | null; maybeBilled: boolean };
export interface Decks {
  write(source: DeckSource): Promise<DeckAnswer>;
}

export type BatchMessage = { content: readonly unknown[]; stop_reason: string | null; usage: Usage };
export type BatchResult = { customId: string; type: 'succeeded' | 'errored' | 'canceled' | 'expired'; message: BatchMessage | null; error: string | null };

/**
 * Thrown by `Batches.submit` when the API answered with an error, so no batch was made: `busy` (rate limited or
 * overloaded: a later tick tries again) or `refused` (the same request would fail again). Any other error means no
 * answer came, and the batch may have been made and billed (M8a review).
 */
export class SubmitError extends Error {
  outcome: 'busy' | 'refused';
  constructor(outcome: 'busy' | 'refused', message: string) {
    super(message);
    this.outcome = outcome;
  }
}

export interface Batches {
  submit(requests: readonly BatchRequest[]): Promise<string>;
  state(batchId: string): Promise<{ ended: boolean; createdAtMs: number }>;
  results(batchId: string): Promise<BatchResult[]>;
  cancel(batchId: string): Promise<void>;
}

export type TickReport = {
  ran: boolean; queued: number; submitted: number; collected: number; published: string[]; review: string[]; retry: number; failed: number;
  budget: boolean; errors: number;
  /** M11: the articles given a deck this tick, and those whose deck was refused. */
  decked: string[]; deckFailed: string[];
};

/** The UTC date whose night has begun by `nowMs`, or null before 18:00 UTC. */
export function nightOf(nowMs: number): string | null {
  const at = new Date(nowMs);
  return at.getUTCHours() >= NIGHT_HOUR_UTC ? at.toISOString().slice(0, 10) : null;
}

/**
 * One step of the pipeline. `nights: false` (the owner's manual tick) only moves the jobs along: it never queues the
 * night's articles or requeues retries, so a manual tick spends nothing the owner didn't queue (M8a deploy). M11: with
 * `decks`, a cron tick also writes the Story Decks of up to DECKS_PER_TICK articles that have none; a manual tick never.
 */
export async function tick(store: Store, batches: Batches, nowMs: number, options: { nights: boolean; decks?: Decks } = { nights: true }): Promise<TickReport> {
  const report: TickReport = {
    ran: false, queued: 0, submitted: 0, collected: 0, published: [], review: [], retry: 0, failed: 0, budget: false, errors: 0, decked: [], deckFailed: [],
  };
  if (!(await store.begin(LEASE_SECONDS))) return report;
  report.ran = true;
  try {
    report.queued = options.nights ? await queueNight(store, nowMs) : 0;
    await collect(store, batches, nowMs, report);
    // Writing first: near the cap, a brief already paid for gets the budget before new research does (M8a review).
    await submit(store, batches, nowMs, report, 'researched');
    await submit(store, batches, nowMs, report, 'queued');
    if (options.nights && options.decks !== undefined) await writeDecks(store, options.decks, report);
  } finally {
    await store.end();
  }
  return report;
}

/**
 * M11 decision 4: decks for the newest articles that have none, each reserved against the cap like every call. The
 * try is taken before the call (M11 review): a tick that dies while Claude answers has still used it, so an article is
 * called at most twice, and its reservation stays booked at the estimate.
 */
async function writeDecks(store: Store, decks: Decks, report: TickReport): Promise<void> {
  if (report.budget) return;
  const due = await store.decksDue(DECKS_PER_TICK);
  const reserved: { source: DeckSource; aiCallId: number }[] = [];
  for (const source of due) {
    const id = await store.reserve(source.jobId, ESTIMATE_USD.deck);
    if (id === 'budget') {
      report.budget = true;
      break;
    }
    if (await store.claimDeck(source.id, source.attempts)) reserved.push({ source, aiCallId: id });
    else await store.finish(id, { status: 'failed', usage: null, costUsd: 0, error: 'another tick took the deck' });
  }
  await Promise.all(reserved.map(async ({ source, aiCallId }) => {
    try {
      const answer = await decks.write(source).catch((error: unknown): DeckAnswer => ({ error: clip(String(error), 200), usage: null, maybeBilled: true }));
      const deck = 'value' in answer ? parseDeck(answer.value) : null;
      const problems = 'error' in answer ? [answer.error] : deck === null ? ['the deck does not match its schema'] : checkDeck(deck, source.draft, source.excerpts);
      const usage = answer.usage;
      await store.finish(aiCallId, {
        status: problems.length === 0 ? 'ok' : 'failed',
        usage,
        costUsd: usage !== null ? costUsd(ARTICLE_MODEL, usage, false) : 'maybeBilled' in answer && answer.maybeBilled ? ESTIMATE_USD.deck : 0,
        error: problems.length === 0 ? null : clip(problems.join('; '), 1000),
      });
      await store.saveDeck(source.id, problems.length === 0 ? deck : null, problems.length === 0 ? null : clip(problems.join('; '), 1000));
      (problems.length === 0 ? report.decked : report.deckFailed).push(source.id);
    } catch (error) {
      // One deck that breaks something must not stop the tick; its try is already used, so it can't be paid for every tick.
      report.errors++;
      console.error(`article deck ${source.id}`, error);
      await store.saveDeck(source.id, null, `internal: ${clip(String(error), 200)}`).catch(() => {});
    }
  }));
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
      // A submission that died midway may have gone out: its estimate stays spent and it uses the attempt, so a
      // submission that keeps dying can't book the estimate every tick (M8a review).
      const error = 'the submission did not finish';
      if (job.aiCallId !== null) await store.finish(job.aiCallId, { status: 'failed', usage: null, costUsd: ESTIMATE_USD[stepOf(job)], error });
      await failAttempt(store, job, error, report);
    }
  }
  const batchIds = [...new Set(jobs.flatMap((j) => (inFlight(j) && j.batchId !== null ? [j.batchId] : [])))];
  for (const batchId of batchIds) {
    let results: Map<string, BatchResult>;
    try {
      const state = await batches.state(batchId);
      if (!state.ended) {
        // Its jobs fail when the cancelled batch ends (its results say "canceled").
        if (nowMs - state.createdAtMs > BATCH_GIVE_UP_MS) await batches.cancel(batchId);
        continue;
      }
      results = new Map((await batches.results(batchId)).map((r) => [r.customId, r]));
    } catch (error) {
      // The API can't show the batch now: the next tick asks again, until the batch is given up (M8a re-review).
      report.errors++;
      console.error(`article batch ${batchId}`, error);
      for (const job of jobs.filter((j) => j.batchId === batchId && inFlight(j) && j.submittedAtMs !== null && nowMs - j.submittedAtMs > BATCH_LOST_MS)) {
        const lost = 'the batch can no longer be read';
        if (job.aiCallId !== null) await store.finish(job.aiCallId, { status: 'failed', usage: null, costUsd: ESTIMATE_USD[stepOf(job)], error: lost });
        await failAttempt(store, job, lost, report);
      }
      continue;
    }
    for (const job of jobs.filter((j) => j.batchId === batchId && inFlight(j))) {
      report.collected++;
      const result = results.get(customId(job.id, job.attempt, stepOf(job)));
      try {
        if (job.status === 'researching') await collectResearch(store, job, result, report);
        else await collectWrite(store, job, result, report);
      } catch (error) {
        // One answer that breaks something must not stop the pipeline (M8a review): its job fails this attempt.
        report.errors++;
        console.error(`article job ${job.id}`, error);
        await failAttempt(store, job, `internal: ${clip(String(error), 200)}`, report);
      }
    }
  }
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
  if (problems.length > 0 || draft === null || job.brief === null) {
    // M8a spike: a refused draft is written again at once from the same research, told why: the research is fine and
    // costs most. A second refusal fails the job.
    if (job.brief !== null && job.attempt < 2) {
      await store.move(job.id, 'writing', 'researched', {
        attempt: job.attempt + 1, batchId: null, aiCallId: null, submittedAt: null, error: clip(problems.join('; '), 1000),
      });
      report.retry++;
      return;
    }
    return failAttempt(store, job, problems.join('; '), report);
  }
  const words = articleWords(draft);
  const cited = new Set(draft.sections.flatMap((s) => s.sourceIds));
  const sources = job.brief.sources.filter((s) => cited.has(s.id)).map((s) => ({ idx: s.id, url: s.url, title: s.title }));
  const id = await store.store(job.id, { ...draft, words, readingMinutes: readingMinutes(words) }, sources);
  (job.evergreen ? report.review : report.published).push(id);
}

async function failAttempt(store: Store, job: Job, error: string, report: TickReport): Promise<void> {
  const to: JobStatus = job.attempt < 2 ? 'retry' : 'failed';
  await store.move(job.id, job.status, to, { batchId: null, aiCallId: null, submittedAt: null, brief: null, error: clip(error, 1000) });
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
    // Busy: nothing was sent, so the jobs go back for a later tick and use no attempt. Refused: nothing was sent, but the
    // same request would fail again, so each uses its attempt. No answer (a timeout, a lost connection): the batch may
    // have been made and billed, so the estimate stays spent and each uses its attempt (M8a review).
    const outcome = error instanceof SubmitError ? error.outcome : 'unknown';
    const message = `submit: ${clip(String(error), 200)}`;
    for (const { job, aiCallId } of ready) {
      await store.finish(aiCallId, { status: 'failed', usage: null, costUsd: outcome === 'unknown' ? ESTIMATE_USD[step] : 0, error: message });
      if (outcome === 'busy') await store.move(job.id, to, from, { aiCallId: null, submittedAt: null });
      else await failAttempt(store, { ...job, status: to }, message, report);
    }
    return;
  }
  for (const { job } of ready) await store.move(job.id, to, to, { batchId });
  report.submitted += ready.length;
}
