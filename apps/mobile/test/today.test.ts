// M10c: what Today says about the day (src/game/today.ts): today counts, the streak shown, the next quest, the day
// cleared, and which quests a hold can clear.
import { dayCleared, nextQuest, quickClearable, shownStreak, todayCounts, xpToday } from '../src/game/today.ts';
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

describe('the day cleared and the XP it earned', () => {
  it('is cleared only when every quest is', () => {
    const s = serverState();
    expect(dayCleared(s.today!)).toBe(false);
    expect(dayCleared(serverState(slots(s)).today!)).toBe(true);
    expect(dayCleared({ ...s.today!, quests: [] })).toBe(false);
  });

  it("adds up the cleared quests' XP", () => {
    const s = serverState(['core']);
    const core = s.today!.quests.find((q) => q.slot === 'core')!;
    expect(xpToday(s.today!)).toBe(Object.values(core.xp).reduce((a, x) => a + (x ?? 0), 0));
    expect(xpToday(serverState().today!)).toBe(0);
  });
});

describe('the next quest', () => {
  it('is none while the core quest is open', () => {
    expect(nextQuest(serverState().today!)).toBeNull();
  });

  it('is the first open quest after the core quest is cleared, and none when all are', () => {
    const s = serverState(['core']);
    const first = s.today!.quests.find((q) => q.slot !== 'core')!;
    expect(nextQuest(s.today!)?.id).toBe(first.id);
    expect(nextQuest(serverState(['core', first.slot]).today!)?.slot).not.toBe(first.slot);
    expect(nextQuest(serverState(slots(s)).today!)).toBeNull();
  });

  it('puts a recovery quest first', () => {
    const s = serverState(['core']);
    const today = s.today!;
    const recovery: QuestView = { ...today.quests[1]!, id: 999, slot: 'recovery' };
    expect(nextQuest({ ...today, quests: [...today.quests, recovery] })?.id).toBe(999);
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
