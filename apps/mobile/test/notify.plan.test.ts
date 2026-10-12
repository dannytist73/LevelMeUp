/** @jest-environment node */
import { NOTE_LINES, SHADOW_LINES, authoredTemplate } from '@levelmeup/content';
import { elapsedMs } from '@levelmeup/rules';
import { timerTargetMs } from '../../../supabase/functions/_shared/events.ts';
import { project } from '../src/game/project.ts';
import { planInput, planNotes, shadowClock } from '../src/notify/plan.ts';
import type { PlanInput } from '../src/notify/plan.ts';
import { DEFAULT_NOTIFY, readNotify } from '../src/notify/settings.ts';
import { claimedState, serverState } from './support/fixtures.ts';

const HOUR = 3_600_000;
const MINUTE = 60_000;
/** Day 2 in Manila (UTC+8, no DST): 04:00 on 11 Oct to 04:00 on 12 Oct. */
const DAY = { startsAt: Date.UTC(2026, 9, 10, 20), endsAt: Date.UTC(2026, 9, 11, 20), timeZone: 'Asia/Manila' };
const NOW = DAY.startsAt + HOUR; // 05:00
/** The player turned one on in Settings → Notifications (review item 2): what every test but one assumes. */
const OPTED = { ...DEFAULT_NOTIFY, optedIn: true };
const BASE: PlanInput = {
  settings: OPTED,
  voice: 'mentor',
  nowMs: NOW,
  boundaryMinutes: 4 * 60,
  today: { dayNumber: 2, window: DAY, restDay: false, settled: false },
  restTomorrow: false,
  shadowEvening: false,
  timers: [],
};
const BRIEFING = { ...OPTED, briefing: { on: true, minutes: 7 * 60 + 30 } };
const EVENING = { ...OPTED, evening: { on: true, minutes: 20 * 60 } };
const ids = (input: PlanInput) => planNotes(input).map((n) => n.id);

describe('the notification planner (M7d decision 4)', () => {
  it('plans nothing until a reminder is on', () => {
    expect(planNotes(BASE)).toEqual([]);
  });

  it('plans nothing before the player turned one on, even where the phone allows them from install (Android 12 and older)', () => {
    const timers = [{ questId: 201, title: 'Walk', doneAt: NOW + 10 * MINUTE }];
    expect(planNotes({ ...BASE, settings: DEFAULT_NOTIFY, shadowEvening: true, timers })).toEqual([]);
    expect(planNotes({ ...BASE, shadowEvening: true, timers }).map((n) => n.id)).toEqual(['timer:201', 'shadow:2']);
  });

  it('plans a briefing for the running quest day and the next six, at the time picked, in the voice', () => {
    const notes = planNotes({ ...BASE, settings: BRIEFING });
    expect(notes.map((n) => n.id)).toEqual(['briefing:2', 'briefing:3', 'briefing:4', 'briefing:5', 'briefing:6', 'briefing:7', 'briefing:8']);
    expect(notes[0]).toEqual({
      id: 'briefing:2', kind: 'briefing', at: Date.UTC(2026, 9, 10, 23, 30), title: 'Day 2 · Morning briefing',
      body: NOTE_LINES.mentor.briefing[1], url: '/', channel: 'reminders',
    });
    expect(notes[1]!.at - notes[0]!.at).toBe(24 * HOUR);
  });

  it('drops what is already due', () => {
    expect(ids({ ...BASE, settings: BRIEFING, nowMs: Date.UTC(2026, 9, 11, 0) })[0]).toBe('briefing:3');
  });

  it("drops today's briefing once the core quest is cleared, and only today's", () => {
    const cleared = { ...BASE, settings: BRIEFING, today: { ...BASE.today, settled: true } };
    expect(ids(cleared)[0]).toBe('briefing:3');
    expect(ids(cleared)).toHaveLength(6);
  });

  it('says when the day is a planned rest day: today, or tomorrow planned ahead', () => {
    const today = planNotes({ ...BASE, settings: BRIEFING, today: { ...BASE.today, restDay: true } });
    expect(today[0]).toMatchObject({ title: 'Day 2 · Rest day', body: NOTE_LINES.mentor.rest });
    expect(today[1]!.title).toBe('Day 3 · Morning briefing');
    const tomorrow = planNotes({ ...BASE, settings: BRIEFING, restTomorrow: true });
    expect(tomorrow.map((n) => n.title).slice(0, 3)).toEqual(['Day 2 · Morning briefing', 'Day 3 · Rest day', 'Day 4 · Morning briefing']);
  });

  it('reminds in the evening only today and tomorrow, never on a rest day, not once the core quest is cleared', () => {
    expect(planNotes({ ...BASE, settings: EVENING }).map((n) => [n.id, n.at])).toEqual([
      ['evening:2', Date.UTC(2026, 9, 11, 12)],
      ['evening:3', Date.UTC(2026, 9, 12, 12)],
    ]);
    expect(ids({ ...BASE, settings: EVENING, today: { ...BASE.today, restDay: true } })).toEqual(['evening:3']);
    expect(ids({ ...BASE, settings: EVENING, restTomorrow: true })).toEqual(['evening:2']);
    expect(ids({ ...BASE, settings: EVENING, today: { ...BASE.today, settled: true } })).toEqual(['evening:3']);
  });

  it("brings the Shadow's reminder an hour after the evening time, even with the evening reminder off", () => {
    const notes = planNotes({ ...BASE, shadowEvening: true });
    expect(notes).toEqual([{
      id: 'shadow:2', kind: 'shadow', at: Date.UTC(2026, 9, 11, 13), title: 'The Shadow',
      body: SHADOW_LINES.evening[1], url: '/', channel: 'reminders',
    }]);
  });

  it("never brings the Shadow's reminder later than 30 minutes before the day ends", () => {
    const late = { ...OPTED, evening: { on: false, minutes: 3 * 60 + 30 } }; // 03:30, the day ends at 04:00
    expect(planNotes({ ...BASE, settings: late, shadowEvening: true })[0]!.at).toBe(DAY.endsAt - 30 * MINUTE);
  });

  it("never brings the Shadow's reminder before the evening time (an evening time in the day's last half hour)", () => {
    const last = { ...OPTED, evening: { on: true, minutes: 3 * 60 + 45 } }; // 03:45, the day ends at 04:00
    const notes = planNotes({ ...BASE, settings: last, shadowEvening: true });
    expect(notes.filter((n) => n.id.endsWith(':2')).map((n) => [n.id, n.at])).toEqual([
      ['evening:2', DAY.endsAt - 15 * MINUTE],
      ['shadow:2', DAY.endsAt - 15 * MINUTE],
    ]);
  });

  it("names the Shadow's reminder as a clock time for Settings, by the same rule", () => {
    expect(shadowClock(20 * 60, 4 * 60)).toBe(21 * 60);
    expect(shadowClock(23 * 60, 0)).toBe(23 * 60 + 30); // capped 30 minutes before a midnight day end
    expect(shadowClock(23 * 60 + 45, 0)).toBe(23 * 60 + 45); // never before the evening time
    expect(shadowClock(3 * 60, 4 * 60)).toBe(3 * 60 + 30);
    expect(shadowClock(23 * 60 + 30, 4 * 60)).toBe(30); // past midnight, inside the day
  });

  it('alerts when a running timer reaches its time; a quest built offline opens Today', () => {
    const timers = [
      { questId: 201, title: 'Walk', doneAt: NOW + 10 * MINUTE },
      { questId: -3, title: 'Stretch', doneAt: NOW + 5 * MINUTE },
      { questId: 202, title: 'Past', doneAt: NOW - MINUTE },
    ];
    expect(planNotes({ ...BASE, timers })).toEqual([
      { id: 'timer:-3', kind: 'timer', at: NOW + 5 * MINUTE, title: 'Stretch', body: NOTE_LINES.mentor.timer, url: '/', channel: 'timers' },
      { id: 'timer:201', kind: 'timer', at: NOW + 10 * MINUTE, title: 'Walk', body: NOTE_LINES.mentor.timer, url: '/quest/201', channel: 'timers' },
    ]);
    expect(planNotes({ ...BASE, timers, settings: { ...OPTED, timers: false } })).toEqual([]);
  });

  it('lists them in time order', () => {
    const notes = planNotes({ ...BASE, settings: { ...BRIEFING, evening: EVENING.evening }, shadowEvening: true, timers: [{ questId: 1, title: 'T', doneAt: NOW + HOUR }] });
    expect(notes.map((n) => n.at)).toEqual([...notes.map((n) => n.at)].sort((a, b) => a - b));
    expect(notes.slice(0, 4).map((n) => n.id)).toEqual(['timer:1', 'briefing:2', 'evening:2', 'shadow:2']);
  });

  it('keeps the local time across a daylight-saving change (New York, 1 Nov 2026)', () => {
    // 04:00 EDT on 31 Oct to 04:00 EST on 1 Nov: a 25-hour day.
    const day = { startsAt: Date.UTC(2026, 9, 31, 8), endsAt: Date.UTC(2026, 10, 1, 9), timeZone: 'America/New_York' };
    const notes = planNotes({ ...BASE, settings: BRIEFING, nowMs: day.startsAt, today: { ...BASE.today, window: day } });
    expect(notes[0]!.at).toBe(Date.UTC(2026, 9, 31, 11, 30)); // 07:30 EDT
    expect(notes[1]!.at).toBe(Date.UTC(2026, 10, 1, 12, 30)); // 07:30 EST
  });
});

describe("the planner's input from the phone's view", () => {
  it('reads the day, its core quest and a rest planned for tomorrow', () => {
    const view = project(serverState(['core'], { rest_day: 2 }), []);
    const input = planInput(view, {}, BRIEFING, Date.parse(view.today!.startsAt!) + HOUR)!;
    expect(input.today).toEqual({
      dayNumber: 1, restDay: false, settled: true,
      window: { startsAt: Date.parse(view.today!.startsAt!), endsAt: Date.parse(view.today!.endsAt!), timeZone: view.today!.timeZone },
    });
    expect(input).toMatchObject({ voice: view.profile.voice, boundaryMinutes: view.profile.boundaryMinutes, restTomorrow: true, shadowEvening: false });
  });

  it("turns the running timers of open quests into their end times, in the quest's words", () => {
    const view = project(serverState(), []);
    const now = Date.parse(view.today!.startsAt!) + HOUR;
    const quest = view.today!.quests.find((q) => q.slot === 'side1')!;
    const timer = { segments: [{ start: now - 60_000, end: now - 30_000 }], runningSince: now - 10_000 };
    const paused = { segments: [{ start: now - 60_000, end: now - 30_000 }], runningSince: null };
    const core = view.today!.quests.find((q) => q.slot === 'core')!;
    const input = planInput(view, { [quest.id]: timer, [core.id]: paused }, BRIEFING, now)!;
    expect(input.timers).toEqual([{
      questId: quest.id,
      title: authoredTemplate(quest.templateId).voice[view.profile.voice].title,
      doneAt: timer.runningSince + timerTargetMs(quest) - elapsedMs(timer.segments),
    }]);
  });

  it("holds the Shadow's reminder while level 2's Trial holds the day and its recovery quest is open", () => {
    const at = (state: ReturnType<typeof claimedState>) => {
      const view = project(state, []);
      return planInput(view, {}, DEFAULT_NOTIFY, Date.parse(view.today!.startsAt!) + HOUR)!.shadowEvening;
    };
    expect(at(claimedState('trial'))).toBe(true);
    expect(at(claimedState('shadow'))).toBe(false);
    expect(at(claimedState('paused'))).toBe(false);
    expect(at(claimedState('trial', {}, ['recovery']))).toBe(false);
  });

  it('names only a planned rest as a rest day; a day rested for pain or without quests asks nothing more', () => {
    const view = project(serverState(), []);
    const at = (protection: 'planned_rest' | 'pain' | 'no_quests') =>
      planInput({ ...view, today: { ...view.today!, protection } as typeof view.today }, {}, BRIEFING, 0)!.today;
    expect(at('planned_rest')).toMatchObject({ restDay: true, settled: false });
    expect(at('pain')).toMatchObject({ restDay: false, settled: true });
    expect(at('no_quests')).toMatchObject({ restDay: false, settled: true });
  });

  it("drops a timer that would end after the quest day: the server counts no time past it, so it can't be claimed", () => {
    const view = project(serverState(), []);
    const endsAt = Date.parse(view.today!.endsAt!);
    const quest = view.today!.quests.find((q) => q.slot === 'side1')!;
    const target = timerTargetMs(quest);
    const late = { segments: [], runningSince: endsAt - target + 60_000 }; // would end a minute after the day
    const inTime = { segments: [], runningSince: endsAt - target - 60_000 };
    expect(planInput(view, { [quest.id]: late }, BRIEFING, endsAt - target + 120_000)!.timers).toEqual([]);
    expect(planInput(view, { [quest.id]: inTime }, BRIEFING, endsAt - target)!.timers.map((t) => t.doneAt)).toEqual([endsAt - 60_000]);
  });

  it('has nothing to plan without a day', () => {
    const view = project(serverState(), []);
    expect(planInput({ ...view, today: null }, {}, BRIEFING, 0)).toBeNull();
  });
});

describe('the kept settings', () => {
  it('fall back to the defaults for anything unreadable', () => {
    expect(readNotify(null)).toEqual(DEFAULT_NOTIFY);
    expect(readNotify('not json')).toEqual(DEFAULT_NOTIFY);
    expect(readNotify(JSON.stringify({ briefing: { on: true, minutes: 9999 }, evening: 'x', timers: 'yes', optedIn: 1 }))).toEqual({
      ...DEFAULT_NOTIFY, briefing: { on: true, minutes: DEFAULT_NOTIFY.briefing.minutes },
    });
    expect(readNotify(JSON.stringify(BRIEFING))).toEqual(BRIEFING);
    expect(DEFAULT_NOTIFY.optedIn).toBe(false);
  });
});
