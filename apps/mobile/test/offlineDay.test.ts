import { CONTENT_VERSION, LIBRARY } from '@levelmeup/content';
import { LIGHT_DAY_MINUTES, STATS, findTemplate, newLadder, painKey, recordPain, templateById, useKey } from '@levelmeup/rules';
import { planAdvance } from '../../../supabase/functions/_shared/advance.ts';
import { stateView } from '../../../supabase/functions/_shared/state.ts';
import { dayOffers } from '../../../supabase/functions/_shared/today.ts';
import {
  DAY1, DAY_TWO_SLOTS, afterDay1, characterRow, dayTwoSnapshot, historyOf, ladderRows,
} from '../../../supabase/tests/unit/fixtures.ts';
import type { CharacterRow } from '../../../supabase/functions/_shared/state.ts';
import { MAX_OFFLINE_DAYS, nextOfflineDay, offlineDay, offlineView } from '../src/game/offlineDay.ts';
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

describe('several days in a row offline (premium pass A6)', () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(900 + n).padStart(12, '0')}`;
  /** Builds each next day as the store does, once the one before has ended, `days` times. */
  const chain = (s: ServerState, days: number, done: (event: PhoneEvent) => PhoneEvent[] = () => []) => {
    const pending: PhoneEvent[] = [];
    let at = END + HOUR;
    for (let n = 0; n < days; n++) {
      const event = nextOfflineDay(s, pending, at, 'Asia/Manila');
      if (event === null) break;
      const queued = { ...event, id: id(n) } as PhoneEvent;
      pending.push(queued, ...done(queued));
      at = event.window.endsAt + HOUR;
    }
    return pending;
  };
  const days = (pending: readonly PhoneEvent[]) => pending.flatMap((e) => (e.type === 'provisional_day' ? [e] : []));

  it('builds the first day as before, then the next one once that has ended', () => {
    const s = serverState();
    const first = nextOfflineDay(s, [], END + HOUR, 'Asia/Manila')!;
    expect(first).toEqual(offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila'));
    const pending = [{ ...first, id: id(0) } as PhoneEvent];
    expect(nextOfflineDay(s, pending, first.window.endsAt - 1, 'Asia/Manila')).toBeNull(); // the day on screen still runs
    const second = nextOfflineDay(s, pending, first.window.endsAt + HOUR, 'Asia/Manila')!;
    expect(second.dayNumber).toBe(first.dayNumber + 1);
    expect(second.window.startsAt).toBe(first.window.endsAt);
    expect(second.articleId).toBeNull(); // only the server's next day has an article named
    expect(second.quests.length).toBeGreaterThan(0);
  });

  it('stops at the late window: completions past it would reach the System too late to count', () => {
    const built = days(chain(serverState(), MAX_OFFLINE_DAYS + 3));
    expect(built).toHaveLength(MAX_OFFLINE_DAYS);
    expect(built.map((d) => d.dayNumber)).toEqual(Array.from({ length: MAX_OFFLINE_DAYS }, (_, n) => 2 + n));
  });

  it('builds the same days from the same state and clock, each close starting from the last', () => {
    const s = serverState();
    const plain = chain(s, 2);
    const again = chain(s, 2);
    expect(days(again)).toEqual(days(plain)); // the same state and clock build the same days
  });

  it('a check-in answer on its way waits, as for the first day', () => {
    const s = serverState();
    const first = nextOfflineDay(s, [], END + HOUR, 'Asia/Manila')!;
    const sick: PhoneEvent = { id: '00000000-0000-4000-8000-0000000000c1', type: 'checkin', checkinId: 7, answer: 'sick', secondWind: false };
    const pending = [{ ...first, id: id(0) } as PhoneEvent];
    expect(nextOfflineDay(s, [...pending, sick], first.window.endsAt + HOUR, 'Asia/Manila'))
      .toEqual(nextOfflineDay(s, pending, first.window.endsAt + HOUR, 'Asia/Manila'));
  });
});

describe("the offline day's reading (M8b decision 4)", () => {
  it("puts the next day's article on the offline day, and shows it there", () => {
    const next = { id: 'article-4', cluster: 'sleep' as const, title: 'Four', minutes: 6 };
    const server: ServerState = { ...serverState(), nextArticle: next };
    const event = offlineDay(server, project(server, []), END + HOUR, 'Asia/Manila')!;
    expect(event.articleId).toBe('article-4');
    expect(project(server, [{ ...event, id: '00000000-0000-4000-8000-000000000999' } as PhoneEvent]).today!.article).toEqual(next);
    // Its takeaway shows at once, as on a day from the server (review).
    const shown = project(server, [{ ...event, id: '00000000-0000-4000-8000-000000000999' } as PhoneEvent]);
    const reading = shown.today!.quests.find((q) => q.slot === 'article')!;
    const claimed = project(server, [
      { ...event, id: '00000000-0000-4000-8000-000000000999' } as PhoneEvent,
      { id: '00000000-0000-4000-8000-000000000998', type: 'complete', instanceId: null, ref: { dayNumber: 2, slot: 'article', templateId: reading.templateId },
        completedAt: END + 2 * HOUR, rating: null, payload: { text: 'Kept.' } } as PhoneEvent,
    ]);
    expect(claimed.readings[0]).toMatchObject({ id: 'article-4', dayNumber: 2, takeaway: 'Kept.' });
    const none: ServerState = { ...server, nextArticle: null };
    expect(offlineDay(none, project(none, []), END + HOUR, 'Asia/Manila')!.articleId).toBeNull();
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
