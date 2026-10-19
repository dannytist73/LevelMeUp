// M15, the daily studio's prompts and its research check (plan 2026-10-20-m15-daily-studio.md). The article and the
// story use the tick's own prompts and schemas (supabase/functions/_shared), so a studio article reads like a tick's;
// only the research differs: Claude Code reads pages itself, so each fact carries passages quoted from its pages, and
// code keeps a fact only when its passage is found word for word on the page (the API's citations do this for the
// tick). The verified passages, with their paragraphs, become the excerpts the copying check uses.
import { CAST, CLUSTER_NAMES } from '../../packages/content/src/index.ts';
import type { ArticleCluster, CastId } from '../../packages/content/src/index.ts';
import { BRIEF_LIMITS, pageUrl } from '../../supabase/functions/_shared/articles/brief.ts';
import type { Brief } from '../../supabase/functions/_shared/articles/brief.ts';
import type { StoryDeck } from '../../supabase/functions/_shared/articles/deck.ts';
import { RESEARCH_SYSTEM } from '../../supabase/functions/_shared/prompts/articles.ts';
import { clip, shingles, wordCount } from '../../supabase/functions/_shared/articles/text.ts';
import { pageWords, quoteOnPage } from './page.ts';

/** Searches the researcher may make (the tick's is 5; reading the pages itself, the studio can afford a few more). */
export const STUDIO_SEARCHES = 8;
export const QUOTE_WORDS = { min: 12, max: 80 } as const;
export const EXCERPT_CHARS = 1500;
export const MAX_EXCERPTS = 200;

const text = (description: string) => ({ type: 'string', description }) as const;

export const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    sources: {
      type: 'array',
      description: 'Every page a fact quotes, once each.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: '1, 2, 3, … in order.' },
          url: text('The URL exactly as read-page.ts printed it.'),
          title: text('The page title.'),
        },
        required: ['id', 'url', 'title'],
        additionalProperties: false,
      },
    },
    facts: {
      type: 'array',
      description: '8 to 14 key facts.',
      items: {
        type: 'object',
        properties: {
          text: text('The fact in your own words: one short paragraph, under 500 characters.'),
          quotes: {
            type: 'array',
            description: 'One or two passages that back the fact.',
            items: {
              type: 'object',
              properties: {
                source: { type: 'integer', description: 'The id of the page the passage is on.' },
                text: text('12 to 60 words copied exactly, character for character, from the text read-page.ts printed for that page.'),
              },
              required: ['source', 'text'],
              additionalProperties: false,
            },
          },
        },
        required: ['text', 'quotes'],
        additionalProperties: false,
      },
    },
  },
  required: ['sources', 'facts'],
  additionalProperties: false,
} as const;

/** The tick's research brief, told how the studio reads pages and backs each fact. */
export const STUDIO_RESEARCH_SYSTEM = `${RESEARCH_SYSTEM.replace(/\(at most \d+ searches\)/, `(at most ${STUDIO_SEARCHES} searches, with WebSearch)`)}

How you work here:
- Read every page you use with the command: node read-page.ts "<url>" [part]. It prints the page's text in parts of 20,000 characters; read further parts when you need them. It can't read PDFs or pages that need a login: cite the page that presents the study instead (its abstract page, a journal, university or health body page). You can run no other command.
- Back each fact with one or two quotes: passages of ${QUOTE_WORDS.min} to 60 words copied exactly, character for character, from the text read-page.ts printed for that page. Code checks every quote against the page, and a fact whose quotes aren't found there word for word is dropped, so never shorten, join or retype a quote.
- The fact itself stays in your own words, as above.`;

export function researchPrompt(job: { topic: string; cluster: ArticleCluster }): string {
  return `Topic: ${job.topic}\nArea: ${CLUSTER_NAMES[job.cluster]}`;
}

export type Research = { sources: { id: number; url: string; title: string }[]; facts: { text: string; quotes: { source: number; text: string }[] }[] };
export type PageRead = { text: string } | { error: string };

/** The URLs a research answer cites, so the runner can read each page once. */
export function researchUrls(r: Research): string[] {
  return [...new Set(r.sources.map((s) => s.url))];
}

/**
 * The brief, built by code from the research and the pages as code read them: a fact stays only with a quote found
 * word for word on its page, a page only when a kept fact quotes it, and ids are numbered again from 1. Each verified
 * quote and the page's paragraphs around it become excerpts, so the copying check knows the sources' own wording.
 */
export function verifyResearch(r: Research, pages: ReadonlyMap<string, PageRead>): { brief: Brief; dropped: string[] } {
  const dropped: string[] = [];
  const byId = new Map(r.sources.map((s) => [s.id, s]));
  const words = new Map<string, string>();
  for (const [url, page] of pages) if ('text' in page) words.set(url, pageWords(page.text));
  const ids = new Map<number, number>();
  const sources: Brief['sources'] = [];
  const facts: Brief['facts'] = [];
  const excerpts: string[] = [];
  for (const [i, fact] of r.facts.entries()) {
    const backed: number[] = [];
    for (const q of fact.quotes) {
      const source = byId.get(q.source);
      const page = source === undefined ? undefined : pages.get(source.url);
      const n = wordCount(q.text);
      if (source === undefined) dropped.push(`fact ${i + 1}: quotes a source it doesn't list (${q.source})`);
      else if (page === undefined || 'error' in page) dropped.push(`fact ${i + 1}: ${source.url} can't be read${page && 'error' in page ? ` (${page.error})` : ''}`);
      else if (n < QUOTE_WORDS.min || n > QUOTE_WORDS.max) dropped.push(`fact ${i + 1}: a quote of ${n} words`);
      else if (!quoteOnPage(q.text, words.get(source.url)!)) dropped.push(`fact ${i + 1}: a quote isn't on ${source.url}`);
      else {
        backed.push(source.id);
        excerpts.push(clip(q.text.trim(), EXCERPT_CHARS), ...around(q.text, page.text));
      }
    }
    if (backed.length === 0 || facts.length >= BRIEF_LIMITS.maxFacts) continue;
    const cited = new Set<number>();
    for (const id of backed) {
      if (!ids.has(id)) {
        const s = byId.get(id)!;
        const url = pageUrl(s.url);
        if (url === null || sources.length >= BRIEF_LIMITS.maxSources || sources.some((x) => x.url === url)) continue;
        ids.set(id, sources.length + 1);
        const title = clip(s.title.replace(/\s+/g, ' ').trim(), 300);
        sources.push({ id: sources.length + 1, url, title: title !== '' ? title : new URL(url).hostname });
      }
      cited.add(ids.get(id)!);
    }
    if (cited.size > 0) facts.push({ id: facts.length + 1, text: clip(fact.text.replace(/\s+/g, ' ').trim(), BRIEF_LIMITS.factChars), sources: [...cited] });
  }
  return { brief: { sources, facts, excerpts: [...new Set(excerpts)].slice(0, MAX_EXCERPTS) }, dropped };
}

/** The page's paragraphs that share a run of 8 words with a quote: the source's wording around it. */
function around(quote: string, text: string): string[] {
  const runs = new Set(shingles(quote, 8));
  return text.split('\n').filter((line) => shingles(line, 8).some((run) => runs.has(run))).map((line) => clip(line, EXCERPT_CHARS));
}

export const SCENE_SCHEMA = {
  type: 'object',
  properties: { scene: text('One sentence of 25 to 50 words: the place, what they are doing with their hands, the objects that tell the story, the light, and what they wear.') },
  required: ['scene'],
  additionalProperties: false,
} as const;

/** The scenes of the M14 set (scripts/art/story-art.py), as examples of the length and kind wanted. */
const SCENE_EXAMPLES = [
  'standing in a small kitchen in early morning light, writing on a sticky note stuck by the kettle, a baby monitor on the counter, wearing a grey hoodie',
  'sitting on a gym bench between sets of squats, breathing slowly, a phone propped on the squat rack beside a loaded barbell, a water bottle in his hand, wearing a running t-shirt',
];

export const SCENE_SYSTEM = `You set up the one picture of a LevelMeUp story lesson: the story's regular in its turning moment (the card where they try the idea), drawn later as a manhwa illustration by an image model that already knows their face, hair and build.
Write only the scene, in the style of these examples:
${SCENE_EXAMPLES.map((e) => `- ${e}`).join('\n')}
Rules: the regular is the only person in focus (others only far in the background); never describe their face, hair, age or build; nothing with readable text, numbers, logos or screens showing words; nothing unsafe, sad or graphic; everyday objects from the story.`;

export function scenePrompt(deck: StoryDeck): string {
  const who = CAST.find((c) => c.id === deck.cast)!;
  return JSON.stringify({ regular: `${who.name}, ${who.line}`, title: deck.title, story: deck.story });
}

export const PICK_SCHEMA = {
  type: 'object',
  properties: {
    pick: { type: 'integer', description: 'The number of the best usable picture, or 0 when none is usable.' },
    why: text('One line.'),
  },
  required: ['pick', 'why'],
  additionalProperties: false,
} as const;

export function pickSystem(name: CastId, look: string, scene: string, files: readonly string[]): string {
  const who = CAST.find((c) => c.id === name)!;
  return `You choose the story picture for a LevelMeUp lesson from ${files.length} renders in the working folder: ${files.map((f, i) => `${i + 1} is ${f}`).join(', ')}. Read every one with the Read tool.
A usable picture shows exactly one main person, ${who.name}: ${look}. The face is clearly visible and not distorted, the hands and objects are not mangled, there is no text, letter or number anywhere, and it shows this scene: ${scene}.
Answer with the number of the best usable one, or 0 when none is usable.`;
}
