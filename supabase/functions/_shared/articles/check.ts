// The code checks an article must pass before anyone reads it (spec §4.1 step 3, M8a decision 4). Never left to the
// model: shape and lengths, sources that exist in the brief, no quotations, no copied wording, no links or markdown,
// and the article lint.
import { lintArticle } from '../../../../packages/content/src/index.ts';
import { isObject } from '../http.ts';
import type { Brief } from './brief.ts';
import { clip, hasBrokenCharacters, shingles, wordCount } from './text.ts';

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
/** The app shows plain text: a line break inside a paragraph means nothing, so whitespace is one space. */
const tidy = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** The model's JSON as an article, or null when its shape is wrong (types only: the checks judge the content). */
export function parseArticle(value: unknown): ArticleDraft | null {
  if (!isObject(value) || typeof value.title !== 'string' || typeof value.summary !== 'string' || !strings(value.takeaways)
    || typeof value.reflection_question !== 'string' || !Array.isArray(value.sections)) return null;
  const sections: ArticleSection[] = [];
  for (const s of value.sections) {
    if (!isObject(s) || typeof s.heading !== 'string' || !strings(s.paragraphs) || !integers(s.source_ids)) return null;
    if (s.system_note !== null && typeof s.system_note !== 'string') return null;
    const note = typeof s.system_note === 'string' ? tidy(s.system_note) : '';
    sections.push({ heading: tidy(s.heading), paragraphs: s.paragraphs.map(tidy), systemNote: note === '' ? null : note, sourceIds: s.source_ids });
  }
  return {
    title: tidy(value.title),
    summary: tidy(value.summary),
    sections,
    takeaways: value.takeaways.map(tidy),
    reflectionQuestion: tidy(value.reflection_question),
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
/**
 * Double quotes of any kind, curly single quotes, and straight single quotes that aren't apostrophes: one opens after
 * no letter (not a decade, "'90s"), may hold apostrophes ("don't") and closes before no letter.
 */
const QUOTED = /["“”„«»]([^"“”„«»]*)["“”„«»]|‘([^‘’]*)’|(?<![\p{L}\p{N}])'(?!\d+s(?![\p{L}\p{N}]))((?:[^']|'(?=\p{L}))*)'(?![\p{L}\p{N}])/gu;
/** Feet and inches after a number (6'2", a 6" step) are not quotation marks. */
const MEASURE = /(?<=\d)["'′″]/gu;
/** A quotation mark left over once the pairs are gone: an unclosed quotation. */
const OPEN_QUOTE = /["“”„«»‘]/u;
/** Links, markdown, HTML, reference numbers and list markers (M8a review: the first version let several through). */
const MARKUP = /https?:\/\/|www\.|[*_`]|##|^#|\]\(|\[\s*\d[\d,\s–-]*\]|<\/?[a-z]|^[-•]\s/imu;
/** A bare domain or an email address: a name, a dot and an ending of 2 or more letters (not "e.g." or "U.S."). */
const DOMAIN = /(?<![\p{L}\p{N}.-])[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}(?![\p{L}\p{N}])/u;

/**
 * A System note that names these claims something happened in the game ("Daily quest added", "Comeback bonus
 * available"), which it didn't: only the app's own quests do that (M11 deploy). "Detected" and "logged" claim the app
 * sensed or recorded something about the reader ("Reflection detected", "Progress logged. Streak started."), which it
 * can't; a "modifier" claims a game state. Checked on System notes only; an article's paragraphs may still call
 * training a quest.
 */
export const GAME_WORDS = /\b(quests?|missions?|xp|rewards?|achievements?|unlocked|bonus|detect(?:s|ed|ing|ion)?|logged|modifiers?|streaks? (?:started|extended|saved|restored|kept))\b/i;

/** Why an article can't be published, or nothing. */
export function checkArticle(a: ArticleDraft, brief: Brief): string[] {
  const problems: string[] = [];
  if (!between(a.title, 10, 80)) problems.push('the title must be 10–80 characters');
  if (!between(a.summary, 40, 300)) problems.push('the summary must be 40–300 characters');
  if (a.sections.length < 4 || a.sections.length > 7) problems.push('an article has 4–7 sections');
  for (const s of a.sections) {
    if (!between(s.heading, 2, 70)) problems.push(`heading "${clip(s.heading, 40)}" must be 2–70 characters`);
    if (s.paragraphs.length < 1 || s.paragraphs.length > 5 || s.paragraphs.some((p) => !between(p, 20, 1200))) {
      problems.push(`section "${clip(s.heading, 40)}" needs 1–5 paragraphs of 20–1,200 characters`);
    }
    if (s.systemNote !== null && !between(s.systemNote, 10, 300)) problems.push('a System note must be 10–300 characters');
    if (s.systemNote !== null && GAME_WORDS.test(s.systemNote)) problems.push('a System note announces something in the game, which only the app does');
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
  for (const t of texts) problems.push(...textProblems(t));
  problems.push(...copyProblems(texts, brief.excerpts));
  return [...new Set(problems)];
}

/** Why one piece of text a reader sees can't be shown: broken characters, quotations, links or markup, the lint. */
export function textProblems(t: string): string[] {
  const problems: string[] = [];
  if (hasBrokenCharacters(t)) problems.push('control characters or half an emoji');
  const prose = t.replace(MEASURE, '');
  for (const m of prose.matchAll(QUOTED)) {
    const quoted = m[1] ?? m[2] ?? m[3] ?? '';
    if (wordCount(quoted) >= QUOTE_WORDS) problems.push(`no quotations: "${clip(quoted, 40)}"`);
  }
  if (OPEN_QUOTE.test(prose.replace(QUOTED, ''))) problems.push(`an unclosed quotation mark: "${clip(t, 40)}"`);
  if (MARKUP.test(t) || DOMAIN.test(t)) problems.push(`no links, markdown or reference numbers: "${clip(t, 40)}"`);
  problems.push(...lintArticle(t));
  return problems;
}

/** A run of COPY_RUN words shared with a source's excerpt, named so a rewrite knows what to change (M8a spike). */
export function copyProblems(texts: readonly string[], sourceExcerpts: readonly string[]): string[] {
  const excerpts = new Set(sourceExcerpts.flatMap((e) => shingles(e, COPY_RUN)));
  const copied = texts.flatMap((t) => shingles(t, COPY_RUN)).find((run) => excerpts.has(run));
  return copied === undefined ? [] : [`repeats ${COPY_RUN} or more words of a source: "${clip(copied, 80)}"`];
}
