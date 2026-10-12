import { describe, expect, it } from 'vitest';
import { articleWords, checkArticle, parseArticle, readingMinutes } from '../../functions/_shared/articles/check.ts';
import type { ArticleDraft } from '../../functions/_shared/articles/check.ts';
import { BRIEF, articleJson, paragraph } from './articles-fixtures.ts';

const draft = (overrides: Record<string, unknown> = {}): ArticleDraft => parseArticle(articleJson(overrides))!;
const withParagraph = (text: string): ArticleDraft => {
  const a = draft();
  a.sections[0]!.paragraphs[0] = text;
  return a;
};

describe('parseArticle', () => {
  it('reads the model JSON into camelCase and trims it', () => {
    const a = draft({ title: '  Why rest makes you stronger ' });
    expect(a.title).toBe('Why rest makes you stronger');
    expect(a.sections[2]!.systemNote).toBe('System: Rest days count. They are part of training.');
    expect(a.sections[0]!.sourceIds).toEqual([1]);
    expect(a.reflectionQuestion).toBe('Which day this week will you rest on purpose?');
  });

  it('turns an empty System note into none', () => {
    const json = articleJson();
    (json.sections as { system_note: string | null }[])[0]!.system_note = '  ';
    expect(parseArticle(json)!.sections[0]!.systemNote).toBeNull();
  });

  it('refuses the wrong shape', () => {
    expect(parseArticle(null)).toBeNull();
    expect(parseArticle(articleJson({ title: 3 }))).toBeNull();
    expect(parseArticle(articleJson({ takeaways: [1] }))).toBeNull();
    expect(parseArticle(articleJson({ sections: [{ heading: 'x', paragraphs: ['y'], system_note: null, source_ids: ['1'] }] }))).toBeNull();
  });
});

describe('words and reading time (M8a decision 3)', () => {
  it('counts the body: paragraphs and System notes', () => {
    expect(articleWords(draft())).toBe(900 + 9);
  });

  it('reads at 180 words a minute: 800 words are 5 minutes, 1,200 are 7', () => {
    expect(readingMinutes(800)).toBe(5);
    expect(readingMinutes(1200)).toBe(7);
    expect(readingMinutes(10)).toBe(1);
  });
});

describe('checkArticle (spec §4.1 step 3)', () => {
  it('passes a good article', () => {
    expect(checkArticle(draft(), BRIEF)).toEqual([]);
  });

  it('needs 800–1,200 words', () => {
    const short = draft();
    short.sections.forEach((s) => s.paragraphs.splice(1));
    expect(checkArticle(short, BRIEF)).toContain('the body has 459 words; it must have 800–1200');
  });

  it('needs 4–7 sections, 2–4 takeaways and a question', () => {
    expect(checkArticle(draft({ sections: (articleJson().sections as unknown[]).slice(0, 3) }), BRIEF)).toContain('an article has 4–7 sections');
    expect(checkArticle(draft({ takeaways: ['Only one takeaway here.'] }), BRIEF)).toContain('2–4 takeaways of 10–200 characters');
    expect(checkArticle(draft({ reflection_question: 'Rest on purpose this week.' }), BRIEF)).toContain(
      'the reflection question must be 10–200 characters and end with "?"');
  });

  it('cites only the brief, at least 2 sources, in at least half the sections', () => {
    const unknown = draft();
    unknown.sections[0]!.sourceIds = [9];
    expect(checkArticle(unknown, BRIEF)).toContain('source 9 is not in the brief');
    const one = draft();
    one.sections.forEach((s) => (s.sourceIds = s.sourceIds.length > 0 ? [1] : []));
    expect(checkArticle(one, BRIEF)).toContain('an article cites at least 2 sources');
    const few = draft();
    few.sections[2]!.sourceIds = [];
    expect(checkArticle(few, BRIEF)).toContain('at least half the sections cite a source');
  });

  it('refuses a quotation of 4 words or more, in any quotes', () => {
    expect(checkArticle(withParagraph(`${paragraph(0, 80)} As one coach put it, "rest is where you grow".`), BRIEF)).toContain(
      'no quotations: "rest is where you grow"');
    expect(checkArticle(withParagraph(`${paragraph(0, 80)} He called it “the slow way to get strong”.`), BRIEF)).toContain(
      'no quotations: "the slow way to get strong"');
    expect(checkArticle(withParagraph(`${paragraph(0, 85)} The word "kaizen" means change.`), BRIEF)).toEqual([]);
  });

  it('refuses 8 words copied from a source', () => {
    expect(checkArticle(withParagraph(`${paragraph(0, 80)} A typical night has four to six cycles of sleep.`), BRIEF)).toContain(
      'repeats 8 or more words of a source');
  });

  it('refuses links, markdown and reference numbers', () => {
    expect(checkArticle(withParagraph(`${paragraph(0, 85)} See https://a.org for more.`), BRIEF).some((p) => p.startsWith('no links'))).toBe(true);
    expect(checkArticle(withParagraph(`${paragraph(0, 85)} This is **important** here.`), BRIEF).some((p) => p.startsWith('no links'))).toBe(true);
    expect(checkArticle(withParagraph(`${paragraph(0, 85)} Studies agree [2].`), BRIEF).some((p) => p.startsWith('no links'))).toBe(true);
  });

  it('runs the article lint on every piece', () => {
    expect(checkArticle(draft({ title: 'Delve into the science of rest' }), BRIEF)).toContain('robotic phrase "delve"');
    expect(checkArticle(draft({ takeaways: ['Only the lazy skip rest days.', 'Sleep is part of training.'] }), BRIEF)).toContain('shaming word "lazy"');
  });
});
