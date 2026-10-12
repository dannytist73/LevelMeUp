import { carriedTimers, findQuest, offlineToday, withRef } from '../src/game/offline.ts';
import { project } from '../src/game/project.ts';
import { adjustState, offlineEvent, serverState } from './support/fixtures.ts';

const DAY2 = adjustState(); // the server's day 2: ids 200 to 203
const OFFLINE = project(serverState(), [offlineEvent()]); // day 1 from the server, then this phone's day 2
const RUNNING = { segments: [{ start: 1_000, end: 2_000 }], runningSince: null };

describe('an offline day as the screens show it (M6e)', () => {
  it('has the quests as the server would store them, ids −1 to −4, and nothing to swap or offer', () => {
    const today = offlineToday(offlineEvent());
    expect(today.quests.map((q) => q.id)).toEqual([-1, -2, -3, -4]);
    const strip = ({ id: _i, swaps: _s, gentle: _g, canStepDown: _c, ...rest }: (typeof today.quests)[number]) => rest;
    expect(today.quests.map(strip)).toEqual(DAY2.today!.quests.map(strip));
    expect(today).toMatchObject({ dayNumber: 2, swapsLeft: 0, restAllowed: false, abilities: [], hardDay: false, protection: null });
  });

  it("finds a quest by id, and an offline id by its slot once the server's day replaced it", () => {
    expect(findQuest(OFFLINE.today, -2)?.slot).toBe('side1');
    expect(findQuest(DAY2.today, -1)?.id).toBe(200);
    expect(findQuest(DAY2.today, 201)?.slot).toBe('side1');
    expect(findQuest(DAY2.today, -9)).toBeNull();
    expect(findQuest(null, 200)).toBeNull();
  });

  it('names a quest of the offline day by day and slot; anything else is sent as it is', () => {
    const complete = { type: 'complete' as const, instanceId: -1, completedAt: 5, rating: null, payload: {} };
    expect(withRef(complete, OFFLINE)).toEqual({ ...complete, instanceId: null, ref: { dayNumber: 2, slot: 'core', templateId: 'push-1' } });
    expect(withRef({ type: 'pain', instanceId: -2, choice: 'rest' }, OFFLINE)).toMatchObject({ instanceId: null, ref: { slot: 'side1' } });
    expect(withRef({ ...complete, instanceId: 200 }, project(DAY2, []))).toEqual({ ...complete, instanceId: 200 });
    // The server's day arrived while the quest screen was open (review): the quest now in that slot, by its id.
    expect(withRef(complete, project(DAY2, []))).toEqual({ ...complete, instanceId: 200 });
    expect(withRef({ type: 'resume', ladderId: 'push' }, OFFLINE)).toEqual({ type: 'resume', ladderId: 'push' });
  });

  it("moves a timer from an offline quest to the server's quest in its slot, with the same template only", () => {
    const after = project(DAY2, []);
    expect(carriedTimers({ [-1]: RUNNING, 7: RUNNING }, OFFLINE, after)).toEqual({ 200: RUNNING, 7: RUNNING });
    const otherCore = { ...after, today: { ...after.today!, quests: after.today!.quests.map((q) => (q.slot === 'core' ? { ...q, templateId: 'walk-0' } : q)) } };
    expect(carriedTimers({ [-1]: RUNNING }, OFFLINE, otherCore)).toEqual({});
    expect(carriedTimers({ 7: RUNNING }, OFFLINE, after)).toBeNull();
    expect(carriedTimers({ [-1]: RUNNING }, after, after)).toBeNull();
  });
});
