// M15: the daily studio's PC side: pages as text, and the research check that keeps a fact only when its quote is on
// its page word for word.
import { describe, expect, it } from 'vitest';
import { checkBrief } from '../../functions/_shared/articles/brief.ts';
import { parseStudioBrief } from '../../functions/_shared/articles/studio.ts';
import { RESEARCH_SYSTEM } from '../../functions/_shared/prompts/articles.ts';
import { STUDIO_RESEARCH_SYSTEM, STUDIO_SEARCHES, pickSystem, verifyResearch } from '../../../scripts/studio/lib.ts';
import type { PageRead, Research } from '../../../scripts/studio/lib.ts';
import { decodeEntities, htmlText, pageWords, quoteOnPage } from '../../../scripts/studio/page.ts';

describe('a page as text (M15)', () => {
  it('keeps the readable blocks as lines and drops menus, scripts, styles and tags', () => {
    const html = `<html><head><title>Sleep &amp; memory</title><style>p{}</style></head><body>
      <nav>Home</nav><script>var x = "<p>hidden</p>";</script>
      <h1>Sleep and memory</h1><p>During deep sleep the brain <em>replays</em> the day&rsquo;s learning.</p>
      <p>A study of 40&nbsp;adults found&#8230; better recall.</p><!-- a comment --></body></html>`;
    expect(htmlText(html)).toEqual({
      title: 'Sleep & memory',
      text: 'Sleep and memory\nDuring deep sleep the brain replays the day’s learning.\nA study of 40 adults found… better recall.',
    });
  });

  it('decodes numeric and named entities, and leaves unknown ones', () => {
    expect(decodeEntities('&#x2014; &#39; &mdash; &unknown;')).toBe("— ' — &unknown;");
  });

  it('finds a quote word for word, whatever its case, punctuation or spacing', () => {
    const words = pageWords('During deep sleep, the brain replays\nthe day’s learning; recall improves.');
    expect(quoteOnPage('during deep sleep the brain replays the day\'s learning', words)).toBe(true);
    expect(quoteOnPage('during sleep the brain replays the day\'s learning', words)).toBe(false);
    expect(quoteOnPage('', words)).toBe(false);
  });
});

const PAGE_A = 'Intro line.\nIn a trial of 120 adults, those who slept seven to nine hours remembered more word pairs the next morning than those who slept five hours.\nOther text.';
const PAGE_B = 'Researchers found that a regular wake time steadied the body clock within two weeks for most of the volunteers they followed in the study.';
const QUOTE_A = 'In a trial of 120 adults, those who slept seven to nine hours remembered more word pairs the next morning';
const QUOTE_B = 'a regular wake time steadied the body clock within two weeks for most of the volunteers';

function research(facts: Research['facts']): Research {
  return {
    sources: [
      { id: 1, url: 'https://a.org/sleep', title: 'Sleep and memory' },
      { id: 2, url: 'https://b.org/clock', title: 'The body clock' },
      { id: 3, url: 'https://c.org/blocked', title: 'A blocked page' },
    ],
    facts,
  };
}
const pages = new Map<string, PageRead>([
  ['https://a.org/sleep', { text: PAGE_A }],
  ['https://b.org/clock', { text: PAGE_B }],
  ['https://c.org/blocked', { error: 'HTTP 403' }],
]);

describe('the research check (M15)', () => {
  it('keeps facts whose quotes are on their pages, numbers the pages again and keeps their paragraphs as excerpts', () => {
    const { brief, dropped } = verifyResearch(research([
      { text: 'Sleeping 7–9 hours helped recall in a trial of 120 adults.', quotes: [{ source: 1, text: QUOTE_A }] },
      { text: 'A blocked page can\'t back a fact.', quotes: [{ source: 3, text: QUOTE_B }] },
      { text: 'A regular wake time steadies the body clock.', quotes: [{ source: 2, text: QUOTE_B }, { source: 1, text: 'this sentence is nowhere on the page at all, not even close to it' }] },
    ]), pages);
    expect(brief.sources).toEqual([{ id: 1, url: 'https://a.org/sleep', title: 'Sleep and memory' }, { id: 2, url: 'https://b.org/clock', title: 'The body clock' }]);
    expect(brief.facts).toEqual([
      { id: 1, text: 'Sleeping 7–9 hours helped recall in a trial of 120 adults.', sources: [1] },
      { id: 2, text: 'A regular wake time steadies the body clock.', sources: [2] },
    ]);
    expect(brief.excerpts).toEqual(expect.arrayContaining([QUOTE_A, PAGE_A.split('\n')[1], QUOTE_B, PAGE_B]));
    expect(brief.excerpts).not.toContain('Intro line.');
    expect(dropped).toEqual(['fact 2: https://c.org/blocked can\'t be read (HTTP 403)', 'fact 3: a quote isn\'t on https://a.org/sleep']);
    expect(parseStudioBrief(brief)).toEqual(brief);
  });

  it('drops quotes that are too short to show anything, and sources the research doesn\'t list', () => {
    const { brief, dropped } = verifyResearch(research([
      { text: 'Too short.', quotes: [{ source: 1, text: 'those who slept seven to nine hours' }] },
      { text: 'Unknown source.', quotes: [{ source: 9, text: QUOTE_A }] },
    ]), pages);
    expect(brief.facts).toEqual([]);
    expect(dropped).toEqual(['fact 1: a quote of 7 words', 'fact 2: quotes a source it doesn\'t list (9)']);
    expect(checkBrief(brief)).toEqual(['the research cites 0 source(s); it needs 2', 'the research has 0 cited facts; it needs 6']);
  });
});

describe('the studio\'s prompts (M15)', () => {
  it('are the tick\'s research brief, with the studio\'s searches and its page reader', () => {
    expect(STUDIO_RESEARCH_SYSTEM.startsWith(RESEARCH_SYSTEM.slice(0, 80))).toBe(true);
    expect(STUDIO_RESEARCH_SYSTEM).toContain(`(at most ${STUDIO_SEARCHES} searches, with WebSearch)`);
    expect(STUDIO_RESEARCH_SYSTEM).toContain('node read-page.ts');
  });

  it('describe the regular to the picker with their fixed look and the scene', () => {
    const system = pickSystem('priya', 'an Indian woman of 24', 'at a desk at night', ['5701.png', '5702.png', '5703.png']);
    expect(system).toContain('1 is 5701.png, 2 is 5702.png, 3 is 5703.png');
    expect(system).toContain('Priya: an Indian woman of 24');
    expect(system).toContain('this scene: at a desk at night');
  });
});
