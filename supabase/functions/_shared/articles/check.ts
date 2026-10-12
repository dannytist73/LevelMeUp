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
