import { CONTENT_VERSION, LIBRARY } from '@levelmeup/content';
import { LIGHT_DAY_MINUTES, STATS, findTemplate, newLadder, painKey, recordPain, templateById, useKey } from '@levelmeup/rules';
import { planAdvance } from '../../../supabase/functions/_shared/advance.ts';
import { stateView } from '../../../supabase/functions/_shared/state.ts';
import { dayOffers } from '../../../supabase/functions/_shared/today.ts';
import {
  DAY1, DAY_TWO_SLOTS, afterDay1, characterRow, dayTwoSnapshot, historyOf, ladderRows,
} from '../../../supabase/tests/unit/fixtures.ts';
import type { CharacterRow } from '../../../supabase/functions/_shared/state.ts';
import { offlineDay, offlineView } from '../src/game/offlineDay.ts';
import { project } from '../src/game/project.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import { checkinState, completeEvent, serverState } from './support/fixtures.ts';

const END = Date.parse(DAY1.endsAt);
const HOUR = 3_600_000;
const quests = (event: { quests: readonly { slot: string; templateId: string }[] }) => event.quests.map((q) => [q.slot, q.templateId]);

describe('the day the phone builds offline (M6e decision 2)', () => {
  it('waits until the day on screen has ended', () => {
    const s = serverState();
    expect(offlineDay(s, project(s, []), END - 1, 'Asia/Manila')).toBeNull();
  });

  it('is the day the server builds from the same state (nothing done)', () => {
    const s = serverState();
    const event = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
    const server = planAdvance(afterDay1([], END + HOUR))!.newDay!;
    expect(event).toMatchObject({
      type: 'provisional_day', dayNumber: 2, builtAt: END + HOUR, timeZone: 'Asia/Manila', budget: server.budget, light: server.light,
      window: { startsAt: Date.parse(server.startsAt), endsAt: Date.parse(server.endsAt) },
    });
    expect(event.quests.map((q) => [q.slot, q.templateId, q.why])).toEqual(server.quests.map((q) => [q.slot, q.templateId, q.why]));
  });

  it('…and with the core cleared offline: its XP, the Discipline and the ladder session count as on the server', () => {
    const s = serverState();
    const core = s.today!.quests.find((q) => q.slot === 'core')!;
    const event = offlineDay(s, project(s, [completeEvent(core.id)]), END + HOUR, 'Asia/Manila')!;
    const xp: Partial<CharacterRow> = {};
    for (const stat of STATS) if (core.xp[stat] !== undefined) xp[`xp_${stat}`] = core.xp[stat];
    const server = planAdvance(afterDay1(['core'], END + HOUR, { character: characterRow(xp) }))!.newDay!;
    expect(quests(event)).toEqual(quests(server));
  });

  it('builds nothing while an offline day is shown, or from a state without the M6e fields', () => {
    const s = serverState();
    const first = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
    const shown = project(s, [{ ...first, id: '00000000-0000-4000-8000-000000000999' } as PhoneEvent]);
    expect(offlineDay(s, shown, Date.parse(shown.today!.endsAt!) + HOUR, 'Asia/Manila')).toBeNull();
    const { ladders: _ladders, ...older } = s;
    expect(offlineDay(older as ServerState, project(older as ServerState, []), END + HOUR, 'Asia/Manila')).toBeNull();
  });
});

describe('the offline day matches the server in more cases (M6e review)', () => {
  it('leaves out an exercise a pain report on its way rests, as the server will', () => {
    const s = serverState();
    const hurt = s.today!.quests.find((q) => findTemplate(LIBRARY, q.templateId)?.exercise != null)!;
    const key = painKey(templateById(LIBRARY, hurt.templateId));
    const pain: PhoneEvent = { id: '00000000-0000-4000-8000-000000000998', type: 'pain', instanceId: hurt.id, choice: 'pause' };
    const event = offlineDay(s, project(s, [pain]), END + HOUR, 'Asia/Manila')!;
    const server = planAdvance(afterDay1([], END + HOUR, { ladders: ladderRows({ [key]: recordPain(newLadder()).state }) }))!.newDay!;
    expect(quests(event)).toEqual(quests(server));
    expect(event.quests.some((q) => useKey(templateById(LIBRARY, q.templateId)) === key)).toBe(false);
  });

  it('after day 2: two days of history and ladders above the first rung', () => {
    const snapshot = dayTwoSnapshot(DAY_TWO_SLOTS, { ladders: ladderRows({ push: newLadder(1), walk: newLadder(1) }) });
    const s = stateView(snapshot, dayOffers(snapshot, LIBRARY), historyOf(snapshot));
    const end = Date.parse(s.today!.endsAt!);
    const event = offlineDay(s, project(s, []), end + HOUR, 'Asia/Manila')!;
    const server = planAdvance({
      ...snapshot, pending: snapshot.checkin, timeZone: 'Asia/Manila', nowMs: end + HOUR, library: LIBRARY, contentVersion: CONTENT_VERSION,
    })!.newDay!;
    expect(event.dayNumber).toBe(3);
    expect(quests(event)).toEqual(quests(server));
  });
});

describe('a light day after a check-in answer (M7a decision 6)', () => {
  it('is light after "sick" or "injured", as the server builds it, and not otherwise', () => {
    const s = serverState([], { next_day_light: true });
    const event = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
    const server = planAdvance(afterDay1([], END + HOUR, { character: characterRow({ next_day_light: true }) }))!.newDay!;
    expect(event).toMatchObject({ light: true, budget: LIGHT_DAY_MINUTES });
    expect(server).toMatchObject({ light: true, budget: LIGHT_DAY_MINUTES });
    expect(quests(event)).toEqual(quests(server));
    const plain = serverState();
    expect(offlineDay(plain, project(plain, []), END + HOUR, 'Asia/Manila')!.light).toBe(false);
  });
});

describe('a check-in answer still on its way (M7a review)', () => {
  it('leaves the offline day as the server will store it: the server applies the answer after the day closes', () => {
    const s = checkinState();
    const end = Date.parse(s.today!.endsAt!);
    const sick: PhoneEvent = { id: '00000000-0000-4000-8000-0000000000c1', type: 'checkin', checkinId: 7, answer: 'sick', secondWind: false };
    expect(offlineDay(s, project(s, [sick]), end + HOUR, 'Asia/Manila')!.light).toBe(true); // what the screen shows
    const event = offlineDay(s, offlineView(s, [sick]), end + HOUR, 'Asia/Manila')!;
    expect(event.light).toBe(false);
    expect(event).toEqual(offlineDay(s, project(s, []), end + HOUR, 'Asia/Manila'));
  });
});
