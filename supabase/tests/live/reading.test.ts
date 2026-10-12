// M8b: reading on the live project. Players read the shared library; while nothing is published a day has no article
// and the reading quest can't be claimed. Every player created here is deleted at the end (helpers.ts).
import { describe, expect, it } from 'vitest';
import { ONBOARDING, call, eventId, newPlayer, sync } from './helpers.ts';
import type { Player } from './helpers.ts';

const quest = (state: any, slot: string) => state.today.quests.find((q: any) => q.slot === slot);

describe('reading (M8b)', () => {
  let p: Player;
  let state: any;
  let articleId: string | null;

  it("onboarding names day 1's article when the library has one, and sends it whole", async () => {
    p = await newPlayer();
    const res = await call('lmu-onboarding', p.token, ONBOARDING);
    expect(res.status).toBe(201);
    state = res.body.state;
    articleId = state.today.article?.id ?? null;
    expect(Array.isArray(state.readings)).toBe(true);
    if (articleId === null) {
      expect(res.body.articles).toEqual([]);
    } else {
      const body = res.body.articles.find((a: any) => a.id === articleId);
      expect(body).toMatchObject({ id: articleId, title: state.today.article.title });
      expect(body.sections.length).toBeGreaterThanOrEqual(4);
      expect(body.sources.every((s: any, i: number) => s.n === i + 1 && /^https?:\/\//.test(s.url))).toBe(true);
    }
  });

  it('the reading quest is claimed only on a day with an article, and its takeaway comes back', async () => {
    const reading = quest(state, 'article');
    const res = await sync(p, [{ id: eventId(), type: 'complete', instanceId: reading.id, completedAt: Date.now(), rating: null, payload: { text: 'One idea to keep.' } }]);
    expect(res.status).toBe(200);
    if (articleId === null) {
      expect(res.body.results[0]).toMatchObject({ ok: false, code: 'no_article' });
    } else {
      expect(res.body.results[0]).toMatchObject({ ok: true });
      expect(res.body.state.readings[0]).toMatchObject({ id: articleId, takeaway: 'One idea to keep.' });
    }
  });

  it('a sync sends only the articles the phone lacks, and refuses a bad list', async () => {
    const held = await call('lmu-sync', p.token, { timeZone: 'Asia/Manila', events: [], have: articleId === null ? [] : [articleId] });
    expect(held.status).toBe(200);
    expect(held.body.articles.map((a: any) => a.id)).not.toContain(articleId);
    expect(await call('lmu-sync', p.token, { timeZone: 'Asia/Manila', events: [], want: ['../x'] })).toMatchObject({ status: 400 });
  });

  it('Insight is refused for a class without it', async () => {
    const res = await sync(p, [{ id: eventId(), type: 'insight', cluster: 'history' }]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'ability_not_ready' });
    expect(res.body.state.insight).toBeNull();
  });
});
