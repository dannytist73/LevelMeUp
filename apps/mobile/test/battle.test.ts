// Monster Week: the battle as the screens show it (src/game/battle.ts).
import { questPower } from '@levelmeup/rules';
import { battleShown, questHit, resultKey, resultToShow } from '../src/game/battle.ts';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { completeEvent, serverState } from './support/fixtures.ts';

const powerOf = (s: ServerState, slots: readonly string[]) =>
  s.today!.quests.filter((q) => slots.includes(q.slot)).reduce((p, q) => p + questPower(q.stat, s.battle.weakness), 0);

describe('the battle on the phone (Monster Week)', () => {
  it('day 1: battle 1 against Snoozle, with the server’s power and need', () => {
    const s = serverState(['core']);
    const b = battleShown(s)!;
    expect(b).toMatchObject({ n: 1, grumble: 'snoozle', weakness: 'vitality', first: 1, last: 3, decided: false });
    expect(b.power).toBe(powerOf(s, ['core']));
    expect(b.power).toBe(s.battle.power);
    expect(b.need).toBe(s.battle.need);
  });

  it('an unsent clear charges the bar at once, and what is left to earn falls', () => {
    const s = serverState([]);
    const before = battleShown(s)!;
    const core = s.today!.quests.find((q) => q.slot === 'core')!;
    const after = battleShown(project(s, [completeEvent(core.id)]))!;
    expect(after.power).toBe(before.power + questPower(core.stat, 'vitality'));
    expect(after.more).toBe(before.more - questPower(core.stat, 'vitality'));
    expect(before.more).toBe(powerOf(s, s.today!.quests.map((q) => q.slot)));
  });

  it('a rest day today lowers the need at once', () => {
    const s = serverState([]);
    const rest = { ...s, today: { ...s.today!, protection: 'planned_rest' as const } };
    expect(battleShown(rest)!.need).toBe(battleShown(s)!.need - Math.min(3, s.today!.quests.length));
    expect(battleShown(rest)!.days[0]!.state).toBe('rest');
  });

  it("a day built offline past the battle's last day says the result comes with the next sync", () => {
    const s = serverState([]);
    const later = { ...s, today: { ...s.today!, dayNumber: 4 } };
    expect(battleShown(later)).toMatchObject({ decided: true, more: 0 });
  });

  it('a state from a server before Monster Week shows no battle', () => {
    const { battle: _b, ...old } = serverState([]);
    expect(battleShown(old as unknown as ServerState)).toBeNull();
    expect(resultToShow({ camp: undefined as unknown as ServerState['camp'] }, [])).toBeNull();
  });

  it("a quest's hit: 2 on the weakness, else 1", () => {
    expect(questHit({ stat: 'vitality' }, 'vitality')).toEqual({ n: 2, weak: true });
    expect(questHit({ stat: 'focus' }, 'vitality')).toEqual({ n: 1, weak: false });
  });

  it('shows a decided battle once, and again if a lost one later becomes won', () => {
    const lost = { n: 1, grumble: 'snoozle', won: false, power: 5, need: 8, rematch: 0, byStat: {} };
    const camp = { wins: {}, last: lost };
    expect(resultToShow({ camp }, [])).toBe(lost);
    expect(resultToShow({ camp }, [resultKey(lost)])).toBeNull();
    const won = { ...lost, won: true, power: 8 };
    expect(resultToShow({ camp: { wins: { snoozle: 1 }, last: won } }, [resultKey(lost)])).toBe(won);
    expect(resultKey(won)).toBe('battle:1:won');
  });
});
