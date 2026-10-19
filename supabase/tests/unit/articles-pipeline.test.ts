import { describe, expect, it } from 'vitest';
import { ARTICLE_TOPICS } from '../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../packages/content/src/index.ts';
import { parseArticle } from '../../functions/_shared/articles/check.ts';
import type { ArticleDraft } from '../../functions/_shared/articles/check.ts';
import type { ArticleDeck } from '../../functions/_shared/articles/deck.ts';
import { BATCH_GIVE_UP_MS, BATCH_LOST_MS, DECKS_PER_TICK, SubmitError, nightOf, tick } from '../../functions/_shared/articles/pipeline.ts';
import type {
  BatchResult, Batches, DeckAnswer, DeckSource, Decks, Finish, Job, JobSet, JobStatus, Store, StoredArticle, StoredSource,
} from '../../functions/_shared/articles/pipeline.ts';
import type { BatchRequest } from '../../functions/_shared/prompts/articles.ts';
import { BRIEF, articleJson, storyDeckJson } from './articles-fixtures.ts';

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
      this.jobs.push({ id, ...j, status: 'queued', attempt: 1, batchId: null, aiCallId: null, submittedAtMs: null, brief: null, error: null });
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
    if (set.error !== undefined) job.error = set.error;
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
  job(id: number) { return this.jobs.find((j) => j.id === id)!; }
  /** M11: articles and their decks, as 0016's functions keep them. */
  decks: { id: string; jobId: number; draft: ArticleDraft; excerpts: string[]; deck: ArticleDeck | null; attempts: number; error: string | null }[] = [];
  async decksDue(limit: number): Promise<DeckSource[]> {
    return this.decks.filter((d) => d.deck === null && d.attempts < 2).slice(0, limit)
      .map(({ id, attempts, jobId, draft, excerpts }) => ({ id, attempts, jobId, draft, excerpts }));
  }
  /** Set by a test: runs between the due list and the claim, as another tick would. */
  beforeClaim: (() => void) | null = null;
  async claimDeck(id: string, attempts: number) {
    this.beforeClaim?.();
    const d = this.decks.find((x) => x.id === id)!;
    if (d.deck !== null || d.attempts !== attempts || attempts >= 2) return false;
    d.attempts = attempts + 1;
    return true;
  }
  async saveDeck(id: string, deck: ArticleDeck | null, error: string | null) {
    const d = this.decks.find((x) => x.id === id)!;
    if (d.deck !== null) return;
    d.deck = deck;
    d.error = deck === null ? error : null;
  }
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

  it('queues no night from the owner\'s manual tick, which still moves the jobs along (M8a deploy)', async () => {
    const { store, batches } = setup();
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: true }]);
    store.jobs.push({ ...store.jobs[0]!, id: 2, status: 'retry' });
    expect(await tick(store, batches, NIGHT, { nights: false })).toMatchObject({ ran: true, queued: 0, submitted: 1 });
    expect(store.night).toBeNull();
    expect(store.jobs.map((j) => j.status)).toEqual(['researching', 'retry']);
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

  it('writes a refused draft again at once from the same research, told why; a second refusal fails the job (M8a spike)', async () => {
    const { store, batches, run } = setup();
    store.short = 0;
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: false }]);
    await run(DAY);
    batches.finishLast(() => researchAnswer());
    await run(DAY + HOUR);
    const brief = store.job(1).brief;
    batches.finishLast(() => writeAnswer({ ...articleJson(), title: 'Delve into rest and how it builds you' }));
    expect(await run(DAY + 2 * HOUR)).toMatchObject({ retry: 1, submitted: 1 });
    expect(store.job(1)).toMatchObject({ status: 'writing', attempt: 2, error: 'robotic phrase "delve"', brief });
    const rewrite = batches.submitted.at(-1)!.requests[0]!;
    expect(rewrite.custom_id).toBe('job-1-2-write');
    expect(JSON.stringify(rewrite.params.messages)).toContain('robotic phrase \\"delve\\"');
    expect(store.calls.map((c) => c.finish?.status ?? 'pending')).toEqual(['ok', 'failed', 'pending']);
    expect(store.articles).toEqual([]);

    batches.finishLast(() => writeAnswer({ ...articleJson(), title: 'Delve into rest, once more with feeling' }));
    expect(await run(DAY + 3 * HOUR)).toMatchObject({ failed: 1 });
    expect(store.job(1)).toMatchObject({ status: 'failed', error: 'robotic phrase "delve"', brief: null });
    expect(store.articles).toEqual([]);
  });

  it('a rewrite that passes is published like any article', async () => {
    const { store, batches, run } = setup();
    store.short = 0;
    await store.queue([{ cluster: 'sleep', topic: 'How sleep cycles work', evergreen: false }]);
    await run(DAY);
    batches.finishLast(() => researchAnswer());
    await run(DAY + HOUR);
    batches.finishLast(() => writeAnswer({ ...articleJson(), title: 'Delve into rest and how it builds you' }));
    await run(DAY + 2 * HOUR);
    batches.finishLast(() => writeAnswer());
    expect(await run(DAY + 3 * HOUR)).toMatchObject({ published: ['article-1'] });
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

/** M11: a deck writer whose answers the test sets, per article. */
class FakeDecks implements Decks {
  answers = new Map<string, DeckAnswer | Error>();
  written: string[] = [];
  async write(source: DeckSource): Promise<DeckAnswer> {
    this.written.push(source.id);
    const answer = this.answers.get(source.id) ?? { value: DECK, usage: DECK_USAGE };
    if (answer instanceof Error) throw answer;
    return answer;
  }
}

const DECK_USAGE = { input_tokens: 3_000, output_tokens: 800 };
const DECK = storyDeckJson();

describe('the Story Deck step (M11 decision 4)', () => {
  const draft = parseArticle(articleJson())!;
  function withArticles(n: number) {
    const { store, batches } = setup();
    store.short = 0; // no new night's articles: only the decks run
    for (let i = 1; i <= n; i++) store.decks.push({ id: `article-${i}`, jobId: i, draft, excerpts: BRIEF.excerpts, deck: null, attempts: 0, error: null });
    const decks = new FakeDecks();
    return { store, decks, run: (options: { nights: boolean; decks?: Decks } = { nights: true, decks }) => tick(store, batches, NIGHT, options) };
  }

  it('a cron tick decks up to two articles, each reserved first and booked at its real cost', async () => {
    const { store, decks, run } = withArticles(3);
    const report = await run();
    expect(DECKS_PER_TICK).toBe(2);
    expect(report).toMatchObject({ decked: ['article-1', 'article-2'], deckFailed: [] });
    expect(store.decks.map((d) => d.deck === null)).toEqual([false, false, true]);
    expect(store.decks[0]!.deck).toMatchObject({ v: 2, cast: 'jonah', title: 'Rest builds you' });
    expect(store.calls.map((c) => [c.jobId, c.estimate, c.finish!.status, c.finish!.costUsd])).toEqual([[1, 0.08, 'ok', 0.028], [2, 0.08, 'ok', 0.028]]);
    expect((await run()).decked).toEqual(['article-3']);
    expect((await run()).decked).toEqual([]);
  });

  it('the owner\'s manual tick never decks, and neither does a tick without a writer', async () => {
    const { store, decks, run } = withArticles(1);
    expect((await run({ nights: false, decks })).decked).toEqual([]);
    expect((await run({ nights: true })).decked).toEqual([]);
    expect(decks.written).toEqual([]);
    expect(store.calls).toEqual([]);
  });

  it('a refused deck uses one of its two tries and says why; after two it is left to the full article', async () => {
    const { store, decks, run } = withArticles(1);
    decks.answers.set('article-1', { value: storyDeckJson({ lesson: 'Rest for 66 days and you will be strong.' }), usage: DECK_USAGE });
    expect((await run()).deckFailed).toEqual(['article-1']);
    expect(store.decks[0]).toMatchObject({ deck: null, attempts: 1, error: 'the number 66 is not in the article' });
    expect(store.calls[0]!.finish).toMatchObject({ status: 'failed', costUsd: 0.028 });
    decks.answers.set('article-1', { value: { story: 'nope' }, usage: DECK_USAGE });
    expect((await run()).deckFailed).toEqual(['article-1']);
    expect(store.decks[0]).toMatchObject({ attempts: 2, error: 'the deck does not match its schema' });
    expect((await run()).deckFailed).toEqual([]);
    expect(decks.written).toHaveLength(2);
  });

  it('a call that never answered, or threw, books the estimate and uses its try', async () => {
    const { store, decks, run } = withArticles(2);
    decks.answers.set('article-1', { error: 'TypeError: network', usage: null, maybeBilled: true });
    decks.answers.set('article-2', new Error('boom'));
    const report = await run();
    expect(report.deckFailed).toEqual(['article-1', 'article-2']);
    expect(store.calls.map((c) => [c.finish!.costUsd, c.finish!.error])).toEqual([[0.08, 'TypeError: network'], [0.08, 'Error: boom']]);
    expect(store.decks.map((d) => d.attempts)).toEqual([1, 1]);
  });

  it('takes the try before calling, so a tick that dies mid-call has used it (M11 review)', async () => {
    const { store, decks, run } = withArticles(1);
    decks.write = async (source) => {
      decks.written.push(source.id);
      expect(store.decks[0]!.attempts).toBe(1); // already taken while Claude answers
      throw new Error('the function was stopped');
    };
    await run();
    await run();
    expect(store.decks[0]).toMatchObject({ deck: null, attempts: 2 });
    expect((await run()).deckFailed).toEqual([]);
    expect(decks.written).toEqual(['article-1', 'article-1']); // two calls at most, ever
  });

  it('skips an article another tick took after this one listed it, and frees its reservation', async () => {
    const { store, decks, run } = withArticles(1);
    store.beforeClaim = () => { store.decks[0]!.attempts = 1; store.beforeClaim = null; };
    expect(await run()).toMatchObject({ decked: [], deckFailed: [] });
    expect(decks.written).toEqual([]);
    expect(store.calls.map((c) => [c.finish!.costUsd, c.finish!.error])).toEqual([[0, 'another tick took the deck']]);
  });

  it('stops at the monthly cap without calling', async () => {
    const { store, decks, run } = withArticles(2);
    store.budgetLeft = 0.05;
    expect(await run()).toMatchObject({ budget: true, decked: [] });
    expect(decks.written).toEqual([]);
    expect(store.decks.map((d) => d.attempts)).toEqual([0, 0]); // no try taken without a reservation
  });
});
