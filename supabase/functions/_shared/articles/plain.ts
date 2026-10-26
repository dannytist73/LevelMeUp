// Plain words (the owner, 2026-10-26): a story lesson a high-school student follows the first time, with nothing to
// decode. The prompt asks for it (deck.ts); these checks hold every writer to it, and a refused story is written again
// with the reasons, so each message says what to change.
import { clip } from './text.ts';

export const PLAIN = {
  /** The longest sentence, in words. */
  sentenceWords: 20,
  /** The highest Flesch–Kincaid grade for the story's cards together, and for the why card's text. */
  storyGrade: 6,
  whyGrade: 8,
} as const;

/** Terms from a textbook or a paper: the reader needs them said in everyday words. */
export const JARGON = /\b(baselines?|cohorts?|observational|pooled|meta-analys[ie]s|randomi[sz]ed|placebo|circadian|cognitive|dichotomy|implementation intentions?|efficacy|correlat\w*|statistically|paradigm|optim(?:al|ally|i[sz]e[sd]?)|leverage|framework|REM)\b/i;

/** A simile the reader has to decode. Metaphors can't be caught by code; the prompt asks for none. */
export const FIGURE = /\b(?:like|as if|as though) (?:a|an|the)\b/i;

const WORD = /[A-Za-z][A-Za-z'’-]*/g;

/** A text's sentences: a full stop, question or exclamation mark followed by a space ends one ("4.5" doesn't). */
export function sentences(t: string): string[] {
  return t.trim().split(/(?<=[.!?][’”"]?)\s+/).filter((s) => s !== '');
}

const words = (t: string): string[] => t.match(WORD) ?? [];

/** An English word's syllables, by its vowel groups: close enough for a reading grade. */
export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  return Math.max(1, w.match(/[aeiouy]{1,2}/g)?.length ?? 0);
}

/** The Flesch–Kincaid grade: the school year a reader needs to follow the text. */
export function readingGrade(t: string): number {
  const ws = words(t);
  const n = sentences(t).length;
  if (ws.length === 0 || n === 0) return 0;
  const syl = ws.reduce((sum, w) => sum + syllables(w), 0);
  return 0.39 * (ws.length / n) + 11.8 * (syl / ws.length) - 15.59;
}

/** Why a text isn't plain: a long sentence, a simile or a term of jargon. */
export function plainProblems(t: string): string[] {
  const problems: string[] = [];
  for (const s of sentences(t)) {
    const n = words(s).length;
    if (n > PLAIN.sentenceWords) problems.push(`a sentence has ${n} words (at most ${PLAIN.sentenceWords}), so split it: "${clip(s, 50)}"`);
  }
  const figure = FIGURE.exec(t);
  if (figure !== null) problems.push(`say it plainly, without the comparison "${figure[0]}": "${clip(t, 50)}"`);
  const jargon = JARGON.exec(t);
  if (jargon !== null) problems.push(`"${jargon[0]}" is jargon: say what it means in everyday words`);
  return problems;
}

/** Why a text reads above the grade a high-school student follows easily. */
export function gradeProblem(t: string, max: number, what: string): string[] {
  const g = readingGrade(t);
  return g <= max ? [] : [`${what} reads at school grade ${g.toFixed(1)} (at most ${max}): use shorter sentences and simpler words`];
}
