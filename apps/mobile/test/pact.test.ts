import { PACT_TEXT } from '@levelmeup/content';
import { asLevel, marked, pactName, pactStartsNext, sealedQuest, shadowDue, shadowHold } from '../src/game/pact.ts';
import { project } from '../src/game/project.ts';
import { DAY_TWO_NOW, adjustState, claimedState } from './support/fixtures.ts';

describe('the pact on the phone (M7c)', () => {
  it('names the level; anything unknown is off', () => {
    expect(pactName(1)).toBe(PACT_TEXT.names[1]);
    expect(asLevel(5)).toBe(0);
  });

  it('starts with the next quest day: while today began before the signing, or while a raise is on its way', () => {
    const view = project(adjustState(), []);
    expect(pactStartsNext(view)).toBe(false); // off
    const at = (ms: number | null) => ({ ...view, profile: { ...view.profile, accountabilityLevel: 1, accountabilityFrom: ms === null ? null : new Date(ms).toISOString() } });
    expect(pactStartsNext(at(DAY_TWO_NOW))).toBe(true);
    expect(pactStartsNext(at(Date.parse(view.today!.startsAt!) - 3_600_000))).toBe(false);
    expect(pactStartsNext(at(null))).toBe(true);
  });

  it("holds today after \"I just didn't\" under a pact: the mark until the recovery quest is cleared", () => {
    const hold = shadowHold(project(claimedState('shadow'), []), DAY_TWO_NOW)!;
    expect(hold).toMatchObject({ checkinId: 7, kind: 'shadow', cleared: false, sealed: false, note: null });
    expect(hold.recovery?.id).toBe(204);
    expect(marked(hold)).toBe(true);
    const cleared = shadowHold(project(claimedState('shadow', {}, ['recovery']), []), DAY_TWO_NOW)!;
    expect(cleared.cleared).toBe(true);
    expect(marked(cleared)).toBe(false);
  });

  it('nothing without a consequence, once its day has ended, or on another day', () => {
    expect(shadowHold(project(claimedState(null), []), DAY_TWO_NOW)).toBeNull();
    const view = project(claimedState('shadow'), []);
    expect(shadowHold(view, Date.parse(view.today!.endsAt!))).toBeNull();
    expect(shadowHold({ ...view, checkin: { ...view.checkin!, recoveryDayId: 1 } }, DAY_TWO_NOW)).toBeNull();
  });

  it('level 2 seals the open side quests until the focus session; never the core, the recovery quest or the reading', () => {
    const view = project(claimedState('trial', {}, ['side2']), []);
    const hold = shadowHold(view, DAY_TWO_NOW)!;
    expect(hold.sealed).toBe(true);
    expect(view.today!.quests.filter((q) => sealedQuest(hold, q)).map((q) => q.slot)).toEqual(['side1']); // side2 was cleared first
    const done = shadowHold(project(claimedState('trial', { trial_done_at: new Date(DAY_TWO_NOW) }), []), DAY_TWO_NOW)!;
    expect(done.sealed).toBe(false);
  });

  it('paused: the scene once (the Shadow steps back), no mark, no seal', () => {
    const hold = shadowHold(project(claimedState('paused'), []), DAY_TWO_NOW)!;
    expect(hold.kind).toBe('paused');
    expect(marked(hold)).toBe(false);
    expect(hold.sealed).toBe(false);
  });

  it('the scene is due once per check-in', () => {
    const view = project(claimedState('shadow'), []);
    expect(shadowDue(view, null, DAY_TWO_NOW)).toBe(7);
    expect(shadowDue(view, 7, DAY_TWO_NOW)).toBeNull();
  });
});
