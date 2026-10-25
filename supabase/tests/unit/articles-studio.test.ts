// M15: the daily studio's server side: which job the PC gets, what it may hand back, and how it is stored.
import { describe, expect, it } from 'vitest';
import { ARTICLE_TOPICS } from '../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../packages/content/src/index.ts';
import type { Brief } from '../../functions/_shared/articles/brief.ts';
import type { StoryDeck } from '../../functions/_shared/articles/deck.ts';
import { tick } from '../../functions/_shared/articles/pipeline.ts';
import type { Batches, Job, JobSet, JobStatus, Store, StoredArticle, StoredSource } from '../../functions/_shared/articles/pipeline.ts';
import {
  STUDIO_ATTEMPTS, claim, parseStudioBrief, readGrumble, readPicture, readScenes, readSubmission, recordFailure, repicture, rescene, storyPicturePath,
  storyScenePath, studioPicturePath, submit, webpSize,
} from '../../functions/_shared/articles/studio.ts';
import type { StudioStore, Submission } from '../../functions/_shared/articles/studio.ts';
import { BRIEF, articleJson, storyDeckJson } from './articles-fixtures.ts';

class FakeStudio implements StudioStore, Store {
  leased = false;
  jobs: Job[] = [];
  stored: { jobId: number; article: StoredArticle; sources: readonly StoredSource[]; brief: Brief; deck: StoryDeck }[] = [];
  async begin() { if (this.leased) return false; this.leased = true; return true; }
  async end() { this.leased = false; }
  async topicsUsed() { return this.jobs.map((j) => ({ cluster: j.cluster, topic: j.topic, queuedAtMs: j.id })); }
  async queue(jobs: readonly { cluster: ArticleCluster; topic: string; evergreen: boolean }[]) {
    return jobs.map((j) => {
      const id = this.jobs.length + 57;
      this.jobs.push({ id, ...j, status: 'queued', attempt: 1, batchId: null, aiCallId: null, submittedAtMs: null, brief: null, error: null });
      return id;
    });
  }
  async openJobs() { return this.jobs.filter((j) => j.status !== 'done' && j.status !== 'failed').map((j) => ({ ...j })); }
  async move(id: number, from: JobStatus, to: JobStatus, set: JobSet) {
    const job = this.jobs.find((j) => j.id === id);
    if (job === undefined || job.status !== from) return false;
    job.status = to;
    if (set.attempt !== undefined) job.attempt = set.attempt;
    if (set.error !== undefined) job.error = set.error;
    return true;
  }
  async storeStudio(jobId: number, article: StoredArticle, sources: readonly StoredSource[], brief: Brief, deck: StoryDeck) {
    this.job(jobId).status = 'done';
    this.stored.push({ jobId, article, sources, brief, deck });
    return `article-${jobId}`;
  }
  decks = new Map<string, { picture?: string; cards?: number; scenes?: readonly (string | null)[]; grumble?: string | null }>();
  async setPicture(articleId: string, path: string) {
    const deck = this.decks.get(articleId);
    if (deck === undefined) return false;
    deck.picture = path;
    return true;
  }
  async setScenes(articleId: string, scenes: readonly (string | null)[], grumble: string | null) {
    const deck = this.decks.get(articleId);
    if (deck === undefined || deck.cards !== scenes.length) return false;
    Object.assign(deck, { scenes, grumble });
    return true;
  }
  job(id: number) { return this.jobs.find((j) => j.id === id)!; }
  // The rest of the tick's store, for the check that the tick leaves studio jobs alone.
  async claimNight() { return false; }
  async shortPlayers() { return 0; }
  async reserve() { return 1; }
  async finish() {}
  async store(): Promise<string> { throw new Error('the tick stored something'); }
  async decksDue() { return []; }
  async claimDeck() { return false; }
  async saveDeck() {}
}

/** The first 30 bytes of a webp: RIFF, WEBP and a VP8X chunk holding the canvas size, as ffmpeg's libwebp writes it. */
function webpHeader(width: number, height: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(30);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  b.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
  b[16] = 10;
  b.set([(width - 1) & 0xff, ((width - 1) >> 8) & 0xff, (width - 1) >> 16, (height - 1) & 0xff, ((height - 1) >> 8) & 0xff, (height - 1) >> 16], 24);
  return b;
}
const base64 = (b: Uint8Array) => Buffer.from(b).toString('base64');
/** The fixture story's cards. */
const CARDS = storyDeckJson().story as unknown[];

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { action: 'submit', jobId: 57, brief: BRIEF, article: articleJson(), deck: storyDeckJson(), picture: base64(webpHeader(960, 540)), ...overrides };
}

describe('the studio takes one job at a time (M15)', () => {
  it('takes a new topic as a studio job, picked like the tick\'s', async () => {
    const store = new FakeStudio();
    const result = await claim(store);
    expect(result).toEqual({ job: { id: 57, cluster: 'habits', area: expect.any(String), topic: ARTICLE_TOPICS.habits[0], attempt: 1, articleId: 'article-57' } });
    expect(store.job(57)).toMatchObject({ status: 'studio', evergreen: false });
    expect(store.leased).toBe(false);
  });

  it('waits while the tick holds the lease', async () => {
    const store = new FakeStudio();
    store.leased = true;
    expect(await claim(store)).toEqual({ none: 'busy' });
    expect(store.jobs).toEqual([]);
  });

  it('finishes its own unfinished job next, and fails it after the last try', async () => {
    const store = new FakeStudio();
    await claim(store);
    expect(await recordFailure(store, 57, 'the research cited one page')).toBe(true);
    expect(await claim(store)).toMatchObject({ job: { id: 57, attempt: STUDIO_ATTEMPTS } });
    const third = await claim(store);
    expect(store.job(57)).toMatchObject({ status: 'failed', error: 'the research cited one page' });
    expect(third).toMatchObject({ job: { id: 58, attempt: 1 } });
  });

  it('lets a check-only run take its job without using a try', async () => {
    const store = new FakeStudio();
    await claim(store);
    expect(await claim(store, true)).toMatchObject({ job: { id: 57, attempt: 1 } });
    expect(await claim(store, true)).toMatchObject({ job: { id: 57, attempt: 1 } });
    expect(await claim(store)).toMatchObject({ job: { id: 57, attempt: 2 } });
    expect(store.jobs).toHaveLength(1);
  });

  it('says so when every topic has been used', async () => {
    const store = new FakeStudio();
    for (const [cluster, topics] of Object.entries(ARTICLE_TOPICS)) {
      for (const topic of topics) await store.queue([{ cluster: cluster as ArticleCluster, topic, evergreen: false }]);
    }
    for (const job of store.jobs) job.status = 'done';
    expect(await claim(store)).toEqual({ none: 'no_topics' });
  });

  it('records a failure only on a studio job', async () => {
    const store = new FakeStudio();
    await store.queue([{ cluster: 'sleep', topic: 'A queued topic', evergreen: false }]);
    expect(await recordFailure(store, 57, 'x')).toBe(false);
    expect(store.job(57).status).toBe('queued');
  });

  it('is never sent to the API by the tick', async () => {
    const store = new FakeStudio();
    await claim(store);
    const sent: unknown[] = [];
    const batches: Batches = {
      async submit(requests) { sent.push(...requests); return 'batch'; },
      async state() { return { ended: false, createdAtMs: 0 }; },
      async results() { return []; },
      async cancel() {},
    };
    const report = await tick(store, batches, Date.UTC(2026, 9, 20, 19), { nights: true });
    expect(sent).toEqual([]);
    expect(report).toMatchObject({ submitted: 0, collected: 0, retry: 0, failed: 0 });
    expect(store.job(57)).toMatchObject({ status: 'studio', attempt: 1 });
  });
});

describe('what the studio hands back is checked again (M15)', () => {
  it('accepts an article, deck and picture that pass the tick\'s checks', () => {
    const read = readSubmission(body());
    expect(Array.isArray(read)).toBe(false);
    const s = read as Submission;
    expect(s.draft.title).toBe('Why rest makes you stronger');
    expect(s.deck.cast).toBe('jonah');
    expect(s.picture?.length).toBe(30);
  });

  it('accepts a story without a picture', () => {
    expect((readSubmission(body({ picture: null })) as Submission).picture).toBeNull();
  });

  it('refuses what the tick would refuse, naming every reason', () => {
    const problems = readSubmission(body({
      article: articleJson({ reflection_question: 'No question mark here' }),
      deck: storyDeckJson({ story: ['Too short.'] }),
    }));
    expect(problems).toEqual(expect.arrayContaining([
      'the reflection question must be 10–200 characters and end with "?"',
      'deck: a story has 4–6 cards',
    ]));
  });

  it('refuses copied wording, judged against the pages the PC read', () => {
    const copied = 'Most people find a typical night has four to six cycles of about ninety minutes';
    const article = articleJson();
    (article.sections as { paragraphs: string[] }[])[0]!.paragraphs[0] += ` ${copied}.`;
    expect(readSubmission(body({ article }))).toEqual(expect.arrayContaining([expect.stringMatching(/^repeats 8 or more words of a source/)]));
  });

  it('refuses research that is too thin', () => {
    const thin = { ...BRIEF, facts: BRIEF.facts.slice(0, 3) };
    expect(readSubmission(body({ brief: thin }))).toEqual(expect.arrayContaining(['the research has 3 cited facts; it needs 6']));
  });

  it('refuses a brief whose shape is wrong: a fact citing no page it lists, a repeated page, a non-web address', () => {
    expect(parseStudioBrief({ ...BRIEF, facts: [{ id: 1, text: 'A fact.', sources: [9] }] })).toBeNull();
    expect(parseStudioBrief({ ...BRIEF, sources: [...BRIEF.sources, { id: 4, url: 'https://a.org/sleep', title: 'Again' }] })).toBeNull();
    expect(parseStudioBrief({ ...BRIEF, sources: [{ id: 1, url: 'file:///C:/notes.txt', title: 'Notes' }] })).toBeNull();
    expect(parseStudioBrief({ ...BRIEF, excerpts: Array.from({ length: 201 }, () => 'x') })).toBeNull();
    expect(parseStudioBrief(BRIEF)).toEqual(BRIEF);
  });

  it('takes only a 960x540 webp as the picture', () => {
    expect(readPicture(base64(webpHeader(1344, 768)))).toBe('the picture is 1344x768; it must be 960x540');
    expect(readPicture(base64(new TextEncoder().encode('GIF89a and some more bytes to fill thirty')))).toBe('the picture is not a webp');
    expect(readPicture('not base64!')).toMatch(/must be base64/);
    expect(readPicture('A'.repeat(400_004))).toMatch(/must be base64/);
  });

  it('reads the size from each kind of webp', () => {
    const vp8 = webpHeader(1, 1);
    vp8.set([...'VP8 '].map((c) => c.charCodeAt(0)), 12);
    vp8.set([0x9d, 0x01, 0x2a, 960 & 0xff, 960 >> 8, 540 & 0xff, 540 >> 8], 23);
    expect(webpSize(vp8)).toEqual({ width: 960, height: 540 });
    const vp8l = webpHeader(1, 1);
    vp8l.set([...'VP8L'].map((c) => c.charCodeAt(0)), 12);
    const bits = (960 - 1) | ((540 - 1) << 14);
    vp8l.set([0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >>> 24) & 0xff], 20);
    expect(webpSize(vp8l)).toEqual({ width: 960, height: 540 });
  });
});

describe('a checked article is stored with its story and picture (M15)', () => {
  const uploads: string[] = [];
  const art = { async upload(path: string) { uploads.push(path); } };

  it('checks only, with dry: nothing is uploaded or stored', async () => {
    const store = new FakeStudio();
    await claim(store);
    uploads.length = 0;
    expect(await submit(store, art, readSubmission(body()) as Submission, true)).toEqual({ checked: 'article-57', picture: 'story-clay/article-57.webp', scenes: null, words: 909 });
    expect(uploads).toEqual([]);
    expect(store.stored).toEqual([]);
    expect(store.job(57).status).toBe('studio');
  });

  it('uploads the picture at the server\'s path, then stores the article with the deck naming it', async () => {
    const store = new FakeStudio();
    await claim(store);
    uploads.length = 0;
    expect(await submit(store, art, readSubmission(body()) as Submission, false)).toEqual({ stored: 'article-57', picture: 'story-clay/article-57.webp', scenes: null, words: 909 });
    expect(uploads).toEqual([studioPicturePath(57)]);
    const [stored] = store.stored;
    expect(stored!.deck.picture).toBe('story-clay/article-57.webp');
    expect(stored!.article).toMatchObject({ words: 909, readingMinutes: 6 });
    expect(stored!.sources.map((s) => s.idx)).toEqual([1, 2, 3]);
    expect(stored!.brief).toEqual(BRIEF);
    expect(stored!.deck.scenes).toBeUndefined();
    expect(stored!.deck.grumble).toBeUndefined();
  });

  it("uploads each story card's picture at its own path, and the deck names them and the story's Grumble", async () => {
    const store = new FakeStudio();
    await claim(store);
    uploads.length = 0;
    const scenes = CARDS.map((_, i) => (i === 1 ? null : base64(webpHeader(960, 540))));
    const paths = CARDS.map((_, i) => (i === 1 ? null : storyScenePath('article-57', i + 1)));
    expect(await submit(store, art, readSubmission(body({ scenes, grumble: 'snoozle' })) as Submission, false))
      .toEqual({ stored: 'article-57', picture: 'story-clay/article-57.webp', scenes: paths, words: 909 });
    expect(uploads).toEqual([studioPicturePath(57), ...paths.filter((p) => p !== null)]);
    expect(store.stored[0]!.deck).toMatchObject({ picture: 'story-clay/article-57.webp', scenes: paths, grumble: 'snoozle' });
  });

  it('names no scenes when no card got a picture', async () => {
    const store = new FakeStudio();
    await claim(store);
    uploads.length = 0;
    await submit(store, art, readSubmission(body({ scenes: CARDS.map(() => null) })) as Submission, false);
    expect(uploads).toEqual([studioPicturePath(57)]);
    expect(store.stored[0]!.deck.scenes).toBeUndefined();
  });

  it('stores a story without a picture as it is', async () => {
    const store = new FakeStudio();
    await claim(store);
    uploads.length = 0;
    await submit(store, art, readSubmission(body({ picture: null })) as Submission, false);
    expect(uploads).toEqual([]);
    expect(store.stored[0]!.deck.picture).toBeUndefined();
  });

  it('refuses a job that isn\'t waiting in the studio', async () => {
    const store = new FakeStudio();
    await claim(store);
    store.job(57).status = 'done';
    expect(await submit(store, art, readSubmission(body()) as Submission, false)).toEqual({ conflict: 'not_the_studios' });
  });
});

describe("the story cards' pictures and the story's Grumble (a picture on every story card)", () => {
  const picture = base64(webpHeader(960, 540));

  it('takes one picture or null per story card, each like the picture', () => {
    expect(readScenes([picture, null], 2)).toEqual([webpHeader(960, 540), null]);
    expect(readScenes([picture], 2)).toBe('the scenes must be 2, one per story card');
    expect(readScenes([], 0)).toBe('the scenes must be 0, one per story card');
    expect(readScenes('nope', 2)).toBe('the scenes must be 2, one per story card');
    expect(readScenes([picture, base64(webpHeader(1344, 768))], 2)).toBe('story card 2: the picture is 1344x768; it must be 960x540');
  });

  it("takes one of the app's Grumbles, or none", () => {
    expect(readGrumble(undefined)).toEqual({ grumble: null });
    expect(readGrumble(null)).toEqual({ grumble: null });
    expect(readGrumble('snoozle')).toEqual({ grumble: 'snoozle' });
    expect(readGrumble('Snoozle!')).toEqual({ problem: "the grumble is not one of the app's" });
    expect(readGrumble(3)).toEqual({ problem: "the grumble is not one of the app's" });
  });

  it("lets a new story go out without its cards' pictures or Grumble when they aren't right, never without the article", () => {
    const wrongCount = readSubmission(body({ scenes: [picture], grumble: 'gremlin' })) as Submission;
    expect(wrongCount).toMatchObject({ jobId: 57, scenes: null, grumble: null });
    const badCard = readSubmission(body({ scenes: CARDS.map((_, i) => (i === 0 ? base64(webpHeader(1344, 768)) : picture)) })) as Submission;
    expect(badCard.scenes).toBeNull();
    expect(badCard.picture).toEqual(webpHeader(960, 540));
  });

  it("goes to the clay folder at each card's own path", () => {
    expect(storyScenePath('article-22', 3)).toBe('story-clay/article-22-3.webp');
  });

  it("uploads a stored story's card pictures first, then names them and its Grumble on the deck", async () => {
    const store = new FakeStudio();
    const uploads: string[] = [];
    const art = { async upload(path: string) { uploads.push(path); } };
    store.decks.set('article-22', { picture: 'story-clay/article-22.webp', cards: 3 });
    const scenes = [webpHeader(960, 540), null, webpHeader(960, 540)];
    const paths = ['story-clay/article-22-1.webp', null, 'story-clay/article-22-3.webp'];
    expect(await rescene(store, art, 'article-22', scenes, 'snoozle')).toEqual({ scenes: paths, grumble: 'snoozle' });
    expect(uploads).toEqual(['story-clay/article-22-1.webp', 'story-clay/article-22-3.webp']);
    expect(store.decks.get('article-22')).toMatchObject({ scenes: paths, grumble: 'snoozle' });
  });

  it("gives a story of another number of cards none, and refuses an id that isn't an article's, uploading nothing", async () => {
    const store = new FakeStudio();
    const uploads: string[] = [];
    const art = { async upload(path: string) { uploads.push(path); } };
    const painted = ['story-clay/article-22-1.webp', null, null, null, null];
    store.decks.set('article-22', { cards: 5, scenes: painted });
    expect(await rescene(store, art, 'article-22', [webpHeader(960, 540), webpHeader(960, 540)], null)).toEqual({ missing: true });
    expect(await rescene(store, art, '../tick', [webpHeader(960, 540)], null)).toEqual({ missing: true });
    expect(uploads).toEqual([]); // the card pictures already out there are never replaced by a mismatched set
    expect(store.decks.get('article-22')!.scenes).toEqual(painted);
  });

  it('stops naming the cards\' pictures while they are replaced', async () => {
    const store = new FakeStudio();
    store.decks.set('article-22', { cards: 2, scenes: ['story-clay/article-22-1.webp', null] });
    const named: (readonly (string | null)[] | undefined)[] = [];
    const art = { async upload() { named.push(store.decks.get('article-22')!.scenes); } };
    await rescene(store, art, 'article-22', [webpHeader(960, 540), webpHeader(960, 540)], 'snoozle');
    expect(named).toEqual([[null, null], [null, null]]);
    expect(store.decks.get('article-22')!.scenes).toEqual(['story-clay/article-22-1.webp', 'story-clay/article-22-2.webp']);
  });
});

describe('a stored story gets its clay picture (Monster Buddy)', () => {
  const uploads: string[] = [];
  const art = { async upload(path: string) { uploads.push(path); } };
  const picture = webpHeader(960, 540);

  it("goes to the clay folder at the article's own path, new studio pictures too", () => {
    expect(storyPicturePath('article-22')).toBe('story-clay/article-22.webp');
    expect(studioPicturePath(145)).toBe('story-clay/article-145.webp');
  });

  it('uploads the picture first, then names it on the deck', async () => {
    const store = new FakeStudio();
    store.decks.set('article-22', { picture: 'story-v1/article-22.webp' });
    uploads.length = 0;
    expect(await repicture(store, art, 'article-22', picture)).toEqual({ picture: 'story-clay/article-22.webp' });
    expect(uploads).toEqual(['story-clay/article-22.webp']);
    expect(store.decks.get('article-22')!.picture).toBe('story-clay/article-22.webp');
  });

  it("gives an article without a story none, and refuses an id that isn't an article's without uploading", async () => {
    const store = new FakeStudio();
    uploads.length = 0;
    expect(await repicture(store, art, 'article-140', picture)).toEqual({ missing: true });
    expect(await repicture(store, art, '../tick', picture)).toEqual({ missing: true });
    expect(uploads).toEqual(['story-clay/article-140.webp']);
  });
});
