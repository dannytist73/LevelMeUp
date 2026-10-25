import { describe, expect, it } from 'vitest';
import { cumulativeXpForLevel, newLadder } from '../../../packages/rules/src/index.ts';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { CALENDAR_DAYS, battleDay, calendarDate, calendarMark, monsterView, stateView } from '../../functions/_shared/state.ts';
import type { BattleDayRow, CalendarRow, Snapshot } from '../../functions/_shared/state.ts';
import { dayOffers } from '../../functions/_shared/today.ts';
import { DAY1, DAY_TWO_SLOTS, HOUR, characterRow, dayTwoSnapshot, historyOf, ladderRows, manilaDay, pendingCheckin, profileRow } from './fixtures.ts';

const row = (over: Partial<CalendarRow>): CalendarRow => ({
  day_number: 3, starts_at: new Date(Date.UTC(2026, 9, 11, 22)), ends_at: new Date(Date.UTC(2026, 9, 12, 22)), time_zone: 'Asia/Manila', status: 'closed',
  resolution: 'streak_day', protection: null, hard_day: false, ...over,
});

describe('the calendar mark (M6d decision 3)', () => {
  it('names each closed day plainly, never as a miss', () => {
    expect(calendarMark(row({}))).toBe('cleared');
    expect(calendarMark(row({ hard_day: true }))).toBe('hard');
    expect(calendarMark(row({ resolution: 'protected', protection: 'planned_rest' }))).toBe('rest');
    expect(calendarMark(row({ resolution: 'protected', protection: 'pain' }))).toBe('rest');
    expect(calendarMark(row({ resolution: 'protected', protection: 'outage' }))).toBe('paused');
    expect(calendarMark(row({ resolution: 'protected', protection: 'no_quests' }))).toBe('paused');
    expect(calendarMark(row({ resolution: 'awaiting_checkin' }))).toBe('none');
    expect(calendarMark(row({ status: 'open', resolution: null }))).toBe('open');
  });

  it('dates a day by the date it mostly covers: a day 1 begun late in the evening takes the next one (review)', () => {
    // Onboarding at 23:00 in Manila on 10 Oct: day 1 runs at least 6 hours, to 04:00 on 12 Oct, and day 2 starts then.
    const day1 = row({ day_number: 1, starts_at: new Date(Date.UTC(2026, 9, 10, 15)), ends_at: new Date(Date.UTC(2026, 9, 11, 20)) });
    const day2 = row({ day_number: 2, starts_at: new Date(Date.UTC(2026, 9, 11, 20)), ends_at: new Date(Date.UTC(2026, 9, 12, 20)) });
    expect(calendarDate(day1)).toBe('2026-10-11');
    expect(calendarDate(day2)).toBe('2026-10-12');
    // Any other day: the date it starts on, in its own zone.
    expect(calendarDate(row({ time_zone: 'America/New_York' }))).toBe('2026-10-11'); // 18:00 on 11 Oct in New York
    expect(calendarDate(row({}))).toBe('2026-10-12'); // 06:00 on 12 Oct in Manila
  });

  it('keeps about three months', () => {
    expect(CALENDAR_DAYS).toBe(92);
  });
});

describe('the state for Character and Chronicle (M6d)', () => {
  it('dates each day in its own zone, newest first', () => {
    const s = dayTwoSnapshot();
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.calendar.map((d) => d.dayNumber)).toEqual([2, 1]);
    expect(view.calendar[0]).toEqual({ dayNumber: 2, date: expect.stringMatching(/^2026-10-\d\d$/), mark: 'open' });
    expect(view.calendar[1]!.mark).toBe('cleared');
  });

  it('shows growth since day 1: points gained per stat, levels, quests cleared and new rungs', () => {
    const s = dayTwoSnapshot(undefined, {
      character: characterRow({ xp_strength: 88, xp_discipline: 22, total_xp: 110, quests_cleared: 4 }),
    });
    const view = stateView(s, dayOffers(s, LIBRARY), { ...historyOf(s), newRungs: 2 });
    expect(view.growth).toEqual({
      since: expect.stringMatching(/^2026-10-\d\d$/), levels: view.character.level - 1,
      stats: { strength: 2, vitality: 0, wisdom: 0, focus: 0, discipline: 1 }, questsCleared: 4, newRungs: 2,
    });
  });

  it('carries the abilities\' last use, the book, its progress and the finished books', () => {
    const finished = [{ title: 'Meditations', startedAt: null, finishedAt: '2026-10-01T10:00:00.000Z', sessions: 9, minutes: 140 }];
    const s = dayTwoSnapshot(undefined, {
      profile: profileRow(undefined, { book: 'Dune', book_started_at: new Date(Date.UTC(2026, 9, 5)), books_finished: finished }),
      character: characterRow({ ability_last_used: { stillness: 4 } }),
    });
    const view = stateView(s, dayOffers(s, LIBRARY), { ...historyOf(s), reading: { sessions: 3, minutes: 45 } });
    expect(view.character.abilityLastUsed).toEqual({ stillness: 4 });
    expect(view.profile).toMatchObject({ book: 'Dune', bookStartedAt: '2026-10-05T00:00:00.000Z', booksFinished: finished });
    expect(view.reading).toEqual({ sessions: 3, minutes: 45 });
  });

  it('has no reading without a book, and keeps the achievements in earned order', () => {
    const s = dayTwoSnapshot(undefined, { earned: ['level-5', 'first-trial'] });
    const view = stateView(s, dayOffers(s, LIBRARY), { ...historyOf(s), reading: { sessions: 3, minutes: 45 } });
    expect(view.reading).toBeNull();
    expect(view.achievements).toEqual(['level-5', 'first-trial']);
  });
});

describe('what the phone needs to build a day offline (M6e decision 3)', () => {
  it("sends every ladder's state, each recent day's final quests, and the workouts done", () => {
    const s = dayTwoSnapshot(DAY_TWO_SLOTS, { ladders: ladderRows({ push: newLadder(1) }), workoutsDone: 3 });
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.ladders).toEqual({ push: newLadder(1) });
    expect(view.history.map((d) => d.dayNumber)).toEqual([1, 2]);
    expect(view.history[1]!.quests).toMatchObject({ core: 'push-1', side1: 'walk-1', side2: 'reading-0', article: 'article' });
    expect(view.workoutsDone).toBe(3);
  });
});

describe('the check-in in the state (M7a)', () => {
  const view = (s: Snapshot) => stateView(s, dayOffers(s, LIBRARY), historyOf(s));

  it('a pending check-in: the missed day and its date, the core quest and its ladder, no answer yet', () => {
    const date = calendarDate({ starts_at: new Date(DAY1.startsAt), ends_at: new Date(DAY1.endsAt), time_zone: 'Asia/Manila' });
    expect(view(dayTwoSnapshot(DAY_TWO_SLOTS, { checkin: pendingCheckin() })).checkin).toEqual({
      id: 7, from: 1, to: 1, gap: false, date, core: 'push-0', ladder: 'push', answer: null, secondWind: null,
      recoveryDayId: null, consequence: null, trialDone: false, note: null,
    });
  });

  it('away days: the first and the last, without a date or a quest', () => {
    const gap = pendingCheckin({
      day_id: null, gap_from: 3, gap_to: 5, missed_day: null, missed_starts_at: null, missed_ends_at: null, missed_time_zone: null,
      missed_core: null, missed_ladder: null,
    });
    expect(view(dayTwoSnapshot(DAY_TWO_SLOTS, { checkin: gap })).checkin).toMatchObject({ from: 3, to: 5, gap: true, date: null, core: null });
  });

  it("offers Second Wind to a Warrior at level 5 whose missed core quest was yesterday's (decision 7)", () => {
    const slots = { core: 'walk-1', side1: 'mobility-0', side2: 'reading-0' };
    const warrior = characterRow({ awaiting_checkin: true, xp_strength: cumulativeXpForLevel(5) });
    const s = dayTwoSnapshot(slots, { checkin: pendingCheckin(), character: warrior });
    expect(view(s).checkin!.secondWind).toMatchObject({ templateId: 'push-0', why: { code: 'second_wind' } });
    expect(view({ ...s, character: { ...warrior, ability_last_used: { second_wind: 1 } } }).checkin!.secondWind).toBeNull();
    expect(view({ ...s, checkin: pendingCheckin({ answer: 'just_didnt' }) }).checkin!.secondWind).toBeNull();
  });

  it('the lighter plan: one step down, offered after 3 paused days in 14, quiet for 14 days after an answer', () => {
    const s = dayTwoSnapshot();
    const at = new Date(s.readAt.getTime() - 3_600_000);
    const paused = { answered: [{ id: '8', answer: 'emergency' as const, answered_at: at, gap_from: 3, gap_to: 5, consequence: null, recovery_day_id: null }] };
    expect(view(s).lighterPlan).toEqual({ from: 25, to: 15, offered: false });
    expect(view({ ...s, ...paused }).lighterPlan).toEqual({ from: 25, to: 15, offered: true });
    expect(view({ ...s, ...paused, profile: profileRow(undefined, { lighter_plan_at: at }) }).lighterPlan!.offered).toBe(false);
    expect(view({ ...s, profile: profileRow(undefined, { minutes_per_day: 10 }) }).lighterPlan).toBeNull();
  });

  it('the latest settled miss travels once; the character says when tomorrow is light', () => {
    const s = dayTwoSnapshot(DAY_TWO_SLOTS, { result: { id: '9', outcome: 'shield' }, character: characterRow({ next_day_light: true }) });
    expect(view(s).checkinResult).toEqual({ id: 9, outcome: 'shield' });
    expect(view(s).character.nextDayLight).toBe(true);
  });
});

describe('the pact in the state (M7c)', () => {
  const view = (s: Snapshot) => stateView(s, dayOffers(s, LIBRARY), historyOf(s));

  it('the profile says the level and when it was signed', () => {
    const signed = new Date(manilaDay(2).startsAt + HOUR);
    const s = dayTwoSnapshot(DAY_TWO_SLOTS, { profile: profileRow(undefined, { accountability_level: 2, accountability_enabled_at: signed }) });
    expect(view(s).profile).toMatchObject({ accountabilityLevel: 2, accountabilityFrom: signed.toISOString() });
    expect(view(dayTwoSnapshot()).profile).toMatchObject({ accountabilityLevel: 0, accountabilityFrom: null });
  });

  it("\"I just didn't\" held for its recovery day: what the pact did, the Trial's session and the private note", () => {
    const held = pendingCheckin({
      answer: 'just_didnt', recovery_day_id: '2', consequence: 'trial', trial_done_at: new Date(manilaDay(2).startsAt + HOUR), note: 'A late shift.',
    });
    expect(view(dayTwoSnapshot(DAY_TWO_SLOTS, { checkin: held })).checkin).toMatchObject({
      answer: 'just_didnt', recoveryDayId: 2, consequence: 'trial', trialDone: true, note: 'A late shift.',
    });
  });
});

describe('Monster Week in the state (docs/2026-10-25-monster-week.md)', () => {
  const battleRow = (day_number: number, over: Partial<BattleDayRow> = {}): BattleDayRow => ({
    day_number, status: 'closed', protection: null, resolution: 'streak_day', quests: 4, checkin_waiting: false, checkin_protected: false,
    strength: 0, vitality: 0, wisdom: 0, focus: 0, discipline: 0, ...over,
  });

  it("day 2: battle 1 against Snoozle, charged by the cleared quests, ending when day 3 ends", () => {
    const s = dayTwoSnapshot();
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    const cleared = s.instances.filter((q) => q.completed_at !== null);
    expect(cleared.length).toBeGreaterThan(0);
    const power = cleared.reduce((p, q) => p + (q.stat === 'vitality' ? 2 : 1), 0);
    expect(view.battle).toMatchObject({ n: 1, grumble: 'snoozle', weakness: 'vitality', rematch: 0, first: 1, last: 3, power });
    expect(view.battle.days.map((d) => d.state)).toEqual(['played', 'played', 'later']);
    expect(view.battle.endsAt).toBe(new Date(manilaDay(3).endsAt).toISOString());
    expect(view.camp).toEqual({ wins: {}, last: null });
  });

  it('a protected day counts as rest, and a check-in that protected a day does too', () => {
    const rows = [battleRow(1, { vitality: 2 }), battleRow(2, { protection: 'planned_rest', resolution: 'protected' }), battleRow(3, { resolution: 'protected' })];
    const latest = dayTwoSnapshot().days[0]!;
    const mv = monsterView(rows, { ...latest, day_number: 3 }, 240);
    expect(mv.camp.last).toMatchObject({ n: 1, grumble: 'snoozle', won: true, power: 4, need: 2 });
    expect(mv.camp.wins).toEqual({ snoozle: 1 });
    expect(mv.battle).toMatchObject({ n: 2, grumble: 'scrollo' });
  });

  it('reads the day row as the battles need it', () => {
    expect(battleDay(battleRow(5, { status: 'open', resolution: null, quests: 3, focus: 2, discipline: 1 }))).toEqual({
      dayNumber: 5, closed: false, protected: false, waiting: false, quests: 3, cleared: { focus: 2, discipline: 1 },
    });
  });

  it('a missed day holds its battle until its check-in is answered; sick, injured or emergency then asks nothing of it (review)', () => {
    const latest = { ...dayTwoSnapshot().days[0]!, day_number: 4 };
    const missed = (over: Partial<BattleDayRow>) => [battleRow(1, { vitality: 2 }), battleRow(2, { vitality: 1 }), battleRow(3, { resolution: 'awaiting_checkin', ...over }), battleRow(4, { status: 'open', resolution: null })];
    const waiting = monsterView(missed({ checkin_waiting: true }), latest, 240);
    expect(waiting.camp.last).toBeNull();
    expect(waiting.battle).toMatchObject({ n: 1, waiting: true });
    const sick = monsterView(missed({ checkin_protected: true }), latest, 240);
    expect(sick.camp.last).toMatchObject({ n: 1, won: true, need: 5 });
    const didnt = monsterView(missed({}), latest, 240);
    expect(didnt.camp.last).toMatchObject({ n: 1, won: false, need: 8 });
  });

  it("a pending check-in doesn't hold a battle whose clock is still running", () => {
    const s = dayTwoSnapshot(undefined, { checkin: pendingCheckin() });
    expect(historyOf(s).battleDays.find((d) => d.day_number === 1)!.checkin_waiting).toBe(true);
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.battle).toMatchObject({ n: 1, waiting: false });
  });
});
