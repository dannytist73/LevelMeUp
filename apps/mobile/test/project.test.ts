import { STATS } from '@levelmeup/rules';
import type { XpByStat } from '@levelmeup/rules';
import { characterView } from '../../../supabase/functions/_shared/state.ts';
import { addStatXp, project } from '../src/game/project.ts';
import { characterRow, completeEvent, rateEvent, serverState, undoEvent } from './support/fixtures.ts';

const deepFreeze = <T,>(value: T): T => {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

describe('the character with a quest\'s XP added (the server\'s numbers, computed on the phone)', () => {
  const rows = [
    characterRow(),
    characterRow({ xp_strength: 210, xp_vitality: 95, xp_discipline: 40 }),
    characterRow({ xp_strength: 1000, xp_wisdom: 21, xp_focus: 87 }),
  ];
  const gains: XpByStat[] = [{ strength: 20 }, { vitality: 10, discipline: 5 }, { wisdom: 30 }, { strength: 1 }, { focus: 1000 }];

  it.each(rows.flatMap((row, r) => gains.map((xp, g) => [`row ${r}, gain ${g}`, row, xp] as const)))('%s', (_, row, xp) => {
    const after = { ...row };
    for (const s of STATS) after[`xp_${s}`] += xp[s] ?? 0;
    expect(addStatXp(characterView(row), xp, 1)).toEqual(characterView(after));
    expect(addStatXp(characterView(after), xp, -1)).toEqual(characterView(row));
  });

  it('covers a level-up and a new stat point among those cases', () => {
    const before = characterView(characterRow({ xp_strength: 15 }));
    const after = addStatXp(before, { strength: 20 }, 1);
    expect(after.level).toBeGreaterThan(before.level);
    expect(after.stats.strength.points).toBeGreaterThan(before.stats.strength.points);
  });
});

describe('what the screens show: the server state plus the unsent events', () => {
  const server = deepFreeze(serverState(['side1']));
  const quests = server.today!.quests;
  const core = quests.find((q) => q.slot === 'core')!;
  const side1 = quests.find((q) => q.slot === 'side1')!;
  const xpOf = (q: typeof core) => Object.values(q.xp).reduce((s, x) => s + (x ?? 0), 0);

  it('with nothing pending it is the server state, nothing waiting', () => {
    const shown = project(server, []);
    expect({ ...shown, waiting: undefined }).toEqual({ ...server, waiting: undefined });
    expect(shown.waiting.size).toBe(0);
  });

  it('a completion clears the quest, adds its stored XP once, and waits for the server', () => {
    const shown = project(server, [completeEvent(core.id, 'easy'), completeEvent(core.id)]);
    const quest = shown.today!.quests.find((q) => q.id === core.id)!;
    expect(quest.completedAt).toBe('2026-10-10T13:00:00.000Z');
    expect(quest.rating).toBe('easy');
    expect(shown.character.totalXp).toBe(server.character.totalXp + xpOf(core));
    expect([...shown.waiting]).toEqual([core.id]);
  });

  it('an undo after a completion gives back the server\'s numbers', () => {
    const shown = project(server, [completeEvent(core.id), undoEvent(core.id)]);
    expect(shown.character).toEqual(server.character);
    expect(shown.today!.quests.find((q) => q.id === core.id)!.completedAt).toBeNull();
  });

  it('undoing a quest the server already counted takes its XP off', () => {
    const shown = project(server, [undoEvent(side1.id)]);
    expect(shown.character.totalXp).toBe(server.character.totalXp - xpOf(side1));
  });

  it('a rating needs a cleared quest', () => {
    expect(project(server, [rateEvent(core.id, 'too_hard')]).today!.quests.find((q) => q.id === core.id)!.rating).toBeNull();
    expect(project(server, [rateEvent(side1.id, 'too_hard')]).today!.quests.find((q) => q.id === side1.id)!.rating).toBe('too_hard');
  });

  it('an event for a quest that is not today\'s changes nothing and is not marked', () => {
    const shown = project(server, [completeEvent(999_999)]);
    expect(shown.character).toEqual(server.character);
    expect(shown.waiting.size).toBe(0);
  });

  it('never touches the streak, the recent days or the profile', () => {
    const shown = project(server, [completeEvent(core.id)]);
    expect(shown.character.streak).toEqual(server.character.streak);
    expect(shown.recentDays).toBe(server.recentDays);
    expect(shown.profile).toBe(server.profile);
  });

  it('works on a state without a day', () => {
    const none = { ...server, today: null };
    expect(project(none, [completeEvent(core.id)]).today).toBeNull();
  });
});
