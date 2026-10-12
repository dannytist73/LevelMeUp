import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { planAdvance } from '../../functions/_shared/advance.ts';
import { parseSyncBody } from '../../functions/_shared/events.ts';
import { startArgs, templateReveal } from '../../functions/_shared/onboarding.ts';
import type { CandidateRow } from '../../functions/_shared/reading.ts';
import { stateView } from '../../functions/_shared/state.ts';
import { dayOffers } from '../../functions/_shared/today.ts';
import { DAY1, HOUR, ONBOARDED, afterDay1, characterRow, choices, dayTwoSnapshot, historyOf } from './fixtures.ts';

const DAY = 86_400_000;
const lib = (id: number, cluster: CandidateRow['cluster'], over: Partial<CandidateRow> = {}): CandidateRow => ({
  id: `article-${id}`, cluster, title: `Article ${id}`, reading_minutes: 6, evergreen: false,
  published_at: new Date(Date.UTC(2026, 8, 1) + id * DAY), last_given: null, ...over,
});
const AFTER_DAY1 = new Date(DAY1.endsAt).getTime() + HOUR;
const UUID = '00000000-0000-4000-8000-000000000123';

describe('the day 1 article (onboarding, decision 1)', () => {
  it("comes from the player's areas when the library has one, and is null without a library", () => {
    const args = startArgs(choices(), templateReveal(choices()), ONBOARDED, LIBRARY, [lib(1, 'history'), lib(2, 'sleep')]);
    expect(args.day.articleId).toBe('article-2'); // Rin: body and energy, a warrior → movement, sleep
    expect(startArgs(choices(), templateReveal(choices()), ONBOARDED, LIBRARY).day.articleId).toBeNull();
  });
});

describe("a new day's article (planAdvance, decisions 1, 4, 8)", () => {
  it('is chosen from the unread library when the day is built', () => {
    const outcome = planAdvance(afterDay1(['core'], AFTER_DAY1, { articles: [lib(1, 'movement', { last_given: 1 }), lib(2, 'movement'), lib(3, 'history')] }));
    expect(outcome?.newDay?.articleId).toBe('article-2'); // day 2: the player's areas
  });

  it("follows Insight's choice made on the day before", () => {
    const outcome = planAdvance(afterDay1(['core'], AFTER_DAY1, {
      articles: [lib(2, 'movement'), lib(3, 'history')], character: characterRow({ insight: { cluster: 'history', day: 1 } }),
    }));
    expect(outcome?.newDay?.articleId).toBe('article-3');
  });

  it("keeps the phone's offline pick while it is published, and chooses again when it isn't", () => {
    const articles = [lib(2, 'movement'), lib(3, 'history')];
    const quests = DAY1.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: null }));
    const kept = planAdvance(afterDay1(['core'], AFTER_DAY1, { articles, provisional: { dayNumber: 2, quests, articleId: 'article-3' } }));
    expect(kept?.newDay?.articleId).toBe('article-3');
    const gone = planAdvance(afterDay1(['core'], AFTER_DAY1, { articles, provisional: { dayNumber: 2, quests, articleId: 'article-99' } }));
    expect(gone?.newDay?.articleId).toBe('article-2');
    const had = [lib(2, 'movement'), lib(3, 'history', { last_given: 1 })];
    const read = planAdvance(afterDay1(['core'], AFTER_DAY1, { articles: had, provisional: { dayNumber: 2, quests, articleId: 'article-3' } }));
    expect(read?.newDay?.articleId).toBe('article-2'); // the player had it: the server chooses (review)
  });

  it('is null without a published article', () => {
    expect(planAdvance(afterDay1(['core'], AFTER_DAY1))?.newDay?.articleId).toBeNull();
  });
});

describe('the reading in the state (decision 3)', () => {
  it("names today's article, the next day's pick and the readings; Insight only for a Mage from level 5", () => {
    const articles = [lib(1, 'movement', { last_given: 2 }), lib(2, 'history'), lib(3, 'sleep')];
    const s = dayTwoSnapshot(undefined, { articles }, { article_id: 'article-1' });
    const history = {
      ...historyOf(s),
      readings: [{ day_number: 2, starts_at: s.days[0]!.starts_at, ends_at: s.days[0]!.ends_at, time_zone: 'Asia/Manila',
        article_id: 'article-1', title: 'Article 1', cluster: 'movement' as const, reading_minutes: 6, takeaway: null }],
    };
    const view = stateView(s, dayOffers(s, LIBRARY), history);
    expect(view.today?.article).toEqual({ id: 'article-1', cluster: 'movement', title: 'Article 1', minutes: 6 });
    expect(view.nextArticle?.id).toBe('article-3'); // day 3: the player's areas (sleep), movement was today's
    expect(view.readings.map((r) => r.id)).toEqual(['article-1']);
    expect(view.insight).toBeNull(); // a warrior
  });

  it("names no article when today has none or it isn't published", () => {
    const s = dayTwoSnapshot(undefined, { articles: [] }, { article_id: 'article-5' });
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.today?.article).toBeNull();
    expect(view.nextArticle).toBeNull();
  });
});

describe("the sync body's articles (decision 3)", () => {
  it('takes the ids the phone holds and asks for, and refuses anything else', () => {
    const ok = parseSyncBody({ timeZone: 'Asia/Manila', events: [], have: ['article-1', 'article-1'], want: ['article-2'] });
    expect(ok).toMatchObject({ have: ['article-1'], want: ['article-2'] });
    expect(parseSyncBody({ timeZone: 'Asia/Manila', events: [] })).toMatchObject({ have: [], want: [] });
    expect(parseSyncBody({ timeZone: 'Asia/Manila', events: [], want: ['article-1', 'article-2', 'article-3', 'article-4'] })).toMatchObject({ status: 400 });
    expect(parseSyncBody({ timeZone: 'Asia/Manila', events: [], have: ['../etc'] })).toMatchObject({ status: 400 });
  });

  it('reads the Insight event, and refuses a topic outside the eight', () => {
    const body = parseSyncBody({ timeZone: 'Asia/Manila', events: [
      { id: UUID, type: 'insight', cluster: 'history' },
      { id: UUID.replace('123', '124'), type: 'insight', cluster: 'cooking' },
    ] });
    expect(body).toMatchObject({ events: [{ type: 'insight', cluster: 'history' }], rejected: [{ code: 'bad_event' }] });
  });
});
