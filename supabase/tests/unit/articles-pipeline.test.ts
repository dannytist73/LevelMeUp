import { describe, expect, it } from 'vitest';
import { ARTICLE_TOPICS } from '../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../packages/content/src/index.ts';
import { BATCH_GIVE_UP_MS, BATCH_LOST_MS, SubmitError, nightOf, tick } from '../../functions/_shared/articles/pipeline.ts';
import type { BatchResult, Batches, Finish, Job, JobSet, JobStatus, Store, StoredArticle, StoredSource } from '../../functions/_shared/articles/pipeline.ts';
import type { BatchRequest } from '../../functions/_shared/prompts/articles.ts';
import { BRIEF, articleJson } from './articles-fixtures.ts';

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
  /** Makes the moves it matches throw, as a database error would. */
  breakMove: ((id: number, to: JobStatus) => boolean) | null = null;

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
    if (this.breakMove?.(id, to)) throw new Error('invalid input syntax for type json');
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
  failNext: Error | null = null;
  clock = NIGHT;
  async submit(requests: readonly BatchRequest[]) {
    const failure = this.failNext;
    this.failNext = null;
    if (failure !== null) throw failure;
    const id = `batch-${this.submitted.length + 1}`;
    this.submitted.push({ id, requests, createdAtMs: this.clock });
    return id;
  }
  unreadable = false;
  async state(id: string) {
    if (this.unreadable) throw new Error('404 not_found_error');
    return { ended: this.ended.has(id), createdAtMs: this.submitted.find((b) => b.id === id)!.createdAtMs };
  }
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

  it('puts the jobs back when the API is busy, using no attempt', async () => {
    const { store, batches, run } = setup();
    batches.failNext = new SubmitError('busy', '529 overloaded');
    expect((await run()).submitted).toBe(0);
    expect(store.jobs.map((j) => [j.status, j.attempt, j.aiCallId])).toEqual([['queued', 1, null], ['queued', 1, null]]);
    expect(store.calls.map((c) => c.finish!.costUsd)).toEqual([0, 0]);
    expect((await run(NIGHT + HOUR)).submitted).toBe(2);
  });

  it('uses the attempt when the API refuses the request, at no cost', async () => {
    const { store, batches, run } = setup();
    batches.failNext = new SubmitError('refused', '400 invalid_request_error');
    expect(await run()).toMatchObject({ submitted: 0, retry: 2 });
    expect(store.jobs.map((j) => [j.status, j.attempt, j.aiCallId])).toEqual([['retry', 1, null], ['retry', 1, null]]);
    expect(store.calls.map((c) => c.finish!.costUsd)).toEqual([0, 0]);
  });

  it('keeps the estimate and uses the attempt when no answer came (M8a review: the batch may exist)', async () => {
    const { store, batches, run } = setup();
    batches.failNext = new Error('Request timed out.');
    expect(await run()).toMatchObject({ submitted: 0, retry: 2 });
    expect(store.jobs.map((j) => j.status)).toEqual(['retry', 'retry']);
    expect(store.calls.map((c) => c.finish!.costUsd)).toEqual([0.4, 0.4]);
    expect(store.job(1).error).toBe('submit: Error: Request timed out.');
  });

  it('notices a submission that died midway: its estimate stays spent and it uses the attempt', async () => {
    const { store, batches, run } = setup();
    store.short = 0;
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: false }]);
    const call = await store.reserve(1, 0.4);
    await store.move(1, 'queued', 'researching', { aiCallId: call as number, submittedAt: new Date(DAY).toISOString(), batchId: null });
    expect((await run(DAY + 2 * HOUR)).retry).toBe(1);
    expect(store.calls[0]!.finish).toEqual({ status: 'failed', usage: null, costUsd: 0.4, error: 'the submission did not finish' });
    expect(store.job(1)).toMatchObject({ status: 'retry', aiCallId: null, error: 'the submission did not finish' });
    expect(batches.submitted).toHaveLength(0);
  });

  it('carries on when one answer breaks something (M8a review)', async () => {
    const { store, batches, run } = setup();
    await run();
    batches.finishLast(() => researchAnswer());
    store.breakMove = (id, to) => id === 1 && to === 'researched';
    const report = await run(NIGHT + HOUR);
    expect(report).toMatchObject({ ran: true, errors: 1, retry: 1, submitted: 1 });
    expect(store.job(1)).toMatchObject({ status: 'retry', error: 'internal: Error: invalid input syntax for type json' });
    expect(store.job(2).status).toBe('writing');
    expect(store.leased).toBe(false);
  });

  it('gives the budget to writing before new research (M8a review)', async () => {
    const { store, batches, run } = setup();
    store.short = 0;
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: false }, { cluster: 'focus', topic: 'Single-tasking', evergreen: false }]);
    await store.move(1, 'queued', 'researched', { brief: BRIEF });
    store.budgetLeft = 0.3;
    expect(await run(DAY)).toMatchObject({ submitted: 1, budget: true });
    expect(store.jobs.map((j) => j.status)).toEqual(['writing', 'queued']);
    expect(batches.submitted[0]!.requests.map((r) => r.custom_id)).toEqual(['job-1-1-write']);
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

  it('gives up a batch the API can no longer show, keeping the estimates (M8a re-review)', async () => {
    const { store, batches, run } = setup();
    await run();
    store.short = 0;
    batches.unreadable = true;
    expect(await run(NIGHT + HOUR)).toMatchObject({ errors: 1, retry: 0 });
    expect(store.job(1).status).toBe('researching');
    expect(await run(NIGHT + BATCH_LOST_MS + HOUR)).toMatchObject({ errors: 1, retry: 2 });
    expect(store.job(1)).toMatchObject({ status: 'retry', error: 'the batch can no longer be read' });
    expect(store.calls.map((c) => c.finish!.costUsd)).toEqual([0.4, 0.4]);
  });

  it('treats a paused or cut-off answer as a failure', async () => {
    const { store, batches, run } = setup();
    await run();
    batches.finishLast(() => ({ ...researchAnswer(), message: { ...researchAnswer().message!, stop_reason: 'pause_turn' } }));
    await run(NIGHT + HOUR);
    expect(store.job(1)).toMatchObject({ status: 'retry', error: 'stop_reason pause_turn' });
  });
});
