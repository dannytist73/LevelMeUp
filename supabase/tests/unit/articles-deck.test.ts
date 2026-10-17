import { describe, expect, it } from 'vitest';
import { parseArticle } from '../../functions/_shared/articles/check.ts';
import type { ArticleDraft } from '../../functions/_shared/articles/check.ts';
import { DECK_SCHEMA, checkDeck, deckParams, numbersIn, parseDeck } from '../../functions/_shared/articles/deck.ts';
import { BRIEF, articleJson, paragraph } from './articles-fixtures.ts';

/** The fixture article, with one paragraph that carries numbers a deck may repeat. */
const ARTICLE: ArticleDraft = (() => {
  const a = parseArticle(articleJson())!;
  a.sections[0]!.paragraphs[0] = `A typical night has four to six cycles of about 90 minutes, and 1,200 people took part. ${paragraph(0, 60)}`;
  return a;
})();

/** The model's JSON for a deck that passes every check. */
function deckJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    story: [
      { kicker: 'The story', text: 'You finish a hard week of training and feel worse, not better. The work was real, so where did the progress go?' },
      { kicker: 'What is really happening', text: 'A typical night of sleep runs in cycles of about 90 minutes, and the body does much of its repair while you rest.' },
      { kicker: 'Why it matters', text: 'Training asks the body to change, and rest is when the change is made. Skipping rest skips the building part of the work.' },
    ],
    system_note: 'System: Rest days count. They are part of training.',
    lesson: 'Rest is when training turns into strength.',
    try_today: 'Pick one rest day this week and write it in your plan.',
    ...overrides,
  };
}

describe('the Story Deck (M11)', () => {
  it('parses the writer\'s JSON, tidying spaces and dropping the "System:" prefix', () => {
    const deck = parseDeck(deckJson({ lesson: '  Rest is when\ntraining turns into strength. ' }))!;
    expect(deck.story).toHaveLength(3);
    expect(deck.systemNote).toBe('Rest days count. They are part of training.');
    expect(deck.lesson).toBe('Rest is when training turns into strength.');
    expect(deck.tryToday).toBe('Pick one rest day this week and write it in your plan.');
    expect(parseDeck(deckJson({ system_note: null }))!.systemNote).toBeNull();
  });

  it('refuses a wrong shape', () => {
    expect(parseDeck(null)).toBeNull();
    expect(parseDeck(deckJson({ story: 'cards' }))).toBeNull();
    expect(parseDeck(deckJson({ story: [{ kicker: 'x' }] }))).toBeNull();
    expect(parseDeck(deckJson({ system_note: 3 }))).toBeNull();
    expect(parseDeck(deckJson({ try_today: undefined }))).toBeNull();
  });

  it('passes a good deck', () => {
    expect(checkDeck(parseDeck(deckJson())!, ARTICLE, BRIEF.excerpts)).toEqual([]);
  });

  it('holds the card count and the lengths', () => {
    const two = parseDeck(deckJson({ story: (deckJson().story as unknown[]).slice(0, 2) }))!;
    expect(checkDeck(two, ARTICLE, [])).toContain('a deck has 3–5 story cards');
    const short = parseDeck(deckJson({ lesson: 'Rest.', try_today: 'Sleep.' }))!;
    const problems = checkDeck(short, ARTICLE, []);
    expect(problems).toContain('the lesson must be 15–140 characters');
    expect(problems).toContain('"Try today" must be 20–200 characters');
    const long = parseDeck(deckJson({ story: [...(deckJson().story as { kicker: string; text: string }[]), { kicker: 'More', text: 'word '.repeat(100) }] }))!;
    expect(checkDeck(long, ARTICLE, []).some((p) => p.startsWith('card '))).toBe(true);
  });

  it('refuses a number the article doesn\'t print, and accepts one written with or without a thousands comma', () => {
    const invented = parseDeck(deckJson({ lesson: 'Rest for 66 days and you will be strong.' }))!;
    expect(checkDeck(invented, ARTICLE, [])).toContain('the number 66 is not in the article');
    const known = parseDeck(deckJson({ try_today: 'Read how 1200 people slept, then plan your own rest day.' }))!;
    expect(checkDeck(known, ARTICLE, [])).toEqual([]);
    expect(numbersIn('1,200 people, 2.5 hours, 90 min')).toEqual(['1200', '2.5', '90']);
  });

  it('reads numbers written as words, so "sixty-six" and "66" are the same number (M11 review)', () => {
    expect(numbersIn('sixty-six days, three hundred and fifty people, twenty one, ten thousand steps, twelve hundred'))
      .toEqual(['66', '350', '21', '10000', '1200']);
    expect(numbersIn('five six-minute walks; three, four')).toEqual(['5', '6', '3', '4']);
    expect(numbersIn('one small step, the two of them, and none of that')).toEqual([]);
    const words = parseDeck(deckJson({ lesson: 'People are seven times as likely to keep a habit.' }))!;
    expect(checkDeck(words, ARTICLE, [])).toContain('the number 7 is not in the article');
    const same = parseDeck(deckJson({ try_today: 'Sleep in cycles of ninety minutes, and count four to six of them tonight.' }))!;
    expect(checkDeck(same, ARTICLE, [])).toEqual([]);
  });

  it('refuses a System note that announces something in the game (M11 deploy: "Daily quest added")', () => {
    for (const note of ['Daily quest added. Protect the last cycle.', 'Quest active: phone out of reach.', 'Bonus XP for rest days.']) {
      expect(checkDeck(parseDeck(deckJson({ system_note: note }))!, ARTICLE, [])).toContain('the System note announces something in the game, which only the app does');
    }
    expect(checkDeck(parseDeck(deckJson({ system_note: 'Protect the last cycle. Rest days count.' }))!, ARTICLE, [])).toEqual([]);
  });

  it('refuses quotations, links and copied words', () => {
    const quoted = parseDeck(deckJson({ lesson: 'As the coach said, "rest is part of the work" every day.' }))!;
    expect(checkDeck(quoted, ARTICLE, []).some((p) => p.startsWith('no quotations'))).toBe(true);
    const linked = parseDeck(deckJson({ try_today: 'Read more at sleep.org before you plan your rest.' }))!;
    expect(checkDeck(linked, ARTICLE, []).some((p) => p.startsWith('no links'))).toBe(true);
    const copied = parseDeck(deckJson({ lesson: 'A typical night has four to six cycles of about ninety minutes.' }))!;
    expect(checkDeck(copied, ARTICLE, BRIEF.excerpts).some((p) => p.startsWith('repeats 8 or more words'))).toBe(true);
  });

  it('asks for structured output from the stored article, with no source ids', () => {
    const params = deckParams(ARTICLE) as { model: string; output_config: { format: { schema: unknown } }; messages: { content: string }[] };
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.output_config.format.schema).toBe(DECK_SCHEMA);
    expect(params.messages[0]!.content).toContain(ARTICLE.title);
    expect(params.messages[0]!.content).not.toContain('source_ids');
  });
});
