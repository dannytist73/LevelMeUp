// M15, the daily studio (plan 2026-10-20-m15-daily-studio.md): the owner's PC researches and writes one article a day
// with Claude Code, writes its story and renders its picture, then hands them to lmu-articles-studio. Everything it
// sends is untrusted input: the server parses it and runs the pipeline's own checks again (the brief's limits, the
// article's checks, the deck's checks) and checks the picture's bytes, then stores the article through the tick's own
// functions. The PC holds only LMU_STUDIO_SECRET, which can do nothing else. Pure apart from its two ports.
import { CLUSTER_NAMES, GRUMBLES } from '../../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../../packages/content/src/index.ts';
import { isObject } from '../http.ts';
import { BRIEF_LIMITS, checkBrief, pageUrl } from './brief.ts';
import type { Brief } from './brief.ts';
import { articleWords, checkArticle, parseArticle, readingMinutes } from './check.ts';
import type { ArticleDraft } from './check.ts';
import { checkDeck, parseDeck } from './deck.ts';
import type { StoryDeck } from './deck.ts';
import { LEASE_SECONDS } from './pipeline.ts';
import type { Store, StoredArticle, StoredSource } from './pipeline.ts';
import { clip } from './text.ts';
import { chooseTopics } from './topics.ts';

/** A topic the studio couldn't finish in this many runs fails, like a job of the tick's. */
export const STUDIO_ATTEMPTS = 2;
/** Excerpts the copying check keeps from the PC's verified pages, and their length. */
export const STUDIO_EXCERPTS = { max: 200, chars: 2000 } as const;
/** The story's picture: a 960x540 webp, as the M14 set (scripts/art/story-art.py), small enough for a phone. */
export const STUDIO_PICTURE = { width: 960, height: 540, maxBytes: 300_000 } as const;
/** A request: the picture and the story cards' pictures as base64, plus the article, brief and deck. */
export const STUDIO_MAX_BODY = 4_000_000;
/** Where a story's picture goes in the public `lmu-art` bucket. Monster Buddy (docs/2026-10-25-monster-buddy.md): the clay
 * set's folder; the phone shows a deck's picture from there only (the flat `story-v1` set was retired 2026-10-25). */
export const storyPicturePath = (articleId: string): string => `story-clay/${articleId}.webp`;
export const studioPicturePath = (jobId: number): string => storyPicturePath(`article-${jobId}`);
/** A story card's own picture (owner, 2026-10-26: a picture on every story card), cards from 1. */
export const storyScenePath = (articleId: string, card: number): string => `story-clay/${articleId}-${card}.webp`;

export interface StudioStore extends Pick<Store, 'begin' | 'end' | 'topicsUsed' | 'queue' | 'openJobs' | 'move'> {
  /** The checked article, its sources, the brief it was written from and its deck, in one transaction; the article's id. */
  storeStudio(jobId: number, article: StoredArticle, sources: readonly StoredSource[], brief: Brief, deck: StoryDeck): Promise<string>;
  /** Monster Buddy: points a stored story's deck at its picture (migration 0021); false when the article has no deck. */
  setPicture(articleId: string, path: string): Promise<boolean>;
  /** Names a stored story's card pictures and its Grumble on its deck (migration 0022); false when it has no story of that many cards. */
  setScenes(articleId: string, scenes: readonly (string | null)[], grumble: string | null): Promise<boolean>;
}

export interface Art {
  /** Puts the picture at its path in `lmu-art` (replacing an earlier try's). */
  upload(path: string, webp: Uint8Array<ArrayBuffer>): Promise<void>;
}

export type StudioJob = { id: number; cluster: ArticleCluster; area: string; topic: string; attempt: number; articleId: string };
export type ClaimResult = { job: StudioJob } | { none: 'busy' | 'no_topics' };

const asStudioJob = (j: { id: number; cluster: ArticleCluster; topic: string }, attempt: number): StudioJob => ({
  id: j.id, cluster: j.cluster, area: CLUSTER_NAMES[j.cluster], topic: j.topic, attempt, articleId: `article-${j.id}`,
});

/**
 * The job the PC works on today: its own unfinished one (each run is a try, so a run that died is finished by the next),
 * else a new topic, picked like the tick's. Under the tick's lease, so the two never take the same topic. A check-only
 * run (`dry`) takes the job without using a try, so the real run that follows can store what it checked.
 */
export async function claim(store: StudioStore, dry = false): Promise<ClaimResult> {
  if (!(await store.begin(LEASE_SECONDS))) return { none: 'busy' };
  try {
    for (const job of (await store.openJobs()).filter((j) => j.status === 'studio')) {
      if (dry) return { job: asStudioJob(job, job.attempt) };
      if (job.attempt < STUDIO_ATTEMPTS && (await store.move(job.id, 'studio', 'studio', { attempt: job.attempt + 1 }))) {
        return { job: asStudioJob(job, job.attempt + 1) };
      }
      await store.move(job.id, 'studio', 'failed', { error: job.error ?? 'the studio did not finish it' });
    }
    const [pick] = chooseTopics(await store.topicsUsed(), 1);
    if (pick === undefined) return { none: 'no_topics' };
    const [id] = await store.queue([{ ...pick, evergreen: false }]);
    if (id === undefined || !(await store.move(id, 'queued', 'studio', {}))) throw new Error('the new studio job was moved');
    return { job: asStudioJob({ id, ...pick }, 1) };
  } finally {
    await store.end();
  }
}

/** Why the PC's last run of a job stopped, kept on the job; false when the job isn't the studio's. */
export async function recordFailure(store: StudioStore, jobId: number, error: string): Promise<boolean> {
  return store.move(jobId, 'studio', 'studio', { error: clip(error, 1000) });
}

export type Scenes = (Uint8Array<ArrayBuffer> | null)[];
export type Submission = {
  jobId: number; brief: Brief; draft: ArticleDraft; deck: StoryDeck; picture: Uint8Array<ArrayBuffer> | null;
  /** One picture or null per story card, or null when the story has none (owner, 2026-10-26). */
  scenes: Scenes | null;
  grumble: string | null;
};

const ints = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => Number.isInteger(n));

/** The PC's brief: its pages and the facts they back, and the excerpts the PC read on them; null when its shape is wrong. */
export function parseStudioBrief(v: unknown): Brief | null {
  if (!isObject(v) || !Array.isArray(v.sources) || !Array.isArray(v.facts) || !Array.isArray(v.excerpts)) return null;
  if (v.sources.length > BRIEF_LIMITS.maxSources || v.facts.length > BRIEF_LIMITS.maxFacts || v.excerpts.length > STUDIO_EXCERPTS.max) return null;
  const sources: Brief['sources'] = [];
  for (const s of v.sources) {
    if (!isObject(s) || !Number.isInteger(s.id) || typeof s.title !== 'string') return null;
    const url = pageUrl(s.url);
    const title = s.title.replace(/\s+/g, ' ').trim();
    if (url === null || (s.id as number) < 1 || (s.id as number) > 50 || title === '' || title.length > 300) return null;
    if (sources.some((k) => k.id === s.id || k.url === url)) return null;
    sources.push({ id: s.id as number, url, title });
  }
  const known = new Set(sources.map((s) => s.id));
  const facts: Brief['facts'] = [];
  for (const f of v.facts) {
    if (!isObject(f) || !Number.isInteger(f.id) || typeof f.text !== 'string' || !ints(f.sources) || f.sources.length === 0) return null;
    if (f.text.length > BRIEF_LIMITS.factChars || !f.sources.every((id) => known.has(id))) return null;
    facts.push({ id: f.id as number, text: f.text, sources: f.sources });
  }
  if (!v.excerpts.every((e): e is string => typeof e === 'string' && e.length <= STUDIO_EXCERPTS.chars)) return null;
  return { sources, facts, excerpts: v.excerpts as string[] };
}

/** A webp's canvas size from its first chunk (VP8, VP8L or VP8X), or null when the bytes aren't a webp. */
export function webpSize(b: Uint8Array): { width: number; height: number } | null {
  const tag = (at: number) => String.fromCharCode(...b.subarray(at, at + 4));
  if (b.length < 30 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return null;
  const chunk = tag(12);
  if (chunk === 'VP8 ') {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { width: (b[26]! | (b[27]! << 8)) & 0x3fff, height: (b[28]! | (b[29]! << 8)) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    if (b[20] !== 0x2f) return null;
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    return { width: (b[24]! | (b[25]! << 8) | (b[26]! << 16)) + 1, height: (b[27]! | (b[28]! << 8) | (b[29]! << 16)) + 1 };
  }
  return null;
}

/** The picture's bytes from base64, or why it can't be the story's picture. */
export function readPicture(v: unknown): Uint8Array<ArrayBuffer> | string {
  if (typeof v !== 'string' || v.length > Math.ceil(STUDIO_PICTURE.maxBytes / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(v)) {
    return `the picture must be base64, at most ${STUDIO_PICTURE.maxBytes} bytes`;
  }
  const bytes = Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
  const size = webpSize(bytes);
  if (size === null) return 'the picture is not a webp';
  if (size.width !== STUDIO_PICTURE.width || size.height !== STUDIO_PICTURE.height) {
    return `the picture is ${size.width}x${size.height}; it must be ${STUDIO_PICTURE.width}x${STUDIO_PICTURE.height}`;
  }
  return bytes;
}

/** The story cards' pictures, one per card (null for a card without one), each like the picture; or why they can't be. */
export function readScenes(v: unknown, cards: number): Scenes | string {
  if (!Array.isArray(v) || v.length !== cards || cards === 0) return `the scenes must be ${cards}, one per story card`;
  const scenes: Scenes = [];
  for (const [i, s] of v.entries()) {
    const picture = s === null ? null : readPicture(s);
    if (typeof picture === 'string') return `story card ${i + 1}: ${picture}`;
    scenes.push(picture);
  }
  return scenes;
}

/** The story's Grumble: one of the app's, or null for none; or why it can't be. */
export function readGrumble(v: unknown): { grumble: string | null } | { problem: string } {
  if (v === undefined || v === null) return { grumble: null };
  return typeof v === 'string' && GRUMBLES.some((g) => g.id === v) ? { grumble: v } : { problem: 'the grumble is not one of the app\'s' };
}

/**
 * The PC's article as the tick would store it, or every reason it can't be: the brief must pass the tick's research
 * check, the article the tick's article checks against that brief, the deck the deck checks, and the picture (optional:
 * a story can go out without one) must be the published size. The story cards' pictures and the Grumble are niceties
 * of a nicety: any that aren't right are left out, never the day's article. The paths are the server's, never the PC's.
 */
export function readSubmission(body: Record<string, unknown>): Submission | string[] {
  if (!Number.isInteger(body.jobId)) return ['the job id is missing'];
  const brief = parseStudioBrief(body.brief);
  if (brief === null) return ['the brief does not match its schema'];
  const problems = checkBrief(brief);
  const draft = parseArticle(body.article);
  if (draft === null) problems.push('the article does not match its schema');
  else problems.push(...checkArticle(draft, brief));
  const deck = parseDeck(body.deck);
  if (deck === null) problems.push('the deck does not match its schema');
  else if (draft !== null) problems.push(...checkDeck(deck, draft, brief.excerpts).map((p) => `deck: ${p}`));
  const picture = body.picture === undefined || body.picture === null ? null : readPicture(body.picture);
  if (typeof picture === 'string') problems.push(picture);
  if (problems.length > 0 || draft === null || deck === null || typeof picture === 'string') return [...new Set(problems)];
  const scenes = body.scenes === undefined || body.scenes === null ? null : readScenes(body.scenes, deck.story.length);
  const grumble = readGrumble(body.grumble);
  return {
    jobId: body.jobId as number, brief, draft, deck, picture,
    scenes: typeof scenes === 'string' ? null : scenes, grumble: 'problem' in grumble ? null : grumble.grumble,
  };
}

export type SubmitResult =
  | { stored: string; picture: string | null; scenes: (string | null)[] | null; words: number }
  | { checked: string; picture: string | null; scenes: (string | null)[] | null; words: number }
  | { conflict: 'not_the_studios' };

/** Where each card's picture goes, null for a card without one; null when the story has none at all. */
const scenePaths = (articleId: string, scenes: Scenes | null): (string | null)[] | null =>
  scenes === null || scenes.every((s) => s === null) ? null : scenes.map((s, i) => (s === null ? null : storyScenePath(articleId, i + 1)));

async function uploadScenes(art: Art, paths: readonly (string | null)[], scenes: Scenes): Promise<void> {
  for (const [i, path] of paths.entries()) if (path !== null) await art.upload(path, scenes[i]!);
}

/** Stores a checked submission (with `dry`, checks only): the pictures first, so a deck never names a missing one. */
export async function submit(store: StudioStore, art: Art, s: Submission, dry: boolean): Promise<SubmitResult> {
  const job = (await store.openJobs()).find((j) => j.id === s.jobId && j.status === 'studio');
  if (job === undefined) return { conflict: 'not_the_studios' };
  const words = articleWords(s.draft);
  const picture = s.picture === null ? null : studioPicturePath(job.id);
  const scenes = scenePaths(`article-${job.id}`, s.scenes);
  if (dry) return { checked: `article-${job.id}`, picture, scenes, words };
  if (picture !== null) await art.upload(picture, s.picture!);
  if (scenes !== null) await uploadScenes(art, scenes, s.scenes!);
  const cited = new Set(s.draft.sections.flatMap((x) => x.sourceIds));
  const sources = s.brief.sources.filter((x) => cited.has(x.id)).map((x) => ({ idx: x.id, url: x.url, title: x.title }));
  const deck: StoryDeck = {
    ...s.deck, ...(picture === null ? {} : { picture }), ...(scenes === null ? {} : { scenes }), ...(s.grumble === null ? {} : { grumble: s.grumble }),
  };
  const stored = await store.storeStudio(job.id, { ...s.draft, words, readingMinutes: readingMinutes(words) }, sources, s.brief, deck);
  return { stored, picture, scenes, words };
}

export type PictureResult = { picture: string } | { missing: true };

/**
 * Monster Buddy: a stored story's new picture (the clay set, repainted on the owner's PC). Uploaded first, at the article's
 * own path, then named on its deck, so a deck never names a missing picture; an article without a deck gets none.
 */
export async function repicture(store: Pick<StudioStore, 'setPicture'>, art: Art, articleId: string, picture: Uint8Array<ArrayBuffer>): Promise<PictureResult> {
  if (!/^article-\d+$/.test(articleId)) return { missing: true };
  const path = storyPicturePath(articleId);
  await art.upload(path, picture);
  return (await store.setPicture(articleId, path)) ? { picture: path } : { missing: true };
}

export type ScenesResult = { scenes: (string | null)[]; grumble: string | null } | { missing: true };

/**
 * A stored story's card pictures and its Grumble (owner, 2026-10-26: a picture on every story card), painted on the
 * owner's PC. The deck first stops naming its cards' pictures, which also checks it is a story of that many cards (one
 * that isn't, or an article without one, gets nothing, not even an upload); then each is uploaded at its card's own path
 * and named again with the Grumble. So a deck never names a missing picture, nor one being replaced.
 */
export async function rescene(store: Pick<StudioStore, 'setScenes'>, art: Art, articleId: string, scenes: Scenes, grumble: string | null): Promise<ScenesResult> {
  if (!/^article-\d+$/.test(articleId)) return { missing: true };
  if (!(await store.setScenes(articleId, scenes.map(() => null), grumble))) return { missing: true };
  const paths = scenes.map((s, i) => (s === null ? null : storyScenePath(articleId, i + 1)));
  await uploadScenes(art, paths, scenes);
  return (await store.setScenes(articleId, paths, grumble)) ? { scenes: paths, grumble } : { missing: true };
}
