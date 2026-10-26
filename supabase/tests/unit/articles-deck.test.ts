import { describe, expect, it } from 'vitest';
import { CAST_IDS } from '../../../packages/content/src/index.ts';
import { parseArticle } from '../../functions/_shared/articles/check.ts';
import type { ArticleDraft } from '../../functions/_shared/articles/check.ts';
import { DECK_SCHEMA, DECK_SYSTEM, checkDeck, deckParams, isStoryDeck, numbersIn, parseDeck } from '../../functions/_shared/articles/deck.ts';
import type { StoryDeck } from '../../functions/_shared/articles/deck.ts';
import { BRIEF, articleJson, paragraph, storyDeckJson } from './articles-fixtures.ts';

/** The fixture article, with one paragraph that carries numbers a deck may repeat. */
const ARTICLE: ArticleDraft = (() => {
  const a = parseArticle(articleJson())!;
  a.sections[0]!.paragraphs[0] = `A typical night has four to six cycles of about 90 minutes, and 1,200 people took part. ${paragraph(0, 60)}`;
  return a;
})();

const deck = (overrides: Record<string, unknown> = {}): StoryDeck => parseDeck(storyDeckJson(overrides))!;
const story = (): string[] => [...(storyDeckJson().story as string[])];
const withCard = (i: number, card: string): StoryDeck => {
  const cards = story();
  cards[i] = card;
  return deck({ story: cards });
};
const check = (overrides: Record<string, unknown>) => ({ ...(storyDeckJson().check as Record<string, unknown>), ...overrides });

describe('the story lesson (M14)', () => {
  it('parses the writer\'s JSON into a story deck, tidying spaces', () => {
    const d = deck({ lesson: '  Rest is when\ntraining turns into strength. ' });
    expect(d).toMatchObject({ v: 2, title: 'Rest builds you', cast: 'jonah', lesson: 'Rest is when training turns into strength.' });
    expect(d.story).toHaveLength(5);
    expect(d.check).toMatchObject({ answer: 1, options: ['Run twice as far tomorrow', 'Take a rest day, then run again', 'Stop running for good'] });
    expect(d.tryToday).toBe('Pick one rest day this week and write it in your plan.');
    expect(isStoryDeck(d)).toBe(true);
    expect(isStoryDeck({ story: [], systemNote: null, lesson: 'x', tryToday: 'y' })).toBe(false);
  });

  it('refuses a wrong shape', () => {
    expect(parseDeck(null)).toBeNull();
    expect(parseDeck(storyDeckJson({ cast: 'gandalf' }))).toBeNull();
    expect(parseDeck(storyDeckJson({ story: [{ kicker: 'The story', text: 'An M11 card.' }] }))).toBeNull();
    expect(parseDeck(storyDeckJson({ why: 'Rest helps.' }))).toBeNull();
    expect(parseDeck(storyDeckJson({ check: check({ options: 'one, two, three' }) }))).toBeNull();
    expect(parseDeck(storyDeckJson({ check: check({ answer: 1.5 }) }))).toBeNull();
    expect(parseDeck(storyDeckJson({ try_today: undefined }))).toBeNull();
  });

  it('passes a good deck', () => {
    expect(checkDeck(deck(), ARTICLE, BRIEF.excerpts)).toEqual([]);
  });

  it('holds the card count and the lengths', () => {
    expect(checkDeck(deck({ story: story().slice(0, 3) }), ARTICLE, [])).toContain('a story has 4–6 cards');
    expect(checkDeck(deck({ story: [...story(), ...story().slice(0, 2)] }), ARTICLE, [])).toContain('a story has 4–6 cards');
    const short = checkDeck(deck({ lesson: 'Rest.', try_today: 'Sleep.', title: 'R' }), ARTICLE, []);
    expect(short).toContain('the lesson must be 15–140 characters');
    expect(short).toContain('"Try today" must be 20–200 characters');
    expect(short).toContain('the title must be 2–40 characters');
    expect(checkDeck(withCard(1, `Jonah runs. ${'He keeps going up the hill. '.repeat(12)}`), ARTICLE, []).some((p) => p.startsWith('story card '))).toBe(true);
  });

  it('keeps research out of the story: no digits, no studies, and it names its person (decision 2)', () => {
    const digits = checkDeck(withCard(0, 'Jonah runs for 20 minutes every evening. By Saturday his legs feel heavy and the hill looks steep.'), ARTICLE, []);
    expect(digits).toHaveLength(1);
    expect(digits[0]).toMatch(/^story card "Jonah runs for 20 .*" has a number in digits \(the story is fiction\)$/);
    for (const word of ['a study', 'researchers', 'a survey', 'ten percent', 'the participants']) {
      const problems = checkDeck(withCard(1, `He reads about ${word} on the bus home, then decides to push harder on Sunday anyway.`), ARTICLE, []);
      expect(problems.some((p) => p.includes('mentions research')), word).toBe(true);
    }
    expect(checkDeck(deck({ cast: 'priya' }), ARTICLE, [])).toContain('the story never names Priya');
  });

  it('lets the story count in words and speak in dialogue, but not the other cards', () => {
    // Counts in words belong to the scene; the article has no seven, and that's fine in the story.
    expect(checkDeck(withCard(0, 'Jonah runs seven evenings in a row. By Saturday his legs feel heavy, and the hill feels steeper than ever.'), ARTICLE, [])).toEqual([]);
    expect(checkDeck(deck({ lesson: 'Rest seven days and you will be strong.' }), ARTICLE, [])).toContain('the number 7 is not in the article');
    const quoted = deck({ lesson: 'As the coach said, "rest is part of the work" every day.' });
    expect(checkDeck(quoted, ARTICLE, []).some((p) => p.startsWith('no quotations'))).toBe(true);
    expect(checkDeck(deck(), ARTICLE, [])).toEqual([]); // the fixture's story has a line of dialogue
  });

  it('holds the quick check to three different answers, a right one, and a real question', () => {
    expect(checkDeck(deck({ check: check({ options: ['Rest', 'Run more'] }) }), ARTICLE, [])).toContain('the quick check has exactly 3 answers');
    expect(checkDeck(deck({ check: check({ answer: 3 }) }), ARTICLE, [])).toContain('the right answer must be one of the answers');
    expect(checkDeck(deck({ check: check({ options: ['Rest more', 'rest more', 'Run more'] }) }), ARTICLE, [])).toContain('the answers must differ');
    expect(checkDeck(deck({ check: check({ question: 'Jonah feels slower after a hard week.' }) }), ARTICLE, [])).toContain('the question must end with a question mark');
  });

  it('refuses a number the article doesn\'t print, and accepts one written with or without a thousands comma', () => {
    expect(checkDeck(deck({ why: { head: 'Rest is part of the work.', text: 'In one study of 66 runners, the ones who rested more ran further. Rest gives the body time to rebuild.' } }), ARTICLE, []))
      .toContain('the number 66 is not in the article');
    expect(checkDeck(deck({ try_today: 'Read how 1200 people slept, then plan your own rest day.' }), ARTICLE, [])).toEqual([]);
    expect(numbersIn('1,200 people, 2.5 hours, 90 min')).toEqual(['1200', '2.5', '90']);
  });

  it('reads numbers written as words, so "sixty-six" and "66" are the same number (M11 review)', () => {
    expect(numbersIn('sixty-six days, three hundred and fifty people, twenty one, ten thousand steps, twelve hundred'))
      .toEqual(['66', '350', '21', '10000', '1200']);
    expect(numbersIn('five six-minute walks; three, four')).toEqual(['5', '6', '3', '4']);
    expect(numbersIn('one small step, the two of them, and none of that')).toEqual([]);
    expect(checkDeck(deck({ try_today: 'Sleep in cycles of ninety minutes, and count four to six of them tonight.' }), ARTICLE, [])).toEqual([]);
  });

  it('refuses links and copied words anywhere', () => {
    expect(checkDeck(deck({ try_today: 'Read more at sleep.org before you plan your rest.' }), ARTICLE, []).some((p) => p.startsWith('no links'))).toBe(true);
    const copied = withCard(3, 'Jonah reads that a typical night has four to six cycles of about ninety minutes, and goes to bed early.');
    expect(checkDeck(copied, ARTICLE, BRIEF.excerpts).some((p) => p.startsWith('repeats 8 or more words'))).toBe(true);
  });

  it('tells the story in plain words: short sentences, no similes, no jargon, an easy grade (2026-10-26)', () => {
    expect(checkDeck(deck(), ARTICLE, [])).toEqual([]);
    const simile = withCard(0, 'Jonah checks his watch after work. The goal sits on the screen like a wall he cannot climb.');
    expect(checkDeck(simile, ARTICLE, []).some((p) => p.startsWith('say it plainly, without the comparison "like a"'))).toBe(true);
    const jargon = deck({ lesson: 'Raise your count slowly from your baseline.' });
    expect(checkDeck(jargon, ARTICLE, [])).toContain('"baseline" is jargon: say what it means in everyday words');
    const long = withCard(1, 'He decides to push harder and runs again on Sunday evening, and halfway up the long hill near the depot he has to stop.');
    expect(checkDeck(long, ARTICLE, []).some((p) => p.startsWith('a sentence has 24 words (at most 20)'))).toBe(true);
    const dense = deck({ why: { head: 'Rest is part of the work.', text: 'Physiological adaptation to progressive overload predominantly materialises during subsequent recovery intervals. Consequently, insufficient recuperation compromises accumulated performance improvements.' } });
    expect(checkDeck(dense, ARTICLE, []).some((p) => p.startsWith('the why card reads at school grade'))).toBe(true);
    expect(DECK_SYSTEM).toContain('Plain words come first');
  });

  it('asks for structured output from the stored article, with the regulars to choose from', () => {
    const params = deckParams(ARTICLE) as { model: string; output_config: { format: { schema: typeof DECK_SCHEMA } }; messages: { content: string }[] };
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.output_config.format.schema).toBe(DECK_SCHEMA);
    expect(DECK_SCHEMA.properties.cast.enum).toEqual(CAST_IDS);
    for (const name of ['Priya', 'Jonah', 'Mika', 'Tomás', 'Amara', 'Lena']) expect(DECK_SYSTEM).toContain(name);
    expect(params.messages[0]!.content).toContain(ARTICLE.title);
    expect(params.messages[0]!.content).not.toContain('source_ids');
  });
});
