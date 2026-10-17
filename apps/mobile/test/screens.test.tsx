import {
  ACHIEVEMENTS, ADJUST_TEXT, BOOK_TEXT, CHECKIN_TEXT, CHRONICLE_TEXT, GOOGLE_ERRORS, LIGHTER_TEXT, OFFLINE_TEXT, PLAY_TEXT, TODAY_TEXT, fillText,
} from '@levelmeup/content';
import { EXERCISE_SAFETY_LINE, STAT_NAMES, authoredTemplate, questSummary, renderWhy } from '@levelmeup/content';
import { DAY_MS, levelForXp, newLadder } from '@levelmeup/rules';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { dateKeyLabel } from '../src/lib/dates.ts';
import type { ServerState } from '../src/game/types.ts';
import { Book } from '../src/screens/Book.tsx';
import { Celebration } from '../src/screens/Celebration.tsx';
import { Character } from '../src/screens/Character.tsx';
import { Chronicle } from '../src/screens/Chronicle.tsx';
import { Settings } from '../src/screens/Settings.tsx';
import { Today } from '../src/screens/Today.tsx';
import {
  DAY_TWO_NOW, adjustState, characterRow, checkinState, completeEvent, ladderRows, offlineEvent, profileRow, serverState,
} from './support/fixtures.ts';
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
  const onTraining = jest.fn();
  await render(withStore(store,
    <Today
      onSettings={onSettings} onOpenQuest={onOpenQuest} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={onTraining}
      onCheckin={jest.fn()} now={now}
    />));
  return { store, onSettings, onOpenQuest, onTraining };
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
    expect(within(screen.getByTestId('up-next')).getByTestId('quest-art-fallback', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByLabelText(/quest picture/)).toBeNull(); // not a stop of its own inside the card
    // M8b: the reading has no button until the day has an article. M12: Up next and the open side quest open their quest;
    // the cleared one waits folded under "Done today".
    expect(screen.getAllByRole('button').filter((b) => b.props.accessibilityHint === 'Opens the quest').length).toBe(2);
    expect(screen.getByText(/Today's reading opens once the daily articles arrive/)).toBeTruthy();
  });

  it('shows the day, the player, the XP bar, the streak and shields', async () => {
    await renderToday();
    expect(screen.getByText('SAT · 10 OCT')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Day 1' })).toBeTruthy();
    expect(screen.getByText(/^Rin · Lv \d+ Warrior$/)).toBeTruthy(); // M12: one line
    expect(screen.getByRole('progressbar', { name: /Level \d+ progress/ })).toBeTruthy();
    expect(screen.getByText('day streak')).toBeTruthy();
    // M10c: shields as the icon and the number; the label still says it in full.
    expect(screen.getByLabelText('0 of 2 shields')).toBeTruthy();
  });

  it('shows the core quest as Up next in the player\'s voice, with its target, safety line and XP; its why is on its screen', async () => {
    await renderToday();
    const template = authoredTemplate(core.templateId);
    const next = within(screen.getByTestId('up-next'));
    expect(next.getByText(template.voice.system.title)).toBeTruthy();
    expect(next.getByText(questSummary(core))).toBeTruthy();
    expect(screen.queryByText(renderWhy(core.why, 'system', { classId: 'warrior' }))).toBeNull(); // M12: the quest screen keeps it
    if (template.exercise !== null) expect(next.getAllByText(EXERCISE_SAFETY_LINE).length).toBeGreaterThan(0);
    expect(next.getByText(`· +${xpOf(core)} XP`)).toBeTruthy();
  });

  it('shows the other open quests as rows with their XP, and the cleared ones folded under Done today', async () => {
    await renderToday();
    expect(screen.getByText('2 left')).toBeTruthy(); // side quest 2 and the reading
    expect(screen.getByText(authoredTemplate(side2.templateId).voice.system.title)).toBeTruthy();
    expect(screen.getByText(`+${xpOf(side2)}`)).toBeTruthy();
    expect(screen.queryByText(`${STAT_NAMES[side1.stat]} · cleared 21:00`)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Done today · 1' }));
    expect(screen.getByText(`${STAT_NAMES[side1.stat]} · cleared 21:00`)).toBeTruthy();
    expect(screen.getByText(`Cleared +${xpOf(side1)}`)).toBeTruthy(); // M10c: a quiet line, not a stamp
  });

  it('marks a quest whose change the server hasn\'t confirmed', async () => {
    await renderToday({ view: project(SERVER, [completeEvent(core.id)]) });
    await fireEvent.press(screen.getByRole('button', { name: 'Done today · 2' }));
    expect(screen.getByText('Will sync')).toBeTruthy();
    expect(screen.getAllByText(`Cleared +${xpOf(core)}`)).toHaveLength(2); // the core quest and side quest 1
  });

  it('offline: the cached quests stay, with a quiet "will sync" mark and no error wording', async () => {
    await renderToday({ status: 'offline' });
    expect(screen.getByText('Offline · will sync')).toBeTruthy();
    expect(screen.getByText(authoredTemplate(core.templateId).voice.system.title)).toBeTruthy();
    expect(screen.queryByText(/error|failed/i)).toBeNull();
  });

  it('nothing cached yet and syncing: a skeleton, no retry yet (M12, audit 11)', async () => {
    await renderToday({ phase: 'loading', view: null, status: 'syncing' });
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it.each([
    ['offline', 'state-offline', TODAY_TEXT.states.offline],
    ['retrying', 'state-failed', TODAY_TEXT.states.failed],
    ['idle', 'state-empty', TODAY_TEXT.states.waiting],
  ] as const)('nothing cached and %s: says which, with a retry that syncs', async (status, id, title) => {
    const { store } = await renderToday({ phase: 'loading', view: null, status });
    expect(screen.getByTestId(id)).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(store.getState().syncNow).toHaveBeenCalled();
  });

  it('a cached day that has ended is not offered: it says so until the next day arrives', async () => {
    const ended = { ...SERVER, today: { ...SERVER.today!, endsAt: new Date(NOW - 1).toISOString() } };
    await renderToday({ status: 'idle' }, ended);
    expect(screen.getByText(TODAY_TEXT.states.ended)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByTestId('up-next')).toBeNull();
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

describe('Character (M6d)', () => {
  const L10 = (() => { let t = 0; while (levelForXp(t) < 10) t += 10; return t; })();
  /** A level-10 Mage reading Dune since 5 Oct, 3 sessions and 45 minutes in. */
  const mageView = () => {
    const state = adjustState({
      profile: profileRow(undefined, { class_id: 'mage', book: 'Dune', book_started_at: new Date('2026-10-05T00:00:00.000Z') }),
      character: characterRow({ xp_wisdom: L10 }),
    });
    return project({ ...state, reading: { sessions: 3, minutes: 45 } }, []);
  };

  it('shows the portrait frame, the name, the level and the XP', async () => {
    const view = project(SERVER, []);
    await render(withStore(testStore({ view }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByLabelText('Warrior portrait, level 1')).toBeTruthy();
    expect(screen.getByText(view.profile.name)).toBeTruthy();
    expect(screen.getByText('Lv 1 Warrior')).toBeTruthy();
    expect(screen.getByText(/XP total/)).toBeTruthy();
    expect(screen.getByText('Next: Level 2')).toBeTruthy();
  });

  it('shows each stat with a bar to its next point, its rank, and how Discipline grows', async () => {
    await render(withStore(testStore({ view: project(SERVER, []) }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    for (const stat of ['strength', 'vitality', 'wisdom', 'focus', 'discipline'] as const) {
      expect(screen.getByText(STAT_NAMES[stat])).toBeTruthy();
      expect(screen.getByLabelText(`${STAT_NAMES[stat]} progress to the next point`)).toBeTruthy();
    }
    expect(screen.getAllByText(/^Rank [EDCBAS]$/)).toHaveLength(5); // M10c: a quiet line beside the points
    expect(screen.getByText(/grows only from showing up$/)).toBeTruthy();
  });

  it("shows the class path: each ability and when it unlocks", async () => {
    await render(withStore(testStore({ view: project(SERVER, []) }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByText('Second Wind')).toBeTruthy();
    expect(screen.getByText('Level 5 · 4 to go')).toBeTruthy();
    expect(screen.getByText('Unbreakable')).toBeTruthy();
    expect(screen.getByText('Level 10 · 9 to go')).toBeTruthy();
    expect(screen.queryByText("Scholar's Path")).toBeNull();
  });

  it('shows the latest title, the achievements earned and how many are still hidden', async () => {
    const view = { ...project(SERVER, []), achievements: ['first-trial', 'trials-100'] };
    await render(withStore(testStore({ view }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByText('“The Tireless”')).toBeTruthy();
    expect(screen.getByText('First Trial')).toBeTruthy();
    expect(screen.getByText(`${ACHIEVEMENTS.length - 2} still hidden.`)).toBeTruthy();
  });

  it('M12 (board R3-6): how many are earned, the latest three with See all, and the next within reach with progress', async () => {
    const earned = ['first-trial', 'trials-10', 'level-5', 'streak-7', 'rung-1'];
    const view = { ...project(SERVER, []), achievements: earned };
    await render(withStore(testStore({ view }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByText('Achievements · 5 earned')).toBeTruthy();
    expect(screen.getByText('New Ground')).toBeTruthy(); // newest first
    expect(screen.queryByText('First Trial')).toBeNull(); // the oldest waits behind See all
    await fireEvent.press(screen.getByRole('button', { name: 'See all 5' }));
    expect(screen.getByText('First Trial')).toBeTruthy();
    // The next of each kind: 50 quests, level 10, a 14-day streak.
    expect(screen.getByText('Within reach')).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(`^Fifty Trials\. Clear 50 quests\. ${view.growth.questsCleared} of 50 quests$`))).toBeTruthy();
    expect(screen.getByText('At Lv 10')).toBeTruthy();
    expect(screen.getByText(`Best streak ${view.character.streak.best} of 14 days`)).toBeTruthy();
  });

  it('with nothing earned, says the first achievement is one quest away', async () => {
    await render(withStore(testStore({ view: project(SERVER, []) }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByText('Your first achievement is one quest away.')).toBeTruthy();
  });

  it('shows the vow sworn in onboarding', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), vow: 'I rise at dawn' }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByText('“I rise at dawn”')).toBeTruthy();
  });

  it("Scholar's Path for a Mage at level 10: the book, its progress, and a way to change it", async () => {
    const onOpenBook = jest.fn();
    await render(withStore(testStore({ view: mageView() }), <Character onChangeClass={jest.fn()} onOpenBook={onOpenBook} />));
    expect(screen.getAllByText("Scholar's Path")).toHaveLength(2); // on the class path, and its card
    expect(screen.getByText('Dune')).toBeTruthy();
    expect(screen.getByText('3 sessions · 45 min since Mon 5 Oct')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Change book' }));
    expect(onOpenBook).toHaveBeenCalled();
  });

  it('offline: shows when it last synced', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), status: 'offline', lastSyncedAt: Date.UTC(2026, 9, 10, 12, 30) }),
      <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByText('Last synced 20:30')).toBeTruthy();
  });
});

describe('Chronicle (M6d)', () => {
  type Calendar = ServerState['calendar'];
  const withCalendar = (calendar: Calendar, over: Partial<ServerState> = {}) => ({ ...project(SERVER, []), calendar, ...over });
  const disabled = (name: string) => screen.getByRole('button', { name }).props.accessibilityState.disabled;

  it('shows the streak, the best streak and the shields as tiles', async () => {
    const view = project(SERVER, []);
    const streak = { ...view.character.streak, current: 3, best: 5, shields: 1 };
    await render(withStore(testStore({ view: { ...view, character: { ...view.character, streak } } }), <Chronicle />));
    expect(screen.getByLabelText('Streak 3')).toBeTruthy();
    expect(screen.getByLabelText('Best 5')).toBeTruthy();
    expect(screen.getByLabelText('Shields 1 / 2')).toBeTruthy();
  });

  it('on day 1: today on the calendar, and the first quests waiting', async () => {
    const view = project(SERVER, []);
    await render(withStore(testStore({ view }), <Chronicle />));
    expect(view.calendar).toHaveLength(1);
    expect(screen.getByLabelText(`${dateKeyLabel(view.calendar[0]!.date)}, today`)).toBeTruthy();
    expect(screen.getByText('Your first quests are waiting.')).toBeTruthy();
  });

  it('names each day of the month by its date and mark, never as a miss', async () => {
    const calendar: Calendar = [
      { dayNumber: 6, date: '2026-10-15', mark: 'open' },
      { dayNumber: 5, date: '2026-10-14', mark: 'cleared' },
      { dayNumber: 4, date: '2026-10-13', mark: 'hard' },
      { dayNumber: 3, date: '2026-10-12', mark: 'rest' },
      { dayNumber: 2, date: '2026-10-11', mark: 'paused' },
      { dayNumber: 1, date: '2026-10-10', mark: 'none' },
    ];
    await render(withStore(testStore({ view: withCalendar(calendar) }), <Chronicle />));
    expect(screen.getByText('OCTOBER 2026')).toBeTruthy();
    expect(screen.getByLabelText('Thu 15 Oct, today')).toBeTruthy();
    expect(screen.getByLabelText('Wed 14 Oct, cleared')).toBeTruthy();
    expect(screen.getByLabelText('Tue 13 Oct, hard day')).toBeTruthy();
    expect(screen.getByLabelText('Mon 12 Oct, rest')).toBeTruthy();
    expect(screen.getByLabelText('Sun 11 Oct, paused')).toBeTruthy();
    expect(screen.getByLabelText('Sat 10 Oct')).toBeTruthy();
    expect(screen.getByLabelText('Fri 16 Oct')).toBeTruthy();
    expect(screen.getAllByLabelText(/^\w{3} \d+ Oct/)).toHaveLength(31);
  });

  it("goes back to an earlier month the chronicle reaches, and forward again; no further", async () => {
    const calendar: Calendar = [
      { dayNumber: 2, date: '2026-10-01', mark: 'open' },
      { dayNumber: 1, date: '2026-09-30', mark: 'cleared' },
    ];
    await render(withStore(testStore({ view: withCalendar(calendar) }), <Chronicle />));
    expect(disabled(CHRONICLE_TEXT.next)).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: CHRONICLE_TEXT.previous }));
    expect(screen.getByText('SEPTEMBER 2026')).toBeTruthy();
    expect(screen.getByLabelText('Wed 30 Sep, cleared')).toBeTruthy();
    expect(disabled(CHRONICLE_TEXT.previous)).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: CHRONICLE_TEXT.next }));
    expect(screen.getByText('OCTOBER 2026')).toBeTruthy();
  });

  it('follows today into a new month (review)', async () => {
    const store = testStore({ view: withCalendar([{ dayNumber: 1, date: '2026-10-31', mark: 'open' }]) });
    await render(withStore(store, <Chronicle />));
    expect(screen.getByText('OCTOBER 2026')).toBeTruthy();
    await act(async () => {
      store.setState({ view: withCalendar([{ dayNumber: 2, date: '2026-11-01', mark: 'open' }, { dayNumber: 1, date: '2026-10-31', mark: 'cleared' }]) });
    });
    expect(screen.getByText('NOVEMBER 2026')).toBeTruthy();
  });

  it('with no earlier days there is no earlier month', async () => {
    await render(withStore(testStore({ view: project(SERVER, []) }), <Chronicle />));
    expect(disabled(CHRONICLE_TEXT.previous)).toBe(true);
    expect(disabled(CHRONICLE_TEXT.next)).toBe(true);
  });

  it('shows growth since day 1', async () => {
    const growth: ServerState['growth'] = {
      since: '2026-09-29', levels: 1, stats: { strength: 2, vitality: 1, wisdom: 0, focus: 0, discipline: 3 }, questsCleared: 4, newRungs: 2,
    };
    await render(withStore(testStore({ view: { ...project(SERVER, []), growth } }), <Chronicle />));
    expect(screen.getByText('Since day 1 · Tue 29 Sep')).toBeTruthy();
    expect(screen.getByLabelText('Strength +2')).toBeTruthy();
    expect(screen.getByText('STR')).toBeTruthy();
    expect(screen.getByText('1 level gained, 4 quests cleared, 2 new rungs reached.')).toBeTruthy();
  });

  it('before any day: "your chronicle begins today"', async () => {
    await render(withStore(testStore({ view: null }), <Chronicle />));
    expect(screen.getByLabelText(`System: ${CHRONICLE_TEXT.empty}`)).toBeTruthy();
  });
});

describe('Settings', () => {
  it('shows the guest line, sync status, the medical note and the version; Sync now syncs', async () => {
    const store = testStore({ view: project(SERVER, []), lastSyncedAt: Date.UTC(2026, 9, 10, 12, 30), pending: [completeEvent(1), completeEvent(2)] });
    const onBack = jest.fn();
    const onTraining = jest.fn();
    await render(withStore(store, <Settings onBack={onBack} onDeveloper={() => {}} onTraining={onTraining} onGame={() => {}} onDelete={() => {}} version="0.1.0" deviceZone="Asia/Manila" />));
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
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.training.open })); // M6c: Game → Training
    expect(onTraining).toHaveBeenCalled();
  });

  it('offers a guest to save with Google, and shows a saved account', async () => {
    const saveWithGoogle = jest.fn(async () => ({ ok: false as const, code: 'cancelled' as const }));
    const store = testStore({ account: { kind: 'guest' }, saveWithGoogle });
    await render(withStore(store, <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} version="0.1.0" deviceZone="Asia/Manila" />));
    await fireEvent.press(screen.getByRole('button', { name: 'Save with Google' }));
    expect(saveWithGoogle).toHaveBeenCalled();
    expect(screen.getByText(GOOGLE_ERRORS.cancelled)).toBeTruthy();
  });

  it('shows the Google account a character is saved with', async () => {
    const store = testStore({ account: { kind: 'saved', email: 'rin@example.com' } });
    await render(withStore(store, <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} version="0.1.0" deviceZone="Asia/Manila" />));
    expect(screen.getByText('Saved with Google.')).toBeTruthy();
    expect(screen.getByText('rin@example.com')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save with Google' })).toBeNull();
  });

  it('shows a refused sync as plain text, never hides the outbox', async () => {
    await render(withStore(testStore({ error: 'The server refused a sync (400 bad_body).' }), <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} version="0.1.0" deviceZone="UTC" />));
    expect(screen.getByText('The server refused a sync (400 bad_body).')).toBeTruthy();
    expect(screen.getByText('Not synced yet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Developer' })).toBeNull();
  });
});

describe('Celebration (M6a decision 8)', () => {
  it('shows nothing while nothing is queued', async () => {
    await render(withStore(testStore(), <Celebration />));
    expect(screen.queryByText('Level up')).toBeNull();
    expect(screen.queryByText('Achievement')).toBeNull();
  });

  it('scrolls, so a long achievement at the largest text size is never cut off (review)', async () => {
    await render(withStore(testStore({ celebrations: [{ kind: 'level', level: 4, from: 3 }] }), <Celebration />));
    expect(screen.getByTestId('celebration-scroll')).toBeTruthy();
  });

  it('shows a level-up, and Continue dismisses it', async () => {
    const store = testStore({ celebrations: [{ kind: 'level', level: 7, from: 6 }] });
    await render(withStore(store, <Celebration />));
    expect(screen.getByText('Level up')).toBeTruthy();
    expect(screen.getByText('Lv 7')).toBeTruthy();
    expect(screen.getByText('Level 7. The System marks your growth.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(store.getState().dismissCelebration).toHaveBeenCalled();
  });

  it('is a modal: the screen behind can\'t be touched or reached, and Back dismisses it (emulator check)', async () => {
    const store = testStore({ celebrations: [{ kind: 'level', level: 3, from: 2 }] });
    await render(withStore(store, <Celebration />));
    const modal = screen.getByTestId('celebration');
    expect(modal.props.visible).toBe(true);
    modal.props.onRequestClose();
    expect(store.getState().dismissCelebration).toHaveBeenCalled();
  });

  it('shows an achievement with its name, what it was for, and its title', async () => {
    const titled = ACHIEVEMENTS.find((a) => a.title !== null)!;
    await render(withStore(testStore({ celebrations: [{ kind: 'achievement', id: titled.id }] }), <Celebration />));
    expect(screen.getByText('Achievement')).toBeTruthy();
    expect(screen.getByText(titled.name)).toBeTruthy();
    expect(screen.getByText(titled.description)).toBeTruthy();
    expect(screen.getByText(`Title earned: ${titled.title}`)).toBeTruthy();
  });
});

it('Today shows the day\'s adjustments, and "I felt pain" under an exercise core quest (M6b)', async () => {
  const onPain = jest.fn();
  await render(withStore(testStore({ view: project(adjustState(), []) }),
    <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={onPain} onVanish={jest.fn()} onTraining={jest.fn()} onCheckin={jest.fn()}
      now={() => DAY_TWO_NOW} />));
  // M10c decision 3: the options open from "Change today"; the pain button stays in sight.
  await fireEvent.press(screen.getByRole('button', { name: 'Change today' }));
  expect(screen.getByRole('button', { name: 'Swap · 1 left' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.pain.open }));
  expect(onPain).toHaveBeenCalledWith(200);
});

it("Today tags a quest whose exercise is resting after pain (M6b review)", async () => {
  const resting = adjustState({ ladders: ladderRows({ push: { ...newLadder(1), paused: true } }) });
  await render(withStore(testStore({ view: project(resting, []) }),
    <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()} onCheckin={jest.fn()}
      now={() => DAY_TWO_NOW} />));
  expect(screen.getAllByText(ADJUST_TEXT.paused.tag)).toHaveLength(1); // the core quest, push-1
});

it('Character offers a class change, and says when the next one opens (M6b)', async () => {
  const onChangeClass = jest.fn();
  const changed = adjustState({ profile: profileRow(undefined, { class_changed_at: new Date(DAY_TWO_NOW - 3 * DAY_MS) }) });
  await render(withStore(testStore({ view: project(changed, []) }), <Character onChangeClass={onChangeClass} onOpenBook={jest.fn()} now={() => DAY_TWO_NOW} />));
  expect(screen.getByText(/Your next class change opens on/)).toBeTruthy();
  // M10c: a row, the class and its lock as its line.
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${ADJUST_TEXT.classChange.open}\. Class: Warrior · Your next class change opens on`) }));
  expect(onChangeClass).toHaveBeenCalled();
});

describe("Scholar's Path: the book screen (M6d decision 12)", () => {
  const L10 = (() => { let t = 0; while (levelForXp(t) < 10) t += 10; return t; })();
  const mage = (book: string | null) => project(adjustState({
    profile: profileRow(undefined, { class_id: 'mage', book }),
    character: characterRow({ xp_wisdom: L10 }),
  }), []);
  const disabled = (name: string) => screen.getByRole('button', { name }).props.accessibilityState.disabled;
  async function renderBook(view: ReturnType<typeof project>) {
    const store = testStore({ view });
    const onDone = jest.fn();
    await render(withStore(store, <Book onDone={onDone} onBack={jest.fn()} />));
    return { enqueue: store.getState().enqueue as jest.Mock, onDone };
  }

  it('starts a book, its title trimmed, and goes back', async () => {
    const { enqueue, onDone } = await renderBook(mage(null));
    expect(disabled(BOOK_TEXT.start)).toBe(true);
    await fireEvent.changeText(screen.getByLabelText(BOOK_TEXT.field), '  Dune ');
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.start }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'book', title: 'Dune', finished: false });
    expect(onDone).toHaveBeenCalled();
  });

  it('switching needs a different title', async () => {
    await renderBook(mage('Dune'));
    expect(screen.getByText('Dune')).toBeTruthy();
    expect(disabled(BOOK_TEXT.switchTo)).toBe(true);
    await fireEvent.changeText(screen.getByLabelText(BOOK_TEXT.field), ' Dune');
    expect(disabled(BOOK_TEXT.switchTo)).toBe(true);
    await fireEvent.changeText(screen.getByLabelText(BOOK_TEXT.field), 'Meditations');
    expect(disabled(BOOK_TEXT.switchTo)).toBe(false);
  });

  it('switching to another book asks first: the sessions so far are not kept (review)', async () => {
    const { enqueue, onDone } = await renderBook(mage('Dune'));
    await fireEvent.changeText(screen.getByLabelText(BOOK_TEXT.field), 'Meditations');
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.switchTo }));
    expect(enqueue).not.toHaveBeenCalled();
    expect(screen.getByText('Switch to "Meditations"? The sessions read with "Dune" are not kept.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.switchYes }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'book', title: 'Meditations', finished: false });
    expect(onDone).toHaveBeenCalled();
  });

  it('a pasted tab or line break becomes a space, as the server would refuse it (review)', async () => {
    const { enqueue } = await renderBook(mage(null));
    await fireEvent.changeText(screen.getByLabelText(BOOK_TEXT.field), 'Dune\tMessiah\n');
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.start }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'book', title: 'Dune Messiah', finished: false });
  });

  it('"Finished it" asks first, then records the book', async () => {
    const { enqueue, onDone } = await renderBook(mage('Dune'));
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.finish }));
    expect(enqueue).not.toHaveBeenCalled();
    expect(screen.getByText('Mark "Dune" as finished? It joins your finished books.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.finishYes }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'book', title: null, finished: true });
    expect(onDone).toHaveBeenCalled();
  });

  it('"Set it aside" asks first; "Not now" changes nothing', async () => {
    const { enqueue } = await renderBook(mage('Dune'));
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.setAside }));
    expect(screen.getByText('Set "Dune" aside? Its sessions so far are not kept.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.notNow }));
    expect(screen.getByRole('button', { name: BOOK_TEXT.finish })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.setAside }));
    await fireEvent.press(screen.getByRole('button', { name: BOOK_TEXT.setAsideYes }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'book', title: null, finished: false });
  });

  it('is closed below a Mage at level 10', async () => {
    await renderBook(project(adjustState(), []));
    expect(screen.getByLabelText(`System: ${BOOK_TEXT.closed}`)).toBeTruthy();
    expect(screen.queryByLabelText(BOOK_TEXT.field)).toBeNull();
  });

  it('reading quests show their book on Today', async () => {
    const server = adjustState();
    const quests = server.today!.quests.map((q) => (q.slot === 'core' || q.slot === 'side2' ? { ...q, book: 'Dune' } : q));
    await render(withStore(testStore({ view: project({ ...server, today: { ...server.today!, quests } }, []) }),
      <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()} onCheckin={jest.fn()}
      now={() => DAY_TWO_NOW} />));
    expect(screen.getAllByText('Reading: Dune')).toHaveLength(2); // Up next and an open side quest's row
  });
});

it("Today's header names the date the quest day mostly covers, as Chronicle does (M6d review)", async () => {
  // Day 1 begun at 23:00 on Sun 11 Oct in Manila runs to 04:00 on Tue 13 Oct.
  const today = { ...SERVER.today!, startsAt: '2026-10-11T15:00:00.000Z', endsAt: '2026-10-12T20:00:00.000Z' };
  await renderToday({}, { ...SERVER, today });
  expect(screen.getByText('MON · 12 OCT')).toBeTruthy();
});

describe('the training notice (M6d decision 13)', () => {
  const NOTICE = `System: ${ADJUST_TEXT.training.notice}`;

  it('shows once to a player with the default training; "Set up training" opens Settings → Training', async () => {
    const { store, onTraining } = await renderToday({ trainingNoticeSeen: false });
    expect(screen.getByLabelText(NOTICE)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.training.setUp }));
    expect(onTraining).toHaveBeenCalled();
    expect(store.getState().dismissTrainingNotice).toHaveBeenCalled();
  });

  it('"Not now" only puts it away', async () => {
    const { store, onTraining } = await renderToday({ trainingNoticeSeen: false });
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.day.notNow }));
    expect(store.getState().dismissTrainingNotice).toHaveBeenCalled();
    expect(onTraining).not.toHaveBeenCalled();
  });

  it('is gone once seen', async () => {
    await renderToday();
    expect(screen.queryByLabelText(NOTICE)).toBeNull();
  });

  it.each([
    [{ equipment: ['bands' as const] }], [{ programStyle: 'women' as const }], [{ ownProgram: true }], [{ gentleStart: true }],
  ])('never shows to a player whose training is set: %j', async (profile) => {
    const view = project(SERVER, []);
    await renderToday({ view: { ...view, profile: { ...view.profile, ...profile } }, trainingNoticeSeen: false });
    expect(screen.queryByLabelText(NOTICE)).toBeNull();
  });
});

describe('a day this phone built offline (M6e decision 8)', () => {
  it("says so, and keeps the day's adjustments for after the sync", async () => {
    await renderToday({ view: project(serverState(), [offlineEvent()]) });
    expect(screen.getByText(OFFLINE_TEXT.built)).toBeTruthy();
    expect(screen.getByText(OFFLINE_TEXT.later)).toBeTruthy();
    expect(screen.queryByRole('button', { name: ADJUST_TEXT.day.hardDay })).toBeNull();
    expect(screen.queryByRole('button', { name: ADJUST_TEXT.day.rest })).toBeNull();
    expect(screen.getAllByRole('button').filter((b) => b.props.accessibilityHint === 'Opens the quest').length).toBe(3); // + the reading card (M8b)
  });

  it('shows none of it on a day from the server', async () => {
    await renderToday();
    expect(screen.queryByText(OFFLINE_TEXT.built)).toBeNull();
    expect(screen.queryByText(OFFLINE_TEXT.later)).toBeNull();
  });
});

describe('Today after a missed day (M7a)', () => {
  const T = CHECKIN_TEXT;
  /** Today on day 2 with this store; `onCheckin` opens the check-in screen. */
  async function renderToday(store: ReturnType<typeof testStore>, at: number) {
    const onCheckin = jest.fn();
    await render(withStore(store,
      <Today
        onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()}
        onCheckin={onCheckin} now={() => at}
      />));
    return { store, onCheckin };
  }

  it('asks the check-in, shows the streak paused, and opens the check-in screen', async () => {
    const { store, onCheckin } = await renderToday(testStore({ view: project(checkinState(), []) }), DAY_TWO_NOW);
    expect(screen.getByText(T.title)).toBeTruthy();
    expect(screen.getByText(T.leadYesterday)).toBeTruthy();
    expect(screen.getByText(`day streak · ${T.streakPaused}`)).toBeTruthy();
    await fireEvent.press(screen.getByText(T.open));
    expect(onCheckin).toHaveBeenCalled();
    await fireEvent.press(screen.getByText(T.openLater));
    expect(store.getState().answerLater).toHaveBeenCalledWith(7);
  });

  it('hides a check-in put off with "Later"', async () => {
    await renderToday(testStore({ view: project(checkinState(), []), checkinLater: 7 }), DAY_TWO_NOW);
    expect(screen.queryByText(T.title)).toBeNull();
  });

  it('holds the streak after "I just didn\'t" and says the recovery quest is on its way', async () => {
    const answer = { id: '00000000-0000-4000-8000-0000000000c1', type: 'checkin' as const, checkinId: 7, answer: 'just_didnt' as const, secondWind: false };
    await renderToday(testStore({ view: project(checkinState(), [answer]) }), DAY_TWO_NOW);
    expect(screen.getByText(T.held)).toBeTruthy();
    expect(screen.getByText(T.waiting)).toBeTruthy();
    expect(screen.getByText(`day streak · ${T.streakHeld}`)).toBeTruthy();
  });

  it('once the recovery quest is cleared, says the day is taken back (emulator finding, M7b)', async () => {
    const answer = { id: '00000000-0000-4000-8000-0000000000c1', type: 'checkin' as const, checkinId: 7, answer: 'just_didnt' as const, secondWind: false };
    const view = project(checkinState(), [answer]);
    const today = view.today!;
    const recovery = { ...today.quests[0]!, id: 299, slot: 'recovery' as const, completedAt: new Date(DAY_TWO_NOW).toISOString() };
    await renderToday(testStore({ view: { ...view, answering: false, today: { ...today, quests: [...today.quests, recovery] } } }), DAY_TWO_NOW);
    expect(screen.getByText(PLAY_TEXT.cleared.recovered)).toBeTruthy();
    expect(screen.queryByText(T.held)).toBeNull();
  });

  it('shows a settled miss once', async () => {
    const state = { ...checkinState(), checkin: null, checkinResult: { id: 9, outcome: 'shield' as const } };
    const { store } = await renderToday(testStore({ view: project(state, []) }), DAY_TWO_NOW);
    expect(screen.getByText(T.result.shield)).toBeTruthy();
    await fireEvent.press(screen.getByText(T.done));
    expect(store.getState().dismissCheckinResult).toHaveBeenCalledWith(9);
    await renderToday(testStore({ view: project(state, []), checkinResultSeen: 9 }), DAY_TWO_NOW);
    expect(screen.queryByText(T.result.shield)).toBeNull();
  });

  it('offers the lighter plan when the state does, both ways', async () => {
    const state = { ...checkinState(), checkin: null, lighterPlan: { from: 25, to: 15, offered: true } };
    const { store } = await renderToday(testStore({ view: project(state, []) }), DAY_TWO_NOW);
    expect(screen.getByText(fillText(LIGHTER_TEXT.offer, { from: 25, to: 15 }))).toBeTruthy();
    await fireEvent.press(screen.getByText(LIGHTER_TEXT.decline));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'lighter_plan', accept: false });
    expect(screen.queryByText(LIGHTER_TEXT.accept)).toBeNull(); // gone at the first tap: no second step down (review)
  });
});
