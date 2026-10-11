import { ACHIEVEMENTS, ADJUST_TEXT, GOOGLE_ERRORS } from '@levelmeup/content';
import { EXERCISE_SAFETY_LINE, STAT_NAMES, authoredTemplate, questSummary, renderWhy } from '@levelmeup/content';
import { DAY_MS, newLadder } from '@levelmeup/rules';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { Celebration } from '../src/screens/Celebration.tsx';
import { Character } from '../src/screens/Character.tsx';
import { Chronicle, dayOutcome } from '../src/screens/Chronicle.tsx';
import { Settings } from '../src/screens/Settings.tsx';
import { Today } from '../src/screens/Today.tsx';
import { DAY_TWO_NOW, adjustState, completeEvent, ladderRows, profileRow, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs 12:00–20:00 UTC (8 PM–4 AM in Manila)
const now = () => NOW;
const SERVER = serverState(['side1']);
const quests = SERVER.today!.quests;
const core = quests.find((q) => q.slot === 'core')!;
const side1 = quests.find((q) => q.slot === 'side1')!;
const side2 = quests.find((q) => q.slot === 'side2')!;
const xpOf = (q: (typeof quests)[number]) => Object.values(q.xp).reduce((s, x) => s + (x ?? 0), 0);

async function renderToday(over: Parameters<typeof testStore>[0] = {}, server: ServerState = SERVER) {
  const store = testStore({ view: project(server, []), ...over });
  const onSettings = jest.fn();
  const onOpenQuest = jest.fn();
  await render(withStore(store, <Today onSettings={onSettings} onOpenQuest={onOpenQuest} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} now={now} />));
  return { store, onSettings, onOpenQuest };
}

describe('Today', () => {
  it('opens a quest when its card is tapped (M6a)', async () => {
    const { onOpenQuest } = await renderToday();
    await fireEvent.press(screen.getByText(authoredTemplate(core.templateId).voice.system.title));
    expect(onOpenQuest).toHaveBeenCalledWith(core.id);
    await fireEvent.press(screen.getByText(authoredTemplate(side2.templateId).voice.system.title));
    expect(onOpenQuest).toHaveBeenCalledWith(side2.id);
  });

  it('shows the core quest\'s picture, or its ink fallback, as part of the card for TalkBack (M6a, review)', async () => {
    await renderToday();
    expect(screen.getByTestId('quest-art-fallback', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByLabelText(/quest picture/)).toBeNull(); // not a stop of its own inside the card
    expect(screen.getAllByRole('button').filter((b) => b.props.accessibilityHint === 'Opens the quest').length).toBe(4);
  });

  it('shows the day, the player, the XP bar, the streak and shields', async () => {
    await renderToday();
    expect(screen.getByText('SAT · 10 OCT')).toBeTruthy();
    expect(screen.getByText('DAY 1')).toBeTruthy();
    expect(screen.getByText('RIN')).toBeTruthy();
    expect(screen.getByText(/^LV \d+ Warrior$/)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: /Level \d+ progress/ })).toBeTruthy();
    expect(screen.getByText('day streak')).toBeTruthy();
    expect(screen.getByText('of 2 shields')).toBeTruthy();
  });

  it('shows the core quest in the player\'s voice, with its target, why, safety line and XP stamp', async () => {
    await renderToday();
    const template = authoredTemplate(core.templateId);
    expect(screen.getByText(template.voice.system.title)).toBeTruthy();
    expect(screen.getByText(questSummary(template, core.hardDay))).toBeTruthy();
    expect(screen.getByText(renderWhy(core.why, 'system', { classId: 'warrior' }))).toBeTruthy();
    if (template.exercise !== null) expect(screen.getAllByText(EXERCISE_SAFETY_LINE).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(`+${xpOf(core)} XP`)).toBeTruthy();
  });

  it('shows the side quests: open ones with their XP, cleared ones with the time and a stamp', async () => {
    await renderToday();
    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect(screen.getByText(authoredTemplate(side2.templateId).voice.system.title)).toBeTruthy();
    expect(screen.getAllByText(`+${xpOf(side2)} XP`).length).toBeGreaterThan(0);
    expect(screen.getByText(`${STAT_NAMES[side1.stat]} · cleared 21:00`)).toBeTruthy();
    expect(screen.getByLabelText(`Cleared +${xpOf(side1)}`)).toBeTruthy();
  });

  it('marks a quest whose change the server hasn\'t confirmed', async () => {
    await renderToday({ view: project(SERVER, [completeEvent(core.id)]) });
    expect(screen.getByText('Will sync')).toBeTruthy();
    expect(screen.getAllByLabelText(`Cleared +${xpOf(core)}`)).toHaveLength(2); // the core quest and side quest 1
  });

  it('offline: the cached quests stay, with a quiet "will sync" mark and no error wording', async () => {
    await renderToday({ status: 'offline' });
    expect(screen.getByText('Offline · will sync')).toBeTruthy();
    expect(screen.getByText(authoredTemplate(core.templateId).voice.system.title)).toBeTruthy();
    expect(screen.queryByText(/error|failed/i)).toBeNull();
  });

  it('nothing cached yet and syncing: "preparing your trials", no retry yet', async () => {
    await renderToday({ phase: 'loading', view: null, status: 'syncing' });
    expect(screen.getByLabelText('System: The System is preparing your trials.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it.each(['offline', 'retrying', 'idle'] as const)('nothing cached and %s: "preparing" with a retry that syncs', async (status) => {
    const { store } = await renderToday({ phase: 'loading', view: null, status });
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(store.getState().syncNow).toHaveBeenCalled();
  });

  it('a cached day that has ended is not offered: "preparing" until the next day arrives', async () => {
    const ended = { ...SERVER, today: { ...SERVER.today!, endsAt: new Date(NOW - 1).toISOString() } };
    await renderToday({ status: 'offline' }, ended);
    expect(screen.getByLabelText('System: The System is preparing your trials.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('a lost sign-in is explained, and starting again needs a second, explicit tap', async () => {
    const { store } = await renderToday({ signInLost: true });
    expect(screen.getByLabelText(/^System: This phone lost its guest sign-in/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Yes, start again' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Start again as a new guest' }));
    expect(store.getState().startOver).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('button', { name: 'Yes, start again' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Start again as a new guest' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Yes, start again' }));
    expect(store.getState().startOver).toHaveBeenCalledTimes(1);
  });

  it('shows a refused action as a plain notice that can be dismissed', async () => {
    const { store } = await renderToday({ notices: [{ eventId: 'e1', code: 'day_closed' }] });
    expect(screen.getByLabelText('System: That day had already closed, so the change was not saved.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(store.getState().dismissNotice).toHaveBeenCalledWith('e1');
  });

  it('the gear opens Settings', async () => {
    const { onSettings } = await renderToday();
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(onSettings).toHaveBeenCalled();
  });
});

describe('Character', () => {
  it('shows the level and the five stats with points, rank and XP to the next point', async () => {
    const view = project(SERVER, []);
    await render(withStore(testStore({ view }), <Character onChangeClass={jest.fn()} />));
    expect(screen.getByText(`Level ${view.character.level} · Warrior`)).toBeTruthy();
    for (const stat of ['strength', 'vitality', 'wisdom', 'focus', 'discipline'] as const) {
      expect(screen.getByText(STAT_NAMES[stat])).toBeTruthy();
    }
    expect(screen.getAllByText(/^\d+ points$/)).toHaveLength(5);
    expect(screen.getAllByLabelText(/^Rank [EDCBAS]$/)).toHaveLength(5);
  });

  it('offline: shows when it last synced', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), status: 'offline', lastSyncedAt: Date.UTC(2026, 9, 10, 12, 30) }), <Character onChangeClass={jest.fn()} />));
    expect(screen.getByText('Last synced 20:30')).toBeTruthy();
  });
});

describe('Chronicle', () => {
  it('on day 1: the streak and "your chronicle begins today"', async () => {
    await render(withStore(testStore({ view: project(SERVER, []) }), <Chronicle />));
    expect(screen.getByText('0-day streak')).toBeTruthy();
    expect(screen.getByLabelText('System: Your chronicle begins today.')).toBeTruthy();
  });

  it('lists the recent days with their outcome', async () => {
    const recentDays: ServerState['recentDays'] = [
      { dayNumber: 3, startsAt: '2026-10-11T20:00:00.000Z', status: 'closed', resolution: 'streak_day', cleared: 2 },
      { dayNumber: 2, startsAt: '2026-10-10T20:00:00.000Z', status: 'closed', resolution: 'awaiting_checkin', cleared: 0 },
    ];
    await render(withStore(testStore({ view: { ...project(SERVER, []), recentDays } }), <Chronicle />));
    expect(screen.getByText('Day 3')).toBeTruthy();
    expect(screen.getByText('MON · 12 OCT')).toBeTruthy();
    expect(screen.getByText('Cleared 2')).toBeTruthy();
    expect(screen.getByText('Check-in due')).toBeTruthy();
  });

  it('names each outcome plainly', () => {
    const day = { dayNumber: 1, startsAt: '', status: 'closed' as const, resolution: null, cleared: 0 };
    expect(dayOutcome({ ...day, resolution: 'protected' })).toBe('Protected');
    expect(dayOutcome({ ...day, status: 'open' })).toBe('In progress');
  });
});

describe('Settings', () => {
  it('shows the guest line, sync status, the medical note and the version; Sync now syncs', async () => {
    const store = testStore({ view: project(SERVER, []), lastSyncedAt: Date.UTC(2026, 9, 10, 12, 30), pending: [completeEvent(1), completeEvent(2)] });
    const onBack = jest.fn();
    await render(withStore(store, <Settings onBack={onBack} onDeveloper={() => {}} version="0.1.0" deviceZone="Asia/Manila" />));
    expect(screen.getByText('Playing as a guest.')).toBeTruthy();
    expect(screen.getByText('Last synced 20:30')).toBeTruthy();
    expect(screen.getByText('2 waiting')).toBeTruthy();
    expect(screen.getByText('LevelMeUp is not medical advice.')).toBeTruthy();
    expect(screen.getByText('Version 0.1.0')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sync now' }));
    expect(store.getState().syncNow).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Developer' })).toBeTruthy();
  });

  it('offers a guest to save with Google, and shows a saved account', async () => {
    const saveWithGoogle = jest.fn(async () => ({ ok: false as const, code: 'cancelled' as const }));
    const store = testStore({ account: { kind: 'guest' }, saveWithGoogle });
    await render(withStore(store, <Settings onBack={() => {}} version="0.1.0" deviceZone="Asia/Manila" />));
    await fireEvent.press(screen.getByRole('button', { name: 'Save with Google' }));
    expect(saveWithGoogle).toHaveBeenCalled();
    expect(screen.getByText(GOOGLE_ERRORS.cancelled)).toBeTruthy();
  });

  it('shows the Google account a character is saved with', async () => {
    const store = testStore({ account: { kind: 'saved', email: 'rin@example.com' } });
    await render(withStore(store, <Settings onBack={() => {}} version="0.1.0" deviceZone="Asia/Manila" />));
    expect(screen.getByText('Saved with Google.')).toBeTruthy();
    expect(screen.getByText('rin@example.com')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save with Google' })).toBeNull();
  });

  it('shows a refused sync as plain text, never hides the outbox', async () => {
    await render(withStore(testStore({ error: 'The server refused a sync (400 bad_body).' }), <Settings onBack={() => {}} version="0.1.0" deviceZone="UTC" />));
    expect(screen.getByText('The server refused a sync (400 bad_body).')).toBeTruthy();
    expect(screen.getByText('Not synced yet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Developer' })).toBeNull();
  });
});

describe('Celebration (M6a decision 8)', () => {
  it('shows nothing while nothing is queued', async () => {
    await render(withStore(testStore(), <Celebration />));
    expect(screen.queryByText('LEVEL UP')).toBeNull();
    expect(screen.queryByText('ACHIEVEMENT')).toBeNull();
  });

  it('scrolls, so a long achievement at the largest text size is never cut off (review)', async () => {
    await render(withStore(testStore({ celebrations: [{ kind: 'level', level: 4 }] }), <Celebration />));
    expect(screen.getByTestId('celebration-scroll')).toBeTruthy();
  });

  it('shows a level-up, and Continue dismisses it', async () => {
    const store = testStore({ celebrations: [{ kind: 'level', level: 7 }] });
    await render(withStore(store, <Celebration />));
    expect(screen.getByText('LEVEL UP')).toBeTruthy();
    expect(screen.getByText('LV 7')).toBeTruthy();
    expect(screen.getByText('Level 7. The System marks your growth.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(store.getState().dismissCelebration).toHaveBeenCalled();
  });

  it('is a modal: the screen behind can\'t be touched or reached, and Back dismisses it (emulator check)', async () => {
    const store = testStore({ celebrations: [{ kind: 'level', level: 3 }] });
    await render(withStore(store, <Celebration />));
    const modal = screen.getByTestId('celebration');
    expect(modal.props.visible).toBe(true);
    modal.props.onRequestClose();
    expect(store.getState().dismissCelebration).toHaveBeenCalled();
  });

  it('shows an achievement with its name, what it was for, and its title', async () => {
    const titled = ACHIEVEMENTS.find((a) => a.title !== null)!;
    await render(withStore(testStore({ celebrations: [{ kind: 'achievement', id: titled.id }] }), <Celebration />));
    expect(screen.getByText('ACHIEVEMENT')).toBeTruthy();
    expect(screen.getByText(titled.name)).toBeTruthy();
    expect(screen.getByText(titled.description)).toBeTruthy();
    expect(screen.getByText(`Title earned: ${titled.title}`)).toBeTruthy();
  });
});

it('Today shows the day\'s adjustments, and "I felt pain" under an exercise core quest (M6b)', async () => {
  const onPain = jest.fn();
  await render(withStore(testStore({ view: project(adjustState(), []) }),
    <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={onPain} onVanish={jest.fn()} now={() => DAY_TWO_NOW} />));
  expect(screen.getByRole('button', { name: 'Swap · 1 left' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.pain.open }));
  expect(onPain).toHaveBeenCalledWith(200);
});

it("Today tags a quest whose exercise is resting after pain (M6b review)", async () => {
  const resting = adjustState({ ladders: ladderRows({ push: { ...newLadder(1), paused: true } }) });
  await render(withStore(testStore({ view: project(resting, []) }),
    <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} now={() => DAY_TWO_NOW} />));
  expect(screen.getAllByText(ADJUST_TEXT.paused.tag)).toHaveLength(1); // the core quest, push-1
});

it('Character offers a class change, and says when the next one opens (M6b)', async () => {
  const onChangeClass = jest.fn();
  const changed = adjustState({ profile: profileRow(undefined, { class_changed_at: new Date(DAY_TWO_NOW - 3 * DAY_MS) }) });
  await render(withStore(testStore({ view: project(changed, []) }), <Character onChangeClass={onChangeClass} now={() => DAY_TWO_NOW} />));
  expect(screen.getByText(/Your next class change opens on/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.classChange.open }));
  expect(onChangeClass).toHaveBeenCalled();
});
