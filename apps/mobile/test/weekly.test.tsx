// M16, the weekly program (plan 2026-10-20-m16-weekly-program.md) on the phone: Settings → Training, the one-time offer,
// a weekly workout on Today and on its quest screen, a pending change, and the offline day.
import { ADJUST_TEXT, LIBRARY, PLAY_TEXT, programBlockLabel } from '@levelmeup/content';
import { planProgram, templateById } from '@levelmeup/rules';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { planAdvance } from '../../../supabase/functions/_shared/advance.ts';
import { DAY1, afterDay1, instanceRows } from '../../../supabase/tests/unit/fixtures.ts';
import { hardFields } from '../src/game/adjust.ts';
import { offlineDay } from '../src/game/offlineDay.ts';
import { project } from '../src/game/project.ts';
import { programOffered } from '../src/game/setup.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import { Quest } from '../src/screens/Quest.tsx';
import { Today } from '../src/screens/Today.tsx';
import { Training } from '../src/screens/Training.tsx';
import type { Offer } from '../src/state/store.ts';
import { profileRow, serverState, weeklyState, workoutState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const T = ADJUST_TEXT.training;
const NOW = Date.UTC(2026, 9, 10, 13); // inside day 1

describe('Settings → Training (decisions 1, 8)', () => {
  async function renderTraining(server: ServerState = workoutState()) {
    const store = testStore({ view: project(server, []) });
    const onDone = jest.fn();
    await render(withStore(store, <Training onDone={onDone} onBack={jest.fn()} />));
    return { store, onDone };
  }

  it('asks how to train; the weekly program adds its workouts a week and says when it starts', async () => {
    const { store, onDone } = await renderTraining();
    expect(screen.getByRole('radio', { name: `${T.plans.build.name}. ${T.plans.build.line}` }).props.accessibilityState.checked).toBe(true);
    expect(screen.queryByText(T.days)).toBeNull();
    expect(screen.getByText(T.today)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: `${T.plans.weekly.name}. ${T.plans.weekly.line}` }));
    expect(screen.getByText(T.days)).toBeTruthy();
    expect(screen.getByText(T.weeklyNote)).toBeTruthy();
    expect(screen.getByText(T.planTomorrow)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: `${T.dayChoices[2].name}. ${T.dayChoices[2].line}` }));
    await fireEvent.press(screen.getByRole('button', { name: T.save }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'training', equipment: [], programStyle: 'none', trainingPlan: 'weekly', programDays: 2 });
    expect(onDone).toHaveBeenCalled();
  });

  it('the weekly program fits any daily time', async () => {
    await renderTraining(workoutState({ profile: profileRow(undefined, { minutes_per_day: 15 }) }));
    expect(screen.getByText(T.noRoom)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: `${T.plans.weekly.name}. ${T.plans.weekly.line}` }));
    expect(screen.queryByText(T.noRoom)).toBeNull();
    expect(screen.queryByText(T.noRoomWeekly)).toBeNull();
  });

  it('a new number of workouts a week says it starts the block again; on Step by step the hidden choice changes nothing (review)', async () => {
    await renderTraining(workoutState({ profile: profileRow(undefined, { training_plan: 'weekly' }) }));
    expect(screen.queryByText(T.daysRestart)).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: `${T.dayChoices[2].name}. ${T.dayChoices[2].line}` }));
    expect(screen.getByText(T.daysRestart)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: `${T.plans.build.name}. ${T.plans.build.line}` }));
    await fireEvent.press(screen.getByRole('radio', { name: `${T.plans.weekly.name}. ${T.plans.weekly.line}` }));
    await fireEvent.press(screen.getByRole('radio', { name: `${T.dayChoices[3].name}. ${T.dayChoices[3].line}` }));
    expect(screen.getByRole('button', { name: T.save }).props.accessibilityState.disabled).toBe(true);
  });

  it('it stays off on a gentle start, and says so', async () => {
    await renderTraining(workoutState({ profile: profileRow(undefined, { gentle_start: true, training_plan: 'weekly' }) }));
    expect(screen.getByText(T.noRoomWeekly)).toBeTruthy();
  });
});

describe('the offer (decision 9)', () => {
  const done = (s: ServerState, workoutsDone: number): ServerState => ({ ...s, workoutsDone });
  const offered = (s: ServerState, offers: Offer[] = []) => programOffered(project(s, []), offers);

  it('once, after 3 workouts on the step-by-step plan, once the core quest is cleared, while strength work is possible', () => {
    expect(offered(done(serverState(['core']), 3))).toBe(true);
    expect(offered(done(serverState(['core']), 2))).toBe(false);
    expect(offered(done(serverState(), 3))).toBe(false); // the core quest first
    expect(offered(done(serverState(['core']), 3), ['program'])).toBe(false);
    const weekly = serverState(['core']);
    expect(offered(done({ ...weekly, profile: { ...weekly.profile, trainingPlan: 'weekly' } }, 3))).toBe(false);
    expect(offered(done({ ...weekly, profile: { ...weekly.profile, gentleStart: true } }, 3))).toBe(false);
    expect(offered(done({ ...weekly, profile: { ...weekly.profile, ownProgram: true } }, 3))).toBe(false);
  });

  it('on Today: "See the weekly program" marks it and opens Training; "Not now" only marks it', async () => {
    const store = testStore({ view: project(done(serverState(['core']), 3), []), offers: ['monster:intro'] });
    const props = {
      onSettings: jest.fn(), onOpenQuest: jest.fn(), onSwap: jest.fn(), onPain: jest.fn(), onVanish: jest.fn(), onTraining: jest.fn(),
      onCheckin: jest.fn(), onGame: jest.fn(), onSlip: jest.fn(), onVow: jest.fn(),
    };
    await render(withStore(store, <Today {...props} now={() => NOW} />));
    expect(screen.getByLabelText(`System: ${T.offer}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: T.offerGo }));
    expect(store.getState().markOffer).toHaveBeenCalledWith('program');
    expect(props.onTraining).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.day.notNow }));
    expect(props.onTraining).toHaveBeenCalledTimes(1);
  });
});

describe('a weekly workout (decision 6)', () => {
  it('its quest screen says its week and day and what the week asks for, and logs every exercise', async () => {
    const server = weeklyState();
    const core = server.today!.quests.find((q) => q.slot === 'core')!;
    if (core.condition.kind !== 'session') throw new Error('not a session');
    expect(core.condition.block).toEqual({ week: 1, day: 0 });
    await render(withStore(testStore({ view: project(server, []) }), (
      <Quest questId={core.id} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} now={() => NOW} />
    )));
    expect(screen.getByText(programBlockLabel({ week: 1, day: 0 }))).toBeTruthy();
    expect(screen.getByText('Week 1 of 6 · Workout A')).toBeTruthy();
    expect(screen.getByText(PLAY_TEXT.workout.weeks[0]!)).toBeTruthy();
    const moves = core.condition.moves.length;
    expect(moves).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByText(/^Exercise \d of \d$/)).toHaveLength(moves);
  });

  it('Hard day: one set of the first two exercises, still in its block (review)', () => {
    const core = weeklyState().today!.quests.find((q) => q.slot === 'core')!;
    const hard = hardFields(core, 'core');
    expect(hard).toMatchObject({ hardDay: true, minutes: 7, condition: { kind: 'session', block: { week: 1, day: 0 } } });
    if (hard.condition.kind !== 'session' || core.condition.kind !== 'session') throw new Error('not a session');
    expect(hard.condition.moves).toEqual(core.condition.moves.slice(0, 2).map((m) => ({ ...m, sets: 1 })));
  });

  it('the easy week says so', () => {
    expect(programBlockLabel({ week: 6, day: 2 })).toBe('Week 6 of 6, the easy week · Workout C');
  });

  it('a training change on its way sets the plan on screen at once', () => {
    const s = workoutState();
    const event: PhoneEvent = { id: '00000000-0000-4000-8000-000000000099', type: 'training', equipment: ['gym'], programStyle: 'men', trainingPlan: 'weekly', programDays: 2 };
    expect(project(s, [event]).profile).toMatchObject({ equipment: ['gym'], programStyle: 'men', trainingPlan: 'weekly', programDays: 2 });
    const old: PhoneEvent = { id: '00000000-0000-4000-8000-000000000098', type: 'training', equipment: [], programStyle: 'women' };
    expect(project(s, [old]).profile).toMatchObject({ programStyle: 'women', trainingPlan: 'build', programDays: 3 });
  });
});

describe('the offline day on the weekly plan (decisions 3, 4)', () => {
  const END = Date.parse(DAY1.endsAt);
  const HOUR = 3_600_000;
  // Day 1 with a walk as its core quest: a weekly workout never comes the day after a strength core quest.
  const WALK = { templateId: 'walk-0', ladder: 'walk', rung: 0, stat: 'vitality' } as const;
  const weekly = (programDone: number): ServerState => {
    const s = serverState();
    return {
      ...s, profile: { ...s.profile, trainingPlan: 'weekly' }, programDone, programLastAt: programDone > 0 ? DAY1.startsAt : null,
      today: { ...s.today!, quests: s.today!.quests.map((q) => (q.slot === 'core' ? { ...q, ...WALK } : q)) },
    };
  };
  const walkDay1 = instanceRows(DAY1, 1).map((r) => (r.slot === 'core' ? { ...r, template_id: 'walk-0', ladder_id: 'walk', rung: 0, stat: 'vitality' as const } : r));

  it('puts the weekly workout on day 2, as the server does, at the run\'s week', () => {
    for (const done of [0, 3]) {
      const s = weekly(done);
      const event = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
      const times = Array.from({ length: done }, (_, i) => END - (done - i) * HOUR);
      const server = planAdvance(afterDay1([], END + HOUR, {
        profile: profileRow(undefined, { training_plan: 'weekly' }), programTimes: times, instances: walkDay1,
      }))!.newDay!;
      const core = event.quests.find((q) => q.slot === 'core')!;
      expect(core.templateId).toBe('program-0');
      expect(event.quests.map((q) => [q.slot, q.templateId])).toEqual(server.quests.map((q) => [q.slot, q.templateId]));
      const template = templateById(LIBRARY, 'program-0');
      expect(core.moves).toEqual(planProgram(LIBRARY.training, template, { ...rules(s), trainingPlan: 'weekly' }, done));
      expect(core.moves!.every((m) => m.sets === (done === 0 ? 2 : 3))).toBe(true);
    }
  });

  it('the offline day shows its weekly workout on Today, in its block (review)', () => {
    const s = weekly(0);
    const event = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
    const shown = project(s, [{ ...event, id: '00000000-0000-4000-8000-000000000097' }]);
    const core = shown.today!.quests.find((q) => q.slot === 'core')!;
    expect(core).toMatchObject({ templateId: 'program-0', condition: { kind: 'session', block: { week: 1, day: 0 } } });
  });

  it('14 days without a weekly workout start the block again offline too (review)', () => {
    const s = { ...weekly(9), programLastAt: new Date(END - 15 * 24 * HOUR).toISOString() };
    const event = offlineDay(s, project(s, []), END + HOUR, 'Asia/Manila')!;
    const core = event.quests.find((q) => q.slot === 'core')!;
    expect(core.block).toEqual({ week: 1, day: 0 });
    expect(core.moves!.every((m) => m.sets === 2)).toBe(true);
    const recent = { ...weekly(9), programLastAt: new Date(END - 2 * 24 * HOUR).toISOString() };
    expect(offlineDay(recent, project(recent, []), END + HOUR, 'Asia/Manila')!.quests.find((q) => q.slot === 'core')!.block).toEqual({ week: 4, day: 1 });
  });

  it('never on a planned rest day', () => {
    const s = weekly(0);
    const resting = { ...s, character: { ...s.character, restDay: 2 } };
    const event = offlineDay(resting, project(resting, []), END + HOUR, 'Asia/Manila')!;
    expect(event.quests.find((q) => q.slot === 'core')!.templateId).not.toBe('program-0');
  });
});

/** The rules' player for a phone state (as offlineDay sees it). */
function rules(s: ServerState) {
  const p = s.profile;
  return {
    classId: p.classId, level: s.character.level, goals: p.goals, minutesPerDay: p.minutesPerDay, difficulty: p.difficulty,
    limitations: p.limitations, gentleStart: p.gentleStart, ownProgram: p.ownProgram, equipment: p.equipment, programStyle: p.programStyle,
    trainingPlan: p.trainingPlan, programDays: p.programDays,
    stats: { strength: 0, vitality: 0, wisdom: 0, focus: 0 }, book: p.book,
  };
}
