import { project } from '../src/game/project.ts';
import { articleKeep } from '../src/game/reading.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import { serverState } from './support/fixtures.ts';

const summary = (id: string) => ({ id, cluster: 'sleep' as const, title: id, minutes: 6 });

describe('the articles the phone keeps (M8b decision 3)', () => {
  it("are today's, the next day's and the readings', once each", () => {
    const s = serverState();
    const state: ServerState = {
      ...s,
      today: { ...s.today!, article: summary('article-3') },
      nextArticle: summary('article-4'),
      readings: [
        { ...summary('article-3'), dayNumber: 1, date: '2026-10-10', takeaway: null },
        { ...summary('article-1'), dayNumber: 0, date: '2026-10-09', takeaway: 'Wake at seven.' },
      ],
    };
    expect(articleKeep(state).sort()).toEqual(['article-1', 'article-3', 'article-4']);
    expect(articleKeep(s)).toEqual([]);
  });
});

/** An event without its id: Omit on each member of the union, so each keeps its own fields. */
type NoId<E> = E extends unknown ? Omit<E, 'id'> : never;
const ev = (n: number, rest: NoId<PhoneEvent>): PhoneEvent =>
  ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, ...rest } as PhoneEvent);

describe('what shows at once (M8b)', () => {
  const s = serverState();
  const article = s.today!.quests.find((q) => q.slot === 'article')!;
  const state: ServerState = {
    ...s,
    today: { ...s.today!, article: summary('article-3') },
    readings: [{ ...summary('article-3'), dayNumber: 1, date: '2026-10-10', takeaway: null }],
    insight: { options: ['history', 'sleep'], chosen: null },
  };

  it("the takeaway joins today's reading, and an undo takes it back", () => {
    const claimed = project(state, [ev(1, { type: 'complete', instanceId: article.id, completedAt: Date.UTC(2026, 9, 10, 13), rating: null, payload: { text: 'Wake at seven.' } })]);
    expect(claimed.readings[0]!.takeaway).toBe('Wake at seven.');
    const undone = project(state, [
      ev(1, { type: 'complete', instanceId: article.id, completedAt: Date.UTC(2026, 9, 10, 13), rating: null, payload: { text: 'Wake at seven.' } }),
      ev(2, { type: 'undo', instanceId: article.id }),
    ]);
    expect(undone.readings[0]!.takeaway).toBeNull();
  });

  it("Insight's choice shows at once", () => {
    expect(project(state, [ev(3, { type: 'insight', cluster: 'history' })]).insight).toEqual({ options: ['history', 'sleep'], chosen: 'history' });
  });

  it('a state from a server before M8b reads as no article, no readings, no Insight', () => {
    const old = { ...s, today: { ...s.today!, article: undefined }, readings: undefined, nextArticle: undefined, insight: undefined } as unknown as ServerState;
    const shown = project(old, []);
    expect(shown.today!.article).toBeNull();
    expect(shown.readings).toEqual([]);
    expect(shown.nextArticle).toBeNull();
    expect(shown.insight).toBeNull();
  });
});
