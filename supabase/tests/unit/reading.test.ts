import { describe, expect, it } from 'vitest';
import {
  articleBody, bodiesToSend, chooseArticle, fromOwnAreas, insightFor, insightOptions, insightView, nextArticle, planInsight,
  preferredClusters, readingsView,
} from '../../functions/_shared/reading.ts';
import type { ArticleRow, CandidateRow } from '../../functions/_shared/reading.ts';

const DAY = 86_400_000;
let made = 0;
/** A published article; `age` days old (older first), `given` the quest day it was given on (null: unread). */
function article(cluster: CandidateRow['cluster'], over: Partial<CandidateRow> & { age?: number } = {}): CandidateRow {
  made++;
  const { age = 100 - made, ...rest } = over;
  return {
    id: `article-${made}`, cluster, title: `About ${cluster} ${made}`, reading_minutes: 6, evergreen: false,
    published_at: new Date(Date.UTC(2026, 9, 1) - age * DAY), last_given: null, ...rest,
  };
}
const MINE = ['movement', 'sleep'] as const;
const choose = (candidates: CandidateRow[], dayNumber: number, insight: CandidateRow['cluster'] | null = null) =>
  chooseArticle(candidates, { dayNumber, preferred: MINE, insight })?.id ?? null;

describe("a player's areas and the day's group (decisions 1–2)", () => {
  it('are the topics of the goals and of the class, once each', () => {
    expect(preferredClusters(['body', 'energy'], 'warrior')).toEqual(['movement', 'sleep']);
    expect(preferredClusters(['learn'], 'mage')).toEqual(['learning']);
    expect(preferredClusters(['focus', 'routine'], 'monk')).toEqual(['focus', 'habits', 'philosophy']);
  });

  it('three days in five read from them, two from the other topics', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(fromOwnAreas)).toEqual([true, true, true, false, false, true, true, true, false, false]);
  });
});

describe('the article a new day gets (decision 1)', () => {
  it("takes the player's areas on their days and the other topics on the others", () => {
    const mine = article('movement');
    const other = article('history');
    expect(choose([mine, other], 1)).toBe(mine.id);
    expect(choose([mine, other], 4)).toBe(other.id);
  });

  it("falls back to the other group when the day's group has nothing unread", () => {
    const other = article('history');
    expect(choose([other], 2)).toBe(other.id);
    const mine = article('sleep');
    expect(choose([mine], 5)).toBe(mine.id);
  });

  it('gives the oldest published unread article first, and never one already given', () => {
    const newer = article('movement', { age: 1 });
    const older = article('movement', { age: 30 });
    const given = article('movement', { age: 60, last_given: 3 });
    expect(choose([newer, older, given], 6)).toBe(older.id);
  });

  it('keeps two days in a row from sharing a topic while another waits', () => {
    const yesterday = article('movement', { last_given: 5 });
    const sameTopic = article('movement', { age: 50 });
    const otherTopic = article('sleep', { age: 2 });
    expect(choose([yesterday, sameTopic, otherTopic], 6)).toBe(otherTopic.id);
    expect(choose([yesterday, sameTopic], 6)).toBe(sameTopic.id);
  });

  it("takes Insight's topic first, and the usual order when that topic has nothing unread", () => {
    const philosophy = article('philosophy');
    const mine = article('movement');
    expect(choose([mine, philosophy], 1, 'philosophy')).toBe(philosophy.id);
    expect(choose([mine], 1, 'philosophy')).toBe(mine.id);
  });

  it('with nothing unread, gives back the evergreen article read longest ago', () => {
    const recent = article('movement', { evergreen: true, last_given: 9 });
    const long = article('sleep', { evergreen: true, last_given: 2 });
    const nightly = article('history', { last_given: 1 });
    expect(choose([recent, long, nightly], 10)).toBe(long.id);
  });

  it('gives none without a published article, or with nothing unread and no evergreen article', () => {
    expect(choose([], 1)).toBeNull();
    expect(choose([article('history', { last_given: 1 })], 2)).toBeNull();
  });
});

describe("Insight's choice (decision 8)", () => {
  it('applies to the day built after the day it was chosen on, and then lapses', () => {
    expect(insightFor({ cluster: 'history', day: 4 }, 4)).toBe('history');
    expect(insightFor({ cluster: 'history', day: 3 }, 4)).toBeNull();
    expect(insightFor({ cluster: 'cooking', day: 4 }, 4)).toBeNull();
    expect(insightFor(null, 4)).toBeNull();
    expect(insightFor(undefined, 4)).toBeNull(); // a server ahead of its migration reads none (review)
  });

  it("offers up to 3 topics with an unread article, least recently read first, not today's", () => {
    const today = article('history', { last_given: 7 });
    const list = [
      today, article('history'), article('sleep', { last_given: 6 }), article('sleep'), article('focus'),
      article('learning', { last_given: 2 }), article('learning'), article('habits'),
    ];
    const options = insightOptions(list, { number: 7, articleId: today.id });
    expect(options).toHaveLength(3);
    expect(options.slice(0, 2).sort()).toEqual(['focus', 'habits']);
    expect(options[2]).toBe('learning');
    expect(options).not.toContain('psychology');
  });

  it('shows only for a Mage from level 5 on an open day, with the choice', () => {
    const list = [article('history'), article('sleep')];
    const mage = { goals: ['learn'] as const, classId: 'mage' as const, insight: { cluster: 'sleep', day: 3 } };
    const day = { number: 3, articleId: null, open: true };
    expect(insightView(list, { ...mage, level: 5 }, day)).toEqual({ options: expect.arrayContaining(['history', 'sleep']), chosen: 'sleep' });
    expect(insightView(list, { ...mage, level: 4 }, day)).toBeNull();
    expect(insightView(list, { ...mage, classId: 'warrior', level: 9 }, day)).toBeNull();
    expect(insightView(list, { ...mage, level: 5 }, { ...day, open: false })).toBeNull();
  });

  it('is checked on the open day: the class and level, and a topic with something unread', () => {
    const list = [article('history')];
    const day = { number: 3, articleId: null, status: 'open' as const, endsAtMs: 2_000 };
    const mage = { classId: 'mage' as const, level: 5 };
    expect(planInsight(list, mage, day, 'history', 1_000)).toEqual({ day: 3 });
    expect(planInsight(list, mage, day, 'sleep', 1_000)).toEqual({ code: 'topic_empty' });
    expect(planInsight(list, { ...mage, level: 4 }, day, 'history', 1_000)).toEqual({ code: 'ability_not_ready' });
    expect(planInsight(list, mage, day, 'history', 2_000)).toEqual({ code: 'day_closed' });
    expect(planInsight(list, mage, null, 'history', 1_000)).toEqual({ code: 'day_closed' });
  });
});

describe("the next day's article, for the phone's offline day (decision 4)", () => {
  it("is chosen as the server will, with today's article counted as given and Insight's choice of today", () => {
    const todays = article('movement', { last_given: 3 });
    const mine = article('sleep');
    const other = article('history');
    const reader = { goals: ['body', 'energy'] as const, classId: 'warrior' as const, insight: null };
    expect(nextArticle([todays, mine, other], reader, { number: 3, articleId: todays.id })?.id).toBe(other.id); // day 4: others
    expect(nextArticle([todays, mine, other], reader, { number: 2, articleId: todays.id })?.id).toBe(mine.id); // day 3: mine
    expect(nextArticle([todays, mine, other], { ...reader, insight: { cluster: 'sleep', day: 3 } }, { number: 3, articleId: todays.id })?.id)
      .toBe(mine.id);
  });
});

describe('an article as the phone shows it (decision 5)', () => {
  const row: ArticleRow = {
    id: 'article-8', cluster: 'habits', title: 'How habits form', summary: 'A cue, a routine, a reward.', reading_minutes: 6,
    sections: [
      { heading: 'The loop', paragraphs: ['One.', 'Two.'], systemNote: 'System: Your streak is this loop.', sourceIds: [5, 2] },
      { heading: 'Small first', paragraphs: ['Three.'], systemNote: null, sourceIds: [9] },
    ],
    takeaways: ['Start small.', 'Keep the cue.'], reflection_question: 'What is your cue?',
  };
  const sources = [
    { article_id: 'article-8', idx: 5, url: 'https://example.org/b', title: 'B' },
    { article_id: 'article-8', idx: 2, url: 'https://www.nih.gov/a', title: 'A' },
    { article_id: 'article-9', idx: 1, url: 'https://other.org', title: 'Not this article' },
  ];

  it('numbers its sources 1…n in their order, each section names the numbers it relies on, and a System note loses its "System:"', () => {
    const body = articleBody(row, sources);
    expect(body.sources).toEqual([
      { n: 1, title: 'A', url: 'https://www.nih.gov/a', host: 'nih.gov' },
      { n: 2, title: 'B', url: 'https://example.org/b', host: 'example.org' },
    ]);
    expect(body.sections.map((s) => s.sources)).toEqual([[1, 2], []]);
    expect(body).toMatchObject({ id: 'article-8', cluster: 'habits', minutes: 6, question: 'What is your cue?', takeaways: ['Start small.', 'Keep the cue.'] });
    expect(body.sections[0]).toMatchObject({ heading: 'The loop', paragraphs: ['One.', 'Two.'], systemNote: 'Your streak is this loop.' });
  });
});

describe('the readings and the articles a response carries (decisions 3, 7)', () => {
  it('lists the readings newest first, with their date and takeaway', () => {
    const at = (d: number) => new Date(Date.UTC(2026, 9, d, 16));
    const rows = [
      { day_number: 1, starts_at: at(9), ends_at: at(10), time_zone: 'Asia/Manila', article_id: 'article-1', title: 'One', cluster: 'sleep' as const, reading_minutes: 5, takeaway: null },
      { day_number: 2, starts_at: at(10), ends_at: at(11), time_zone: 'Asia/Manila', article_id: 'article-2', title: 'Two', cluster: 'focus' as const, reading_minutes: 7, takeaway: 'Guard the first hour.' },
    ];
    expect(readingsView(rows)).toEqual([
      { id: 'article-2', cluster: 'focus', title: 'Two', minutes: 7, dayNumber: 2, date: '2026-10-11', takeaway: 'Guard the first hour.' },
      { id: 'article-1', cluster: 'sleep', title: 'One', minutes: 5, dayNumber: 1, date: '2026-10-10', takeaway: null },
    ]);
  });

  it("carries today's and the next day's articles and those asked for, unless the phone holds them", () => {
    expect(bodiesToSend(['article-1', 'article-2', 'article-7', 'article-1'], ['article-2'])).toEqual(['article-1', 'article-7']);
    expect(bodiesToSend([null, null], [])).toEqual([]);
  });
});
