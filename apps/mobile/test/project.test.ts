import { LIBRARY } from '@levelmeup/content';
import { STATS, newLadder, questReward, templateById } from '@levelmeup/rules';
import type { XpByStat } from '@levelmeup/rules';
import { characterView } from '../../../supabase/functions/_shared/state.ts';
import { addStatXp, project } from '../src/game/project.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import {
  adjustState, characterRow, completeEvent, ladderRows, offlineEvent, profileRow, rateEvent, serverState, undoEvent, workoutState,
} from './support/fixtures.ts';

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
    const flags = { waiting: undefined, changingClass: undefined, changingBook: undefined, offline: undefined };
    expect({ ...shown, ...flags }).toEqual({ ...server, ...flags });
    expect(shown.waiting.size).toBe(0);
    expect(shown.changingClass).toBe(false);
    expect(shown.changingBook).toBe(false);
    expect(shown.offline).toBe(false);
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

let n = 0;
const ev = (event: object): PhoneEvent => ({ id: `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`, ...event }) as PhoneEvent;
const questOf = (s: ServerState, id: number) => s.today!.quests.find((q) => q.id === id)!;

describe('adjustments show at once (M6b)', () => {
  it('a training change shows in the profile at once, and the open workout waits for the server (M6c)', () => {
    const server = workoutState();
    const shown = project(server, [{ id: 'e1', type: 'training', equipment: ['gym'], programStyle: 'men' }]);
    expect(shown.profile).toMatchObject({ equipment: ['gym'], programStyle: 'men' });
    expect(shown.waiting.has(200)).toBe(true);
    expect(shown.waiting.has(201)).toBe(false);
  });

  it('a swap puts the offered quest in its slot and counts the swap; an option not offered changes nothing', () => {
    const server = adjustState();
    const option = questOf(server, 200).swaps[0]!;
    const shown = project(server, [ev({ type: 'swap', instanceId: 200, templateId: option.templateId })]);
    expect(questOf(shown, 200)).toMatchObject({ templateId: option.templateId, xp: option.xp, swaps: [], gentle: null });
    expect(shown.today!.swapsLeft).toBe(0);
    expect(shown.waiting.has(200)).toBe(true);
    expect(questOf(project(server, [ev({ type: 'swap', instanceId: 200, templateId: 'push-5' })]), 200).templateId).toBe('push-1');
  });

  it('a hard day turns the open core and side quests, and their options, into hard-day versions', () => {
    const shown = project(adjustState(), [ev({ type: 'hard_day', dayId: 2 })]);
    const push = templateById(LIBRARY, 'push-1');
    expect(shown.today!.hardDay).toBe(true);
    expect(questOf(shown, 200)).toMatchObject({ hardDay: true, minutes: push.hardDay.minutes, xp: questReward(push, true) });
    expect(questOf(shown, 200).swaps.every((o) => o.hardDay)).toBe(true);
    expect(questOf(shown, 203).hardDay).toBe(false); // the article keeps its reward
  });

  it('rest and pain protect the day; pain rests the exercise; gentle movement takes its slot', () => {
    const server = adjustState();
    expect(project(server, [ev({ type: 'plan_rest', dayId: 2 })]).today!.protection).toBe('planned_rest');
    const gentle = project(server, [ev({ type: 'pain', instanceId: 200, choice: 'gentle' })]);
    expect(questOf(gentle, 200).templateId).toBe(questOf(server, 200).gentle!.templateId);
    expect(gentle.paused).toEqual(['push']);
    expect(project(server, [ev({ type: 'pain', instanceId: 200, choice: 'rest' })]).today!.protection).toBe('pain');
  });

  it('resume, step down, a class change and Stillness', () => {
    const resting = adjustState({ ladders: ladderRows({ push: { ...newLadder(1), paused: true } }) });
    expect(project(resting, [ev({ type: 'resume', ladderId: 'push' })]).paused).toEqual([]);
    expect(questOf(project(adjustState(), [ev({ type: 'step_down', instanceId: 200 })]), 200).canStepDown).toBe(false);
    const changed = project(adjustState(), [ev({ type: 'class_change', classId: 'monk' })]);
    expect(changed).toMatchObject({ profile: { classId: 'monk' }, changingClass: true });
    const monk = adjustState({ profile: profileRow(undefined, { class_id: 'monk' }), character: characterRow({ xp_vitality: 240 }) });
    const still = project(monk, [ev({ type: 'ability', dayId: 2, ability: 'stillness' })]);
    expect(questOf(still, 200).templateId).toBe('stillness');
    expect(still.today!.abilities).toEqual([]);
    // After a hard day still on its way, the ability's quest is its hard-day version, as the server drafts it (review).
    const hardStill = project(monk, [ev({ type: 'hard_day', dayId: 2 }), ev({ type: 'ability', dayId: 2, ability: 'stillness' })]);
    expect(questOf(hardStill, 200)).toMatchObject({ templateId: 'stillness', hardDay: true });
  });
});

describe("the Scholar's Path book on the phone (M6d)", () => {
  const book = (title: string | null, finished = false): PhoneEvent => ({ id: 'b1', type: 'book', title, finished });

  it("shows the new book at once on the profile and on today's open reading quests, marked \"will sync\"", () => {
    const server = adjustState(); // side2 is reading-0, id 202
    const shown = project(server, [book('Dune')]);
    expect(shown.profile.book).toBe('Dune');
    expect(shown.profile.bookStartedAt).toBeNull();
    expect(shown.reading).toEqual({ sessions: 0, minutes: 0 });
    expect(shown.today!.quests.find((q) => q.id === 202)!.book).toBe('Dune');
    expect(shown.waiting.has(202)).toBe(true);
    expect(shown.changingBook).toBe(true);
    expect(shown.today!.quests.find((q) => q.id === 200)!.book).toBeNull(); // push-1 doesn't track a book
  });

  it('finishing or setting aside clears it', () => {
    const server = adjustState();
    const shown = project({ ...server, profile: { ...server.profile, book: 'Dune' } }, [book(null, true)]);
    expect(shown.profile.book).toBeNull();
    expect(shown.reading).toBeNull();
  });
});

describe('a day this phone built offline (M6e)', () => {
  const event = offlineEvent();
  const ref = { dayNumber: 2, slot: 'core' as const, templateId: 'push-1' };
  const complete = { id: '00000000-0000-4000-8000-0000000000e2', type: 'complete' as const, instanceId: null, ref, completedAt: event.builtAt + 60_000, rating: null, payload: {} };

  it("is today until the server's state has that day", () => {
    const shown = project(serverState(), [event]);
    expect(shown.offline).toBe(true);
    expect(shown.today).toMatchObject({ dayNumber: 2, swapsLeft: 0, abilities: [] });
    expect(shown.today!.quests.map((q) => q.id)).toEqual([-1, -2, -3, -4]);
    const synced = project(adjustState(), [event]);
    expect(synced.offline).toBe(false);
    expect(synced.today!.quests[0]!.id).toBe(200);
  });

  it('completions, undos and ratings named by day and slot apply to its quests', () => {
    const before = serverState();
    const shown = project(before, [event, complete]);
    const core = shown.today!.quests[0]!;
    expect(core.completedAt).not.toBeNull();
    expect(shown.waiting.has(-1)).toBe(true);
    const gained = Object.values(core.xp).reduce((sum, xp) => sum + (xp ?? 0), 0);
    expect(shown.character.totalXp).toBe(before.character.totalXp + gained);
    const undone = project(before, [event, complete, { id: '00000000-0000-4000-8000-0000000000e3', type: 'undo', instanceId: null, ref }]);
    expect(undone.today!.quests[0]!.completedAt).toBeNull();
  });

  it("an event named by day and slot still finds its quest once the server's day replaced the offline one", () => {
    const shown = project(adjustState(), [complete]);
    expect(shown.today!.quests.find((q) => q.id === 200)!.completedAt).not.toBeNull();
    expect(project(adjustState(), [{ ...complete, ref: { ...ref, dayNumber: 3 } }]).today!.quests[0]!.completedAt).toBeNull();
  });
});
