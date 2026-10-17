// M10c: what Today says about the day (src/game/today.ts): today counts, the streak shown, the next quest, the day
// cleared, and which quests Today can clear. M12: Up next and the day done once its must-do quests are.
import { dayCleared, mustDo, openQuests, quickClearable, shownStreak, todayCounts, upNext, xpToday } from '../src/game/today.ts';
import type { QuestView, ServerState } from '../src/game/types.ts';
import { serverState } from './support/fixtures.ts';

const slots = (s: ServerState) => s.today!.quests.map((q) => q.slot);

describe('today counts (decision 2)', () => {
  it('counts once the core quest is cleared, and adds today to the streak shown', () => {
    const before = serverState([], { streak_current: 5, streak_best: 5 });
    expect(todayCounts(before)).toBe(false);
    expect(shownStreak(before)).toEqual({ current: 5, best: 5, counts: false });
    const after = serverState(['core'], { streak_current: 5, streak_best: 5 });
    expect(todayCounts(after)).toBe(true);
    expect(shownStreak(after)).toEqual({ current: 6, best: 6, counts: true });
  });

  it('counts after any two quests without the core quest (spec §2.4)', () => {
    const sides = serverState(['side1', 'side2']);
    expect(todayCounts(sides)).toBe(true);
    expect(todayCounts(serverState(['side1']))).toBe(false);
  });

  it('keeps the best when it is already higher', () => {
    expect(shownStreak(serverState(['core'], { streak_current: 2, streak_best: 9 }))).toEqual({ current: 3, best: 9, counts: true });
  });

  it("doesn't count while a check-in is waiting: the answer decides then", () => {
    const waiting = serverState(['core'], { streak_current: 5, awaiting_checkin: true });
    expect(todayCounts(waiting)).toBe(false);
    expect(shownStreak(waiting).current).toBe(5);
  });

  it("doesn't count a day the server already closed (it is in the count)", () => {
    const s = serverState(['core'], { streak_current: 5 });
    const closed = { ...s, today: { ...s.today!, status: 'closed' as const } };
    expect(todayCounts(closed)).toBe(false);
  });

  it('is false with no day at all', () => {
    expect(todayCounts({ ...serverState(), today: null })).toBe(false);
  });
});

const ARTICLE = { id: 'article-9', cluster: 'sleep' as const, title: 'Wake time', minutes: 6 };
const withArticle = (s: ServerState): ServerState => ({ ...s, today: { ...s.today!, article: ARTICLE } });

describe('the day done and the XP it earned (M12 decision 2)', () => {
  it('needs the core quest and, once the day has its article, the reading; side quests are extras', () => {
    expect(dayCleared(withArticle(serverState()).today!)).toBe(false);
    expect(dayCleared(withArticle(serverState(['core'])).today!)).toBe(false);
    expect(dayCleared(withArticle(serverState(['core', 'article'])).today!)).toBe(true);
    expect(dayCleared(withArticle(serverState(['side1', 'side2', 'article'])).today!)).toBe(false);
    expect(dayCleared(serverState(['core']).today!)).toBe(true); // the article never came: the core quest is enough
    expect(dayCleared({ ...serverState().today!, quests: [] })).toBe(false);
  });

  it('needs an open recovery quest too', () => {
    const s = serverState(['core']);
    const recovery: QuestView = { ...s.today!.quests[1]!, id: 999, slot: 'recovery', completedAt: null };
    const today = { ...s.today!, quests: [...s.today!.quests, recovery] };
    expect(mustDo(today).map((q) => q.slot).sort()).toEqual(['core', 'recovery']);
    expect(dayCleared(today)).toBe(false);
  });

  it('a day with no must-do quest needs every quest', () => {
    const s = serverState(['side1']);
    const sidesOnly = { ...s.today!, quests: s.today!.quests.filter((q) => q.slot === 'side1' || q.slot === 'side2') };
    expect(dayCleared(sidesOnly)).toBe(false);
    expect(dayCleared({ ...sidesOnly, quests: sidesOnly.quests.map((q) => ({ ...q, completedAt: '2026-10-10T13:00:00.000Z' })) })).toBe(true);
  });

  it("adds up the cleared quests' XP", () => {
    const s = serverState(['core']);
    const core = s.today!.quests.find((q) => q.slot === 'core')!;
    expect(xpToday(s.today!)).toBe(Object.values(core.xp).reduce((a, x) => a + (x ?? 0), 0));
    expect(xpToday(serverState().today!)).toBe(0);
  });
});

describe('Up next (M12 decision 3)', () => {
  it('is the core quest while it is open', () => {
    expect(upNext(withArticle(serverState()).today!)?.slot).toBe('core');
  });

  it('then the reading, then the side quests; none once the day is done', () => {
    expect(upNext(withArticle(serverState(['core'])).today!)?.slot).toBe('article');
    expect(upNext(withArticle(serverState(['core', 'side1'])).today!)?.slot).toBe('article');
    expect(upNext(withArticle(serverState(['core', 'article'])).today!)).toBeNull();
  });

  it('a reading whose article has not come waits behind the side quests', () => {
    expect(upNext(serverState(['side1']).today!)?.slot).toBe('core');
    const s = { ...serverState().today!, quests: serverState().today!.quests.filter((q) => q.slot !== 'core') };
    expect(upNext(s)?.slot).toBe('side1');
  });

  it('puts a recovery quest first', () => {
    const s = serverState();
    const recovery: QuestView = { ...s.today!.quests[1]!, id: 999, slot: 'recovery', completedAt: null };
    expect(upNext({ ...s.today!, quests: [...s.today!.quests, recovery] })?.id).toBe(999);
  });

  it('skips what it is told to (the side quests a Trial seals)', () => {
    const s = withArticle(serverState(['core', 'article']));
    const sides = { ...s.today!, quests: s.today!.quests.filter((q) => q.slot !== 'article' && q.slot !== 'core') };
    expect(openQuests(sides, (q) => q.slot === 'side1').map((q) => q.slot)).toEqual(['side2']);
  });
});

describe('quick clear (decision 6)', () => {
  const quest = serverState().today!.quests[0]!;
  const tap: QuestView = { ...quest, completion: 'tap', slot: 'side1', completedAt: null };

  it('takes an open check-off quest', () => {
    expect(quickClearable(tap, false)).toBe(true);
  });

  it.each([
    ['a sealed quest', { ...tap }, true],
    ['a cleared quest', { ...tap, completedAt: '2026-10-10T10:00:00.000Z' }, false],
    ['a timer', { ...tap, completion: 'timer' as const }, false],
    ['a rep log', { ...tap, completion: 'reps' as const }, false],
    ['a sentence', { ...tap, completion: 'text' as const }, false],
    ['the reading', { ...tap, slot: 'article' as const }, false],
  ])('leaves %s to its quest screen', (_name, q, sealed) => {
    expect(quickClearable(q, sealed)).toBe(false);
  });
});
