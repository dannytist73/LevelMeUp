/** @jest-environment node */
import { project } from '../src/game/project.ts';
import { clearedSummary } from '../src/quest/cleared.ts';
import { completeEvent, serverState } from './support/fixtures.ts';

// Strength starts just short of 22 XP, the first stat point (start + floor(sqrt(xp / 22))), so the core quest crosses it.
const CORE_STRENGTH = serverState().today!.quests.find((q) => q.slot === 'core')!.xp.strength!;
const SERVER = serverState([], { xp_strength: 22 - CORE_STRENGTH });
const quests = SERVER.today!.quests;
const core = quests.find((q) => q.slot === 'core')!;
const side1 = quests.find((q) => q.slot === 'side1')!;
const side2 = quests.find((q) => q.slot === 'side2')!;
const xpOf = (q: (typeof quests)[number]) => Object.values(q.xp).reduce((s, x) => s + (x ?? 0), 0);
const shown = (...done: number[]) => {
  const view = project(SERVER, done.map((id) => completeEvent(id)));
  return { character: view.character, quests: view.today!.quests };
};

describe('"Quest cleared" (board D2, M6a decision 5)', () => {
  it('shows the quest\'s XP, the stats that went up, and the level bar after', () => {
    const before = shown();
    const after = shown(core.id);
    const c = clearedSummary(before, after, core.id);
    expect(c.xp).toBe(xpOf(core));
    for (const up of c.statUps) {
      expect(up.to).toBeGreaterThan(up.from);
      expect(up.to).toBe(after.character.stats[up.stat].points);
    }
    expect(c.statUps.map((s) => s.stat)).toEqual(['strength']);
    expect(c.level).toEqual({ level: after.character.level, xpIntoLevel: after.character.xpIntoLevel, xpForLevel: after.character.xpForLevel });
    expect(c.levelBefore).toEqual({ level: before.character.level, xpIntoLevel: before.character.xpIntoLevel, xpForLevel: before.character.xpForLevel });
  });

  it('counts Discipline for the core quest only', () => {
    expect(clearedSummary(shown(), shown(core.id), core.id).discipline).toBe(true);
    expect(clearedSummary(shown(), shown(side1.id), side1.id).discipline).toBe(false);
  });

  it('shows the streak growing only when this completion makes today a streak day', () => {
    const streak = SERVER.character.streak.current;
    expect(clearedSummary(shown(), shown(core.id), core.id).streak).toEqual({ from: streak, to: streak + 1 });
    expect(clearedSummary(shown(), shown(side1.id), side1.id).streak).toBeNull(); // one side quest: not yet
    expect(clearedSummary(shown(side1.id), shown(side1.id, side2.id), side2.id).streak).toEqual({ from: streak, to: streak + 1 });
    expect(clearedSummary(shown(core.id), shown(core.id, side1.id), side1.id).streak).toBeNull(); // already counted
  });

  it('promises no streak while a check-in is pending: the server holds the day until it is answered (review)', () => {
    const waiting = serverState([], { xp_strength: 22 - CORE_STRENGTH, awaiting_checkin: true });
    const shot = (...done: number[]) => {
      const view = project(waiting, done.map((id) => completeEvent(id)));
      return { character: view.character, quests: view.today!.quests };
    };
    expect(waiting.character.streak.awaitingCheckin).toBe(true);
    expect(clearedSummary(shot(), shot(core.id), core.id).streak).toBeNull();
    expect(clearedSummary(shot(), shot(core.id), core.id).discipline).toBe(true); // the core quest still counts for Discipline
  });

  it('opened later, without a before, shows no changes, only the XP, Discipline and the bar', () => {
    const c = clearedSummary(null, shown(core.id), core.id);
    expect(c.statUps).toEqual([]);
    expect(c.streak).toBeNull();
    expect(c.discipline).toBe(true);
    expect(c.xp).toBe(xpOf(core));
    expect(c.levelBefore).toBeNull();
  });
});

describe('the recovery quest cleared (M7a)', () => {
  it('says the day is taken back when today ends; no other quest does', () => {
    const recovery = { ...side1, id: 999, slot: 'recovery' as const, completedAt: '2026-10-10T13:00:00.000Z' };
    const after = { character: SERVER.character, quests: [...quests, recovery] };
    expect(clearedSummary(null, after, 999).recovered).toBe(true);
    expect(clearedSummary(null, shown(core.id), core.id).recovered).toBe(false);
  });
});
