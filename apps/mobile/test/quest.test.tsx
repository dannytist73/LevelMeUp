import {
  ADJUST_TEXT, EXERCISE_SAFETY_LINE, PLAY_TEXT, READING_TEXT, artKey, authoredTemplate, questSummary, renderWhy,
} from '@levelmeup/content';
import { DISCIPLINE_PER_CORE_DAY, newLadder } from '@levelmeup/rules';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { project } from '../src/game/project.ts';
import type { PhoneEvent, QuestView, ServerState } from '../src/game/types.ts';
import type { ClearedNumbers } from '../src/quest/cleared.ts';
import { NEW_TIMER, startTimer } from '../src/quest/timer.ts';
import type { TimerState } from '../src/quest/timer.ts';
import { ClaimBarHost } from '../src/screens/quest/ClaimBar.tsx';
import { startDrafts } from '../src/state/drafts.ts';
import { Cleared } from '../src/screens/quest/Cleared.tsx';
import type { ClearedProps } from '../src/screens/quest/Cleared.tsx';
import { Quest } from '../src/screens/Quest.tsx';
import { RepLog } from '../src/screens/quest/RepLog.tsx';
import { SentenceLog } from '../src/screens/quest/SentenceLog.tsx';
import { TapClaim } from '../src/screens/quest/TapClaim.tsx';
import { TimerPanel, clock } from '../src/screens/quest/TimerPanel.tsx';
import { WorkoutLog } from '../src/screens/quest/WorkoutLog.tsx';
import { DAY_TWO_NOW, adjustState, ladderRows, serverState, workoutState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const T0 = Date.UTC(2026, 9, 10, 13);
const MIN = 60_000;
const disabled = (name: string) => screen.getByRole('button', { name }).props.accessibilityState.disabled;
/** M12: the quest screen's fixed button, "Mark cleared · +10 XP". */
const BAR = (label: string) => new RegExp(`^${label} · \\+\\d+ XP$`);

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
    // M17: before its time the one button starts and pauses; Claim comes once the time is reached.
    expect(screen.queryByRole('button', { name: 'Mark cleared' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(onChange).toHaveBeenCalledWith({ segments: [], runningSince: T0 });

    await view.rerender(<TimerPanel timer={startTimer(NEW_TIMER, T0)} now={() => T0 + 16 * MIN} {...props} />);
    expect(screen.getByLabelText('16:00 of 20:00')).toBeTruthy();
    expect(screen.getByText('Ready to claim.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
    expect(onClaim).toHaveBeenCalledWith({ segments: [{ start: T0, end: T0 + 16 * MIN }] });
  });

  it('timer: in the screen bar, Start and Pause carry no XP; Claim does once the time is reached (M17)', async () => {
    const props = { targetMs: 20 * MIN, disabled: false, onChange: jest.fn(), onClaim: jest.fn() };
    const bar = (timer: TimerState, at: number) => (
      <ClaimBarHost suffix="· +10 XP">{() => <TimerPanel timer={timer} now={() => at} {...props} />}</ClaimBarHost>
    );
    const view = await render(bar(NEW_TIMER, T0));
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    await view.rerender(bar(startTimer(NEW_TIMER, T0), T0 + MIN));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    await view.rerender(bar(startTimer(NEW_TIMER, T0), T0 + 16 * MIN));
    expect(screen.getByRole('button', { name: 'Mark cleared · +10 XP' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy(); // quiet, beside the clock
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
    expect(screen.queryByRole('button', { name: 'Mark cleared' })).toBeNull();
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
    await fireEvent.press(screen.getByRole('button', { name: 'Log 2 sets' })); // M12: it says what it logs
    expect(onClaim).toHaveBeenCalledWith({ sets: [8, 7] });
  });

  it('rep log: what was set survives leaving and coming back while the app runs (M17: it reset to the target)', async () => {
    const reps = { kind: 'reps', sets: 2, reps: 8, perSide: false } as const;
    const first = await render(<RepLog condition={reps} disabled={false} onClaim={jest.fn()} draftKey="q-1:reps" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Set 2, one less' }));
    await fireEvent.press(screen.getAllByRole('checkbox', { name: 'Set 1 done' })[0]!);
    await first.unmount();
    await render(<RepLog condition={reps} disabled={false} onClaim={jest.fn()} draftKey="q-1:reps" />);
    expect(screen.getByLabelText('7 reps')).toBeTruthy();
    expect(screen.getAllByRole('checkbox', { name: 'Set 1 done' })[0]!.props.accessibilityState).toMatchObject({ checked: true });
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
    expect(disabled('Log 1 set')).toBe(true);
  });

  it('one sentence: waits for a line, then logs it trimmed', async () => {
    const onClaim = jest.fn();
    await render(<SentenceLog disabled={false} onClaim={onClaim} />);
    expect(disabled('Mark cleared')).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('One sentence'), '  Two pages on focus.  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
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
  levelBefore: null,
  recovered: false,
};

async function renderCleared(over: Partial<ClearedProps> = {}) {
  const props: ClearedProps = {
    heading: 'CORE QUEST · KNEE PUSH-UPS', line: '3 sets of 8', numbers: NUMBERS, rating: null, dayOpen: true, waiting: false,
    onRate: jest.fn(), onUndo: jest.fn(), onContinue: jest.fn(), canStepDown: false, onStepDown: jest.fn(), onPain: null, ...over,
  };
  await render(<Cleared {...props} />);
  return props;
}

describe('"Quest cleared" (board D2)', () => {
  it('shows the XP, the stat up with its rank, Discipline, the streak and the level bar', async () => {
    await renderCleared();
    expect(screen.getByRole('header', { name: 'Cleared' })).toBeTruthy();
    expect(screen.getByText('CORE QUEST · KNEE PUSH-UPS')).toBeTruthy();
    expect(screen.getByLabelText('+20 XP')).toBeTruthy();
    expect(screen.getByText('Strength 11 → 12')).toBeTruthy();
    expect(screen.getByLabelText('Rank D')).toBeTruthy();
    expect(screen.getByText('Discipline · today counts')).toBeTruthy();
    expect(screen.getByText(`+${DISCIPLINE_PER_CORE_DAY}`)).toBeTruthy(); // the rules' number, not a copy
    expect(screen.getByText('9 → 10 days')).toBeTruthy();
    expect(screen.getByText('Lv 6 · 87 / 130 XP')).toBeTruthy();
    expect(screen.getByText('43 to Lv 7')).toBeTruthy();
  });

  it('selects nothing until the player picks (M12, audit 22), and sends a rating only when it changes', async () => {
    const props = await renderCleared();
    for (const name of ['Easy', 'Right', 'Too hard']) expect(screen.getByRole('button', { name }).props.accessibilityState.selected).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Right' }));
    expect(props.onRate).toHaveBeenCalledWith('right');
    await renderCleared({ rating: 'right' });
    await fireEvent.press(screen.getByRole('button', { name: 'Right' }));
    expect(props.onRate).toHaveBeenCalledTimes(1);
  });

  it('leads on with Next, and Back to Today beside it (M12 decision 6)', async () => {
    const onPress = jest.fn();
    const props = await renderCleared({ next: { label: "Next: today's reading · 6 min read", onPress } });
    await fireEvent.press(screen.getByRole('button', { name: "Next: today's reading · 6 min read" }));
    expect(onPress).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.cleared.back }));
    expect(props.onContinue).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
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
    expect(screen.queryByText('Stat up')).toBeNull();
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
  await render(withStore(store, <Quest questId={questId} onBack={onBack} onSwap={jest.fn()} onPain={jest.fn()} now={now} />));
  return { store, enqueue, onBack };
}

describe('the quest screen (M6a decisions 1, 9, 10)', () => {
  it('shows the quest in the player\'s voice: the title, its target and the log first; how and why fold; safety stays open', async () => {
    const core = coreOf(SERVER);
    const template = authoredTemplate(core.templateId);
    await renderQuest(SERVER, core.id);
    expect(screen.getByRole('header', { name: template.voice.system.title })).toBeTruthy();
    expect(screen.getByText(questSummary(core))).toBeTruthy();
    expect(screen.getByTestId('claim-bar')).toBeTruthy(); // the log's button, fixed at the bottom (M12)
    if (template.exercise !== null) expect(screen.getByText(EXERCISE_SAFETY_LINE)).toBeTruthy();
    // Folded until asked for.
    expect(screen.queryByText(renderWhy(core.why, 'system', { classId: 'warrior' }))).toBeNull();
    expect(screen.queryByTestId('quest-art-fallback')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.quest.steps }));
    for (const [i, step] of template.steps.entries()) expect(screen.getByText(`${i + 1}. ${step}`)).toBeTruthy();
    expect(screen.getByTestId('quest-art-fallback')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.quest.why }));
    expect(screen.getByText(template.voice.system.line)).toBeTruthy();
    expect(screen.getByText(renderWhy(core.why, 'system', { classId: 'warrior' }))).toBeTruthy();
  });

  it('shows the picture once the manifest lists the quest\'s key', async () => {
    const core = coreOf(SERVER);
    const key = artKey(authoredTemplate(core.templateId));
    await renderQuest(SERVER, core.id, { art: { version: 1, art: { [key]: 1 } } });
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.quest.steps }));
    expect(screen.getByTestId('quest-art').props.source.uri).toContain(`/lmu-art/v3/${key}-1.webp`);
  });

  it('keeps a half-written takeaway when the reading is closed and opened again (M12, audit 9)', async () => {
    const { SAMPLE_ARTICLE } = require('../src/dev/sampleArticle.ts');
    const article = SERVER.today!.quests.find((q) => q.slot === 'article')!;
    const server: ServerState = { ...SERVER, today: { ...SERVER.today!, article: { id: SAMPLE_ARTICLE.id, cluster: SAMPLE_ARTICLE.cluster, title: SAMPLE_ARTICLE.title, minutes: SAMPLE_ARTICLE.minutes } } };
    const over = { articles: { [SAMPLE_ARTICLE.id]: { ...SAMPLE_ARTICLE, deck: null } } };
    const first = await renderQuest(server, article.id, over);
    await fireEvent.changeText(screen.getByLabelText(READING_TEXT.takeawayLabel), 'Wake at the same time.');
    first.onBack.mockClear();
    await render(withStore(testStore({ view: project(server, []), ...over }), <Quest questId={article.id} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} now={() => NOW} />));
    expect(screen.getByLabelText(READING_TEXT.takeawayLabel).props.value).toBe('Wake at the same time.');
  });

  it('a check-off sends the completion, then shows "Quest cleared" with Discipline for the core quest', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: BAR('Mark cleared') }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'complete', instanceId: core.id, completedAt: NOW, rating: null, payload: {} });
    expect(screen.getByRole('header', { name: 'Cleared' })).toBeTruthy();
    expect(screen.getByText('Discipline · today counts')).toBeTruthy();
  });

  it('once cleared, Next opens what comes after: the reading once the day has its article (M12 decision 6)', async () => {
    const base = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const server: ServerState = { ...base, today: { ...base.today!, article: { id: 'article-9', cluster: 'sleep', title: 'Wake time', minutes: 6 } } };
    const core = coreOf(server);
    const article = server.today!.quests.find((q) => q.slot === 'article')!;
    const store = testStore({ view: project(server, []) });
    const pending: PhoneEvent[] = [];
    store.setState({ enqueue: (async (event: Omit<PhoneEvent, 'id'>) => {
      pending.push({ ...event, id: '00000000-0000-4000-8000-000000000001' } as PhoneEvent);
      store.setState({ view: project(server, pending) });
    }) as never });
    const onNext = jest.fn();
    await render(withStore(store, <Quest questId={core.id} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onNext={onNext} now={() => NOW} />));
    await fireEvent.press(screen.getByRole('button', { name: BAR('Mark cleared') }));
    await fireEvent.press(screen.getByRole('button', { name: "Next: today's reading · 6 min read" }));
    expect(onNext).toHaveBeenCalledWith(article.id);
    expect(screen.getByRole('button', { name: PLAY_TEXT.cleared.back })).toBeTruthy();
  });

  it('a rep log sends its sets', async () => {
    const server = withCore({ completion: 'reps', condition: { kind: 'reps', sets: 2, reps: 5, perSide: false } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: /^Log \d+ sets? · \+\d+ XP$/ }));
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', payload: { sets: [5, 5] } }));
  });

  it('after an undo, a rep log comes back as it was logged, and says so (premium pass A4)', async () => {
    const server = withCore({ completion: 'reps', condition: { kind: 'reps', sets: 2, reps: 5, perSide: false } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: 'Set 2, one less' }));
    await fireEvent.press(screen.getByRole('button', { name: /^Log \d+ sets? · \+\d+ XP$/ }));
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', payload: { sets: [5, 4] } }));
    await fireEvent.press(screen.getByRole('button', { name: 'Logged by mistake? Undo' }));
    expect(screen.getByLabelText('4 reps')).toBeTruthy(); // not back at the target
    expect(screen.getByText('Undone. The XP went back, and your log is as you left it.')).toBeTruthy();
  });

  it('a one-sentence quest keeps its line when the screen closes and opens again (premium pass A1)', async () => {
    const server = withCore({ completion: 'text', condition: { kind: 'sentence' } });
    const core = coreOf(server);
    await renderQuest(server, core.id);
    await fireEvent.changeText(screen.getByLabelText('One sentence'), 'Two pages on focus.');
    await screen.unmount();
    await renderQuest(server, core.id);
    expect(screen.getByDisplayValue('Two pages on focus.')).toBeTruthy();
  });

  it('a log the phone kept from before the app closed comes back, and says so (premium pass A1)', async () => {
    const kv = new Map<string, string>();
    const blobs = { getItem: async (k: string) => kv.get(k) ?? null, setItem: async (k: string, v: string) => void kv.set(k, v), removeItem: async (k: string) => void kv.delete(k) };
    startDrafts(blobs, JSON.stringify({ 'log:q-9:reps': { sets: [6, 5], done: [true, false] } }));
    await render(<RepLog condition={{ kind: 'reps', sets: 2, reps: 8, perSide: false }} disabled={false} onClaim={jest.fn()} draftKey="q-9:reps" />);
    expect(screen.getByText('Picked up where you left off.')).toBeTruthy();
    expect(screen.getByLabelText('5 reps')).toBeTruthy();
    expect(screen.getAllByRole('checkbox', { name: 'Set 1 done' })[0]!.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('a timer picks up where it was, and stays, paused, once claimed (premium pass A4)', async () => {
    const server = withCore({ completion: 'timer', condition: { kind: 'minutes', minutes: 10 }, minutes: 10 });
    const core = coreOf(server);
    const stored = { segments: [{ start: NOW - 9 * 60_000, end: NOW }], runningSince: null };
    const timer = jest.fn(async () => stored);
    const { enqueue, store } = await renderQuest(server, core.id, { timer });
    expect(timer).toHaveBeenCalledWith(core.id);
    expect(await screen.findByLabelText('09:00 of 10:00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: BAR('Mark cleared') }));
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', payload: { segments: stored.segments } }));
    expect(store.getState().saveTimer).toHaveBeenCalledWith(core.id, { segments: stored.segments, runningSince: null });
  });

  it('after an undo, a timer quest comes back where it was claimed, and says so (premium pass A4)', async () => {
    const server = withCore({ completion: 'timer', condition: { kind: 'minutes', minutes: 10 }, minutes: 10 });
    const core = coreOf(server);
    // Kept like the store keeps it: the claim keeps it, paused.
    let kept: TimerState | null = { segments: [{ start: NOW - 9 * 60_000, end: NOW }], runningSince: null };
    const timer = jest.fn(async () => kept);
    const saveTimer = jest.fn(async (_id: number, state: TimerState | null) => void (kept = state));
    await renderQuest(server, core.id, { timer, saveTimer });
    await screen.findByLabelText('09:00 of 10:00');
    await fireEvent.press(screen.getByRole('button', { name: BAR('Mark cleared') }));
    await fireEvent.press(screen.getByRole('button', { name: 'Logged by mistake? Undo' }));
    expect(await screen.findByLabelText('09:00 of 10:00')).toBeTruthy();
    expect(screen.getByText('Undone. The XP went back, and your log is as you left it.')).toBeTruthy();
  });

  it('a cleared quest rates and undoes through the outbox', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: BAR('Mark cleared') }));
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'rate', instanceId: core.id, rating: 'easy' });
    await fireEvent.press(screen.getByRole('button', { name: 'Logged by mistake? Undo' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'undo', instanceId: core.id });
    expect(screen.getByRole('button', { name: BAR('Mark cleared') })).toBeTruthy(); // open again
    expect(screen.getByText('Undone. The XP went back.')).toBeTruthy(); // premium pass A4: and it says so
  });

  it('today\'s reading waits for the articles: no claim', async () => {
    const article = SERVER.today!.quests.find((q) => q.slot === 'article')!;
    await renderQuest(SERVER, article.id);
    expect(screen.getByText(/Today's reading opens once the daily articles arrive/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Log \d+ sets? · \+\d+ XP$/ })).toBeNull();
    expect(screen.queryByLabelText(READING_TEXT.takeawayLabel)).toBeNull();
  });

  it('an open quest whose day has ended says so and offers no claim (review)', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const ended = Date.parse(server.today!.endsAt!) + 60_000;
    await renderQuest(server, coreOf(server).id, {}, () => ended);
    expect(screen.getByText(/This quest's day has closed/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: BAR('Mark cleared') })).toBeNull();
  });

  it('closes itself when the day ends while it is open (review)', async () => {
    jest.useFakeTimers();
    try {
      const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
      const endsAt = Date.parse(server.today!.endsAt!);
      let clock = endsAt - 2_000;
      await renderQuest(server, coreOf(server).id, {}, () => clock);
      expect(screen.getByRole('button', { name: BAR('Mark cleared') })).toBeTruthy();
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
    await fireEvent.press(screen.getByRole('button', { name: BAR('Mark cleared') }));
    expect(enqueue).not.toHaveBeenCalled();
    expect(screen.getByText(/This quest's day has closed/)).toBeTruthy();
  });

  it('sends one completion for a second tap while the first is on its way (review)', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const { store } = await renderQuest(server, coreOf(server).id);
    const slow = jest.fn(() => new Promise<void>(() => {})); // the outbox write never finishes
    await act(async () => store.setState({ enqueue: slow as never }));
    const button = screen.getByRole('button', { name: BAR('Mark cleared') });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it('a quest that is no longer today\'s says so and goes back', async () => {
    const { onBack } = await renderQuest(SERVER, 999999);
    expect(screen.getByText(/This quest's day has closed/)).toBeTruthy();
    for (const back of screen.getAllByRole('button', { name: 'Back' })) await fireEvent.press(back); // the top bar's and the line's
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});

describe('adjusting from the quest screen (M6b)', () => {
  const at = () => DAY_TWO_NOW;
  const hardDay = { id: '00000000-0000-4000-9000-000000000001', type: 'hard_day', dayId: 2 } as const;

  it('an open exercise quest offers "I felt pain" and "Swap this quest"', async () => {
    const onSwap = jest.fn();
    const onPain = jest.fn();
    await render(withStore(testStore({ view: project(adjustState(), []) }),
      <Quest questId={200} now={at} onBack={jest.fn()} onSwap={onSwap} onPain={onPain} />));
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.pain.open }));
    expect(onPain).toHaveBeenCalledWith(200);
    await fireEvent.press(screen.getByRole('button', { name: /^Swap this quest · \d of \d left$/ }));
    expect(onSwap).toHaveBeenCalledWith(200);
  });

  it('a hard-day quest hides the line that quotes the full version, and says it is a hard day', async () => {
    await render(withStore(testStore({ view: project(adjustState(), [hardDay]) }),
      <Quest questId={200} now={at} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} />));
    expect(screen.getByText(ADJUST_TEXT.hardDay.tag)).toBeTruthy();
    expect(screen.queryByText(authoredTemplate('push-1').voice.system.line)).toBeNull();
  });

  it('an exercise resting after pain says so on its quest screen (device check)', async () => {
    const resting = adjustState({ ladders: ladderRows({ push: { ...newLadder(1), paused: true } }) });
    await render(withStore(testStore({ view: project(resting, []) }),
      <Quest questId={200} now={at} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} />));
    expect(screen.getByText(ADJUST_TEXT.paused.quest)).toBeTruthy();
  });

  it('reading has no pain button; with no swap left there is no swap button', async () => {
    await render(withStore(testStore({ view: project(adjustState({}, { swaps_used: 1 }), []) }),
      <Quest questId={202} now={at} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} />));
    expect(screen.queryByRole('button', { name: ADJUST_TEXT.pain.open })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Swap this quest · \d of \d left$/ })).toBeNull();
  });
});

describe('stepping down after "Too hard" (spec §3.3)', () => {
  const tooHard = { id: '00000000-0000-4000-9000-000000000002', type: 'complete', instanceId: 200, completedAt: DAY_TWO_NOW, rating: 'too_hard', payload: {} } as const;

  it('Quest cleared offers the step down at the ladder\'s rung and sends it; "I felt pain" stays reachable', async () => {
    const store = testStore({ view: project(adjustState(), [tooHard]) });
    const onPain = jest.fn();
    await render(withStore(store, <Quest questId={200} now={() => DAY_TWO_NOW} onBack={jest.fn()} onSwap={jest.fn()} onPain={onPain} />));
    expect(screen.getByText(ADJUST_TEXT.stepDown.offer)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.stepDown.accept }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'step_down', instanceId: 200 });
    expect(screen.getByText(ADJUST_TEXT.stepDown.done)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.pain.open }));
    expect(onPain).toHaveBeenCalledWith(200);
  });

  it('a quest that can\'t step down keeps the plain "too hard" note', async () => {
    const walk = { ...tooHard, instanceId: 201 };
    await render(withStore(testStore({ view: project(adjustState(), [walk]) }),
      <Quest questId={201} now={() => DAY_TWO_NOW} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} />));
    expect(screen.getByText(PLAY_TEXT.cleared.tooHardNote)).toBeTruthy();
    expect(screen.queryByText(ADJUST_TEXT.stepDown.offer)).toBeNull();
  });
});

describe('a workout (M6c)', () => {
  const moves = [
    { move: 'goblet-squat', unit: 'reps', min: 10, max: 15, perSide: false, sets: 2 },
    { move: 'plank', unit: 'seconds', min: 20, max: 40, perSide: false, sets: 1 },
  ] as const;

  it('lists each exercise with its target, cue and progress line; the steps open on request', async () => {
    await render(<WorkoutLog moves={moves} disabled={false} onClaim={jest.fn()} />);
    expect(screen.getByText('Goblet squat')).toBeTruthy();
    expect(screen.getByText('2 sets of 10–15 reps')).toBeTruthy();
    expect(screen.getByText('1 hold of 20–40 seconds')).toBeTruthy();
    expect(screen.getByText(/go a little heavier next time/)).toBeTruthy(); // M17: with the open steps
    expect(screen.queryByText(/hold a few seconds longer/)).toBeNull(); // M17: inside the plank's closed steps
    expect(screen.getByText(/1\. Hold one dumbbell upright/)).toBeTruthy(); // the first exercise's steps start open
    await fireEvent.press(screen.getByRole('button', { name: `${PLAY_TEXT.workout.how}: Forearm plank` })); // named for screen readers (review)
    expect(screen.getByText(/1\. Rest on your forearms/)).toBeTruthy();
    expect(screen.getByText(/hold a few seconds longer/)).toBeTruthy();
  });

  it('the sets and ticks survive leaving and coming back while the app runs; another quest starts fresh (M17)', async () => {
    const first = await render(<WorkoutLog moves={moves} disabled={false} onClaim={jest.fn()} draftKey="q-7:workout" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Goblet squat, set 1, one more' }));
    await fireEvent.press(screen.getAllByRole('checkbox', { name: 'Set 1 done' })[0]!);
    await fireEvent.press(screen.getAllByRole('checkbox', { name: 'Set 2 done' })[0]!);
    expect(screen.getByText('Done · 11 · 10')).toBeTruthy();
    await first.unmount();
    const again = await render(<WorkoutLog moves={moves} disabled={false} onClaim={jest.fn()} draftKey="q-7:workout" />);
    expect(screen.getByText('Done · 11 · 10')).toBeTruthy();
    await again.unmount();
    await render(<WorkoutLog moves={moves} disabled={false} onClaim={jest.fn()} draftKey="q-8:workout" />);
    expect(screen.queryByText(/^Done · /)).toBeNull();
  });

  it('a finished exercise folds to one line, the next exercise steps open, and a tap opens it again (M17)', async () => {
    await render(<WorkoutLog moves={moves} disabled={false} onClaim={jest.fn()} />);
    await fireEvent.press(screen.getAllByRole('checkbox', { name: 'Set 1 done' })[0]!);
    expect(screen.queryByText(/^Done · /)).toBeNull(); // one set of two: still open
    await fireEvent.press(screen.getAllByRole('checkbox', { name: 'Set 2 done' })[0]!);
    expect(screen.getByText('Done · 10 · 10')).toBeTruthy();
    expect(screen.queryByText(/1\. Hold one dumbbell upright/)).toBeNull();
    expect(screen.getByText(/1\. Rest on your forearms/)).toBeTruthy(); // the plank's steps opened
    await fireEvent.press(screen.getByRole('button', { name: `Goblet squat. Done · 10 · 10. ${PLAY_TEXT.workout.reopen}` }));
    expect(screen.getByRole('button', { name: 'Goblet squat, set 1, one more' })).toBeTruthy();
  });

  it('a screen reader hears an exercise fold and what is next (review)', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(<WorkoutLog moves={moves} disabled={false} onClaim={jest.fn()} />);
    await fireEvent.press(screen.getAllByRole('checkbox', { name: 'Set 1 done' })[0]!);
    await fireEvent.press(screen.getAllByRole('checkbox', { name: 'Set 2 done' })[0]!);
    expect(announce).toHaveBeenLastCalledWith('Goblet squat done. Next: Forearm plank.');
    announce.mockRestore();
  });

  it('logs every set, starting at the bottom of each range', async () => {
    const onClaim = jest.fn();
    await render(<WorkoutLog moves={moves} disabled={false} onClaim={onClaim} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Goblet squat, set 1, one more' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Forearm plank, set 1, one less' }));
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.workout.log }));
    expect(onClaim).toHaveBeenCalledWith({ sets: [11, 10, 19] });
  });

  it('a new plan from the server starts a fresh log, whatever its size (review)', async () => {
    const server = workoutState();
    const store = testStore({ view: project(server, []) });
    await render(withStore(store, <Quest questId={200} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(screen.getAllByText(/^Set \d$/)).toHaveLength(6);
    const four = [
      { move: 'goblet-squat', unit: 'reps', min: 10, max: 15, perSide: false, sets: 2 },
      { move: 'db-row', unit: 'reps', min: 8, max: 12, perSide: true, sets: 2 },
      { move: 'plank', unit: 'seconds', min: 20, max: 40, perSide: false, sets: 2 },
      { move: 'glute-bridge', unit: 'reps', min: 12, max: 20, perSide: false, sets: 2 },
    ] as const;
    const replanned: ServerState = {
      ...server,
      today: { ...server.today!, quests: server.today!.quests.map((q) => (q.id === 200 ? { ...q, condition: { kind: 'session', moves: four } } : q)) },
    };
    await act(async () => store.setState({ view: project(replanned, []) }));
    expect(screen.getAllByText(/^Set \d$/)).toHaveLength(8);
    expect(screen.getByText('Goblet squat')).toBeTruthy();
  });

  it('while a training change waits to sync, the workout waits too (review)', async () => {
    const change: PhoneEvent = { id: 'e1', type: 'training', equipment: ['gym'], programStyle: 'men' };
    const store = testStore({ view: project(workoutState(), [change]), pending: [change] });
    await render(withStore(store, <Quest questId={200} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(screen.getByText(PLAY_TEXT.workout.replanning)).toBeTruthy();
    expect(screen.getByRole('button', { name: BAR(PLAY_TEXT.workout.log) }).props.accessibilityState.disabled).toBe(true);
  });

  it('the quest screen shows the workout and sends its log', async () => {
    const store = testStore({ view: project(workoutState(), []) });
    const enqueue = jest.fn(async (_event: Omit<PhoneEvent, 'id'>) => {});
    store.setState({ enqueue: enqueue as never });
    const onTraining = jest.fn();
    await render(withStore(store, <Quest questId={200} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onTraining={onTraining} now={() => DAY_TWO_NOW} />));
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.workout.change }));
    expect(onTraining).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: BAR(PLAY_TEXT.workout.log) }));
    const sent = enqueue.mock.calls.at(-1)![0];
    expect(sent).toMatchObject({ type: 'complete', instanceId: 200 });
    expect((sent as unknown as { payload: { sets: number[] } }).payload.sets).toHaveLength(6);
  });
});

describe("the book a reading quest tracks (M6d, Scholar's Path)", () => {
  it('shows on the quest screen, and only when there is one', async () => {
    await renderQuest(withCore({ book: 'Dune' }), coreOf(SERVER).id);
    expect(screen.getByText('Reading: Dune')).toBeTruthy();
  });

  it('is absent without a book', async () => {
    await renderQuest(SERVER, coreOf(SERVER).id);
    expect(screen.queryByText(/^Reading: /)).toBeNull();
  });
});

it("an offline quest's screen follows its slot once the server's day replaced the offline one (M6e)", async () => {
  const server = adjustState();
  await renderQuest(server, -1, {}, () => DAY_TWO_NOW);
  expect(screen.queryByText(PLAY_TEXT.quest.gone)).toBeNull();
  expect(screen.getByText(questSummary(server.today!.quests[0]!))).toBeTruthy(); // push-1, the core quest (id 200)
});

it('"Quest cleared" for the recovery quest says the day is taken back when today ends (M7a)', async () => {
  await renderCleared({ numbers: { ...NUMBERS, discipline: false, streak: null, recovered: true } });
  expect(screen.getByText(PLAY_TEXT.cleared.recovered)).toBeTruthy();
});
