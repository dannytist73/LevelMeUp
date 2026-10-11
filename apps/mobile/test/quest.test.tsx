import { EXERCISE_SAFETY_LINE, artKey, authoredTemplate, questSummary, renderWhy } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { PhoneEvent, QuestView, ServerState } from '../src/game/types.ts';
import type { ClearedNumbers } from '../src/quest/cleared.ts';
import { NEW_TIMER, startTimer } from '../src/quest/timer.ts';
import type { TimerState } from '../src/quest/timer.ts';
import { Cleared } from '../src/screens/quest/Cleared.tsx';
import type { ClearedProps } from '../src/screens/quest/Cleared.tsx';
import { Quest } from '../src/screens/Quest.tsx';
import { RepLog } from '../src/screens/quest/RepLog.tsx';
import { SentenceLog } from '../src/screens/quest/SentenceLog.tsx';
import { TapClaim } from '../src/screens/quest/TapClaim.tsx';
import { TimerPanel, clock } from '../src/screens/quest/TimerPanel.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const T0 = Date.UTC(2026, 9, 10, 13);
const MIN = 60_000;
const disabled = (name: string) => screen.getByRole('button', { name }).props.accessibilityState.disabled;

describe('the completion panels (spec §3.6)', () => {
  it('check-off: one tap claims it', async () => {
    const onClaim = jest.fn();
    await render(<TapClaim disabled={false} onClaim={onClaim} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
    expect(onClaim).toHaveBeenCalledWith({});
  });

  it('timer: starts, shows the time, and claims only from 80 %', async () => {
    const onChange = jest.fn();
    const onClaim = jest.fn();
    const props = { targetMs: 20 * MIN, disabled: false, onChange, onClaim };
    const view = await render(<TimerPanel timer={NEW_TIMER} now={() => T0} {...props} />);
    expect(screen.getByLabelText('00:00 of 20:00')).toBeTruthy();
    expect(screen.getByText('00:00')).toBeTruthy(); // the elapsed time, large
    expect(screen.getByText('/ 20:00')).toBeTruthy(); // the target beside it
    expect(screen.getByText(/claim it from 16:00/)).toBeTruthy();
    expect(disabled('Claim')).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(onChange).toHaveBeenCalledWith({ segments: [], runningSince: T0 });

    await view.rerender(<TimerPanel timer={startTimer(NEW_TIMER, T0)} now={() => T0 + 16 * MIN} {...props} />);
    expect(screen.getByLabelText('16:00 of 20:00')).toBeTruthy();
    expect(screen.getByText('Ready to claim.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Claim' }));
    expect(onClaim).toHaveBeenCalledWith({ segments: [{ start: T0, end: T0 + 16 * MIN }] });
  });

  it('timer: a paused timer offers Resume', async () => {
    const paused = { segments: [{ start: T0, end: T0 + MIN }], runningSince: null };
    await render(<TimerPanel timer={paused} now={() => T0 + 5 * MIN} targetMs={20 * MIN} disabled={false} onChange={jest.fn()} onClaim={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
    expect(screen.getByLabelText('01:00 of 20:00')).toBeTruthy();
  });

  it('timer: counts only up to the end of the day, as the server does (review)', async () => {
    const endsAt = T0 + 10 * MIN; // started 10 minutes before the day ends
    await render(<TimerPanel timer={startTimer(NEW_TIMER, T0)} now={() => T0 + 30 * MIN} endsAt={endsAt} targetMs={20 * MIN} disabled={false} onChange={jest.fn()} onClaim={jest.fn()} />);
    expect(screen.getByLabelText('10:00 of 20:00')).toBeTruthy();
    expect(disabled('Claim')).toBe(true);
  });

  it('formats long timers with hours, and never below zero', () => {
    expect(clock(65 * MIN + 5000)).toBe('1:05:05');
    expect(clock(-1)).toBe('00:00');
  });

  it('rep log: starts at the target, moves each set, adds and removes sets, and logs what was done', async () => {
    const onClaim = jest.fn();
    await render(<RepLog condition={{ kind: 'reps', sets: 2, reps: 8, perSide: false }} disabled={false} onClaim={onClaim} />);
    expect(screen.getAllByLabelText('8 reps')).toHaveLength(2);
    expect(screen.getByText('Each set in reps.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Set 2, one less' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add a set' }));
    expect(screen.getAllByLabelText('7 reps')).toHaveLength(2); // a new set copies the last one
    await fireEvent.press(screen.getByRole('button', { name: 'Remove the last set' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Log it' }));
    expect(onClaim).toHaveBeenCalledWith({ sets: [8, 7] });
  });

  it('rep log for a hold counts seconds per side', async () => {
    await render(<RepLog condition={{ kind: 'hold', sets: 1, seconds: 30, perSide: true }} disabled={false} onClaim={jest.fn()} />);
    expect(screen.getByLabelText('30 seconds per side')).toBeTruthy();
    expect(screen.getByText('Each set in seconds per side.')).toBeTruthy();
    expect(disabled('Remove the last set')).toBe(true); // never below one set
  });

  it('rep log refuses all zeros', async () => {
    await render(<RepLog condition={{ kind: 'reps', sets: 1, reps: 1, perSide: false }} disabled={false} onClaim={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Set 1, one less' }));
    expect(disabled('Log it')).toBe(true);
  });

  it('one sentence: waits for a line, then logs it trimmed', async () => {
    const onClaim = jest.fn();
    await render(<SentenceLog disabled={false} onClaim={onClaim} />);
    expect(disabled('Log it')).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('One sentence'), '  Two pages on focus.  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Log it' }));
    expect(onClaim).toHaveBeenCalledWith({ text: 'Two pages on focus.' });
  });

  it('every panel can be disabled while a claim is on its way', async () => {
    await render(<TapClaim disabled onClaim={jest.fn()} />);
    expect(disabled('Mark cleared')).toBe(true);
  });
});

const NUMBERS: ClearedNumbers = {
  xp: 20,
  statUps: [{ stat: 'strength', from: 11, to: 12, rank: 'D' }],
  discipline: true,
  streak: { from: 9, to: 10 },
  level: { level: 6, xpIntoLevel: 87, xpForLevel: 130 },
};

async function renderCleared(over: Partial<ClearedProps> = {}) {
  const props: ClearedProps = {
    heading: 'CORE QUEST · KNEE PUSH-UPS', line: '3 sets of 8', numbers: NUMBERS, rating: null, dayOpen: true, waiting: false,
    onRate: jest.fn(), onUndo: jest.fn(), onContinue: jest.fn(), ...over,
  };
  await render(<Cleared {...props} />);
  return props;
}

describe('"Quest cleared" (board D2)', () => {
  it('shows the XP, the stat up with its rank, Discipline, the streak and the level bar', async () => {
    await renderCleared();
    expect(screen.getByRole('header', { name: 'CLEARED' })).toBeTruthy();
    expect(screen.getByText('CORE QUEST · KNEE PUSH-UPS')).toBeTruthy();
    expect(screen.getByLabelText('+20 XP')).toBeTruthy();
    expect(screen.getByText('STRENGTH 11 → 12')).toBeTruthy();
    expect(screen.getByLabelText('Rank D')).toBeTruthy();
    expect(screen.getByText('Discipline · today counts')).toBeTruthy();
    expect(screen.getByText('9 → 10 DAYS')).toBeTruthy();
    expect(screen.getByText('LV 6 · 87 / 130 XP')).toBeTruthy();
    expect(screen.getByText('43 to Lv 7')).toBeTruthy();
  });

  it('shows Right until the player picks, and sends a rating only when it changes', async () => {
    const props = await renderCleared();
    expect(screen.getByRole('button', { name: 'Right', selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Right' }));
    expect(props.onRate).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Too hard' }));
    expect(props.onRate).toHaveBeenCalledWith('too_hard');
  });

  it('explains "Too hard" once it is the rating', async () => {
    await renderCleared({ rating: 'too_hard' });
    expect(screen.getByRole('button', { name: 'Too hard', selected: true })).toBeTruthy();
    expect(screen.getByText(/the System eases this one/)).toBeTruthy();
  });

  it('offers Undo and the rating only while the day is open (the server refuses both after); Continue always', async () => {
    const props = await renderCleared();
    await fireEvent.press(screen.getByRole('button', { name: 'Logged by mistake? Undo' }));
    expect(props.onUndo).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(props.onContinue).toHaveBeenCalled();
    await renderCleared({ dayOpen: false });
    expect(screen.queryByRole('button', { name: 'Logged by mistake? Undo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Easy' })).toBeNull();
    expect(screen.queryByText(/How did it feel/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  it('without changes, shows no stat up, no streak and no Discipline line', async () => {
    await renderCleared({ numbers: { ...NUMBERS, statUps: [], streak: null, discipline: false } });
    expect(screen.queryByText('STAT UP')).toBeNull();
    expect(screen.queryByText('Streak')).toBeNull();
    expect(screen.queryByText('Discipline · today counts')).toBeNull();
  });

  it('says when the change hasn\'t reached the server yet', async () => {
    await renderCleared({ waiting: true });
    expect(screen.getByText('Will sync')).toBeTruthy();
  });
});

const NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs to 20:00 UTC
const SERVER = serverState();

/** The server state with today's core quest changed (a completion type the fixtures' day may not have). */
function withCore(over: Partial<QuestView>): ServerState {
  const today = SERVER.today!;
  return { ...SERVER, today: { ...today, quests: today.quests.map((q) => (q.slot === 'core' ? { ...q, ...over } : q)) } };
}
const coreOf = (s: ServerState) => s.today!.quests.find((q) => q.slot === 'core')!;

/** A store whose enqueue applies the event like the real one, so the screen moves on to "Quest cleared". */
async function renderQuest(server: ServerState, questId: number, over: Parameters<typeof testStore>[0] = {}, now: () => number = () => NOW) {
  const pending: PhoneEvent[] = [];
  const store = testStore({ view: project(server, []), ...over });
  const enqueue = jest.fn(async (event: Omit<PhoneEvent, 'id'>) => {
    pending.push({ ...event, id: `00000000-0000-4000-8000-${String(pending.length + 1).padStart(12, '0')}` } as PhoneEvent);
    store.setState({ view: project(server, pending) });
  });
  store.setState({ enqueue: enqueue as never });
  const onBack = jest.fn();
  await render(withStore(store, <Quest questId={questId} onBack={onBack} now={now} />));
  return { store, enqueue, onBack };
}

describe('the quest screen (M6a decisions 1, 9, 10)', () => {
  it('shows the quest in the player\'s voice: target, why, how, safety, and its picture or the ink fallback', async () => {
    const core = coreOf(SERVER);
    const template = authoredTemplate(core.templateId);
    await renderQuest(SERVER, core.id);
    expect(screen.getByText(template.voice.system.title)).toBeTruthy();
    expect(screen.getByText(template.voice.system.line)).toBeTruthy();
    expect(screen.getByText(questSummary(template, core.hardDay))).toBeTruthy();
    expect(screen.getByText(renderWhy(core.why, 'system', { classId: 'warrior' }))).toBeTruthy();
    for (const [i, step] of template.steps.entries()) expect(screen.getByText(`${i + 1}. ${step}`)).toBeTruthy();
    if (template.exercise !== null) expect(screen.getByText(EXERCISE_SAFETY_LINE)).toBeTruthy();
    expect(screen.getByTestId('quest-art-fallback')).toBeTruthy();
  });

  it('shows the picture once the manifest lists the quest\'s key', async () => {
    const core = coreOf(SERVER);
    const key = artKey(authoredTemplate(core.templateId));
    await renderQuest(SERVER, core.id, { art: { version: 1, art: { [key]: 1 } } });
    expect(screen.getByTestId('quest-art').props.source.uri).toContain(`/lmu-art/v1/${key}-1.webp`);
  });

  it('a check-off sends the completion, then shows "Quest cleared" with Discipline for the core quest', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'complete', instanceId: core.id, completedAt: NOW, rating: null, payload: {} });
    expect(screen.getByRole('header', { name: 'CLEARED' })).toBeTruthy();
    expect(screen.getByText('Discipline · today counts')).toBeTruthy();
  });

  it('a rep log sends its sets', async () => {
    const server = withCore({ completion: 'reps', condition: { kind: 'reps', sets: 2, reps: 5, perSide: false } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: 'Log it' }));
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', payload: { sets: [5, 5] } }));
  });

  it('a timer picks up where it was, and forgets itself once claimed', async () => {
    const server = withCore({ completion: 'timer', condition: { kind: 'minutes', minutes: 10 }, minutes: 10 });
    const core = coreOf(server);
    const stored = { segments: [{ start: NOW - 9 * 60_000, end: NOW }], runningSince: null };
    const timer = jest.fn(async () => stored);
    const { enqueue, store } = await renderQuest(server, core.id, { timer });
    expect(timer).toHaveBeenCalledWith(core.id);
    expect(await screen.findByLabelText('09:00 of 10:00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Claim' }));
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', payload: { segments: stored.segments } }));
    expect(store.getState().saveTimer).toHaveBeenCalledWith(core.id, null);
  });

  it('after an undo, a timer quest starts again from zero', async () => {
    const server = withCore({ completion: 'timer', condition: { kind: 'minutes', minutes: 10 }, minutes: 10 });
    const core = coreOf(server);
    // Kept like the store keeps it: the claim forgets it.
    let kept: TimerState | null = { segments: [{ start: NOW - 9 * 60_000, end: NOW }], runningSince: null };
    const timer = jest.fn(async () => kept);
    const saveTimer = jest.fn(async (_id: number, state: TimerState | null) => void (kept = state));
    await renderQuest(server, core.id, { timer, saveTimer });
    await screen.findByLabelText('09:00 of 10:00');
    await fireEvent.press(screen.getByRole('button', { name: 'Claim' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Logged by mistake? Undo' }));
    expect(await screen.findByLabelText('00:00 of 10:00')).toBeTruthy();
  });

  it('a cleared quest rates and undoes through the outbox', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'rate', instanceId: core.id, rating: 'easy' });
    await fireEvent.press(screen.getByRole('button', { name: 'Logged by mistake? Undo' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'undo', instanceId: core.id });
    expect(screen.getByRole('button', { name: 'Mark cleared' })).toBeTruthy(); // open again
  });

  it('today\'s reading waits for the articles: no claim', async () => {
    const article = SERVER.today!.quests.find((q) => q.slot === 'article')!;
    await renderQuest(SERVER, article.id);
    expect(screen.getByText(/Today's reading opens once the daily articles arrive/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Log it' })).toBeNull();
  });

  it('an open quest whose day has ended says so and offers no claim (review)', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const ended = Date.parse(server.today!.endsAt!) + 60_000;
    await renderQuest(server, coreOf(server).id, {}, () => ended);
    expect(screen.getByText(/This quest's day has closed/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mark cleared' })).toBeNull();
  });

  it('closes itself when the day ends while it is open (review)', async () => {
    jest.useFakeTimers();
    try {
      const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
      const endsAt = Date.parse(server.today!.endsAt!);
      let clock = endsAt - 2_000;
      await renderQuest(server, coreOf(server).id, {}, () => clock);
      expect(screen.getByRole('button', { name: 'Mark cleared' })).toBeTruthy();
      clock = endsAt + 1_000;
      await act(async () => {
        jest.advanceTimersByTime(3_000);
      });
      expect(screen.getByText(/This quest's day has closed/)).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('sends nothing when the day ended before the screen caught up (review)', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    let clock = NOW;
    const { enqueue } = await renderQuest(server, coreOf(server).id, {}, () => clock);
    clock = Date.parse(server.today!.endsAt!) + 1_000; // no re-render yet
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
    expect(enqueue).not.toHaveBeenCalled();
    expect(screen.getByText(/This quest's day has closed/)).toBeTruthy();
  });

  it('sends one completion for a second tap while the first is on its way (review)', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const { store } = await renderQuest(server, coreOf(server).id);
    const slow = jest.fn(() => new Promise<void>(() => {})); // the outbox write never finishes
    await act(async () => store.setState({ enqueue: slow as never }));
    const button = screen.getByRole('button', { name: 'Mark cleared' });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it('a quest that is no longer today\'s says so and goes back', async () => {
    const { onBack } = await renderQuest(SERVER, 999999);
    expect(screen.getByText(/This quest's day has closed/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});
