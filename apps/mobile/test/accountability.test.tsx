import { CHECKIN_TEXT, PACT_TEXT, PLAY_TEXT, SHADOW_LINES, SHADOW_TEXT, fillText, retreatLine, shadowLine } from '@levelmeup/content';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { AppState } from 'react-native';
import { project } from '../src/game/project.ts';
import { Character } from '../src/screens/Character.tsx';
import { Pact } from '../src/screens/Pact.tsx';
import { Quest } from '../src/screens/Quest.tsx';
import { Settings } from '../src/screens/Settings.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { Today } from '../src/screens/Today.tsx';
import { Trial, clock } from '../src/screens/Trial.tsx';
import { Reveal } from '../src/screens/onboarding/Reveal.tsx';
import { Portrait } from '../src/ui/Portrait.tsx';
import { ShadowBox } from '../src/ui/ShadowBox.tsx';
import { ShadowMark } from '../src/ui/ShadowMark.tsx';
import { DAY_TWO_NOW, READY_DRAFT, REVEAL, adjustState, claimedState, profileRow } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(async () => {}),
  deactivateKeepAwake: jest.fn(async () => {}),
}));

describe("the Shadow's look (visual spec §2–3)", () => {
  it('speaks in its own box, read as one line, speaker first', async () => {
    await render(<ShadowBox lines={['The day closed in silence, so I took it.', 'Come and take it back.']} />);
    expect(screen.getByLabelText('The Shadow: The day closed in silence, so I took it. Come and take it back.')).toBeTruthy();
    expect(screen.getByText('The Shadow')).toBeTruthy(); // sentence case (M11)
  });

  it('marks the header and the portrait, and says so to screen readers', async () => {
    await render(<ShadowMark label={SHADOW_TEXT.mark} accessibilityLabel={SHADOW_TEXT.markLabel} />);
    expect(screen.getByLabelText(SHADOW_TEXT.markLabel)).toBeTruthy();
    await render(<Portrait classId="warrior" level={3} figure="a" label="Warrior, level 3" marked />);
    expect(screen.getByLabelText('Warrior, level 3')).toBeTruthy();
    expect(screen.getByTestId('shadow-mark', { includeHiddenElements: true })).toBeTruthy();
    await render(<Portrait classId="warrior" level={3} figure="a" label="Warrior, level 3" />);
    expect(screen.queryByTestId('shadow-mark', { includeHiddenElements: true })).toBeNull();
  });
});

describe('the Accountability Pact (board F5)', () => {
  const open = async (state = adjustState(), mode: 'game' | 'draft' = 'game', over = {}) => {
    const store = testStore({ view: project(state, []), ...over });
    const onDone = jest.fn();
    await render(withStore(store, <Pact mode={mode} onDone={onDone} screenReader />));
    return { store, onDone };
  };

  it('shows the three levels in full, the preview of the Shadow and the five rules', async () => {
    await open();
    for (const level of [0, 1, 2] as const) expect(screen.getByText(PACT_TEXT.levels[level].name)).toBeTruthy();
    for (const rule of PACT_TEXT.rules) expect(screen.getByText(new RegExp(rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PACT_TEXT.preview }));
    expect(screen.getByLabelText(`The Shadow: ${SHADOW_LINES.claim[0]} ${SHADOW_LINES.mark[0]}`)).toBeTruthy();
  });

  it('signing is a deliberate act (tap, then confirm with a screen reader): it sends the level and closes', async () => {
    const { store, onDone } = await open();
    await fireEvent.press(screen.getByRole('button', { name: fillText(PACT_TEXT.signTap, { level: 1 }) }));
    expect(store.getState().enqueue).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: fillText(PACT_TEXT.signConfirm, { level: 1 }) }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'accountability_set', level: 1 });
    expect(onDone).toHaveBeenCalled();
    expect(screen.getByText(PACT_TEXT.signNote)).toBeTruthy();
  });

  it('lowering or turning it off is one tap, at once', async () => {
    const { store } = await open(claimedState('trial'));
    expect(screen.getByText(PACT_TEXT.current)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${PACT_TEXT.levels[0].name}`) }));
    expect(screen.getByText(PACT_TEXT.lowerNote)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PACT_TEXT.off }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'accountability_set', level: 0 });
  });

  it('from the reveal it keeps the level in the draft, sent when the onboarding ends', async () => {
    const { store, onDone } = await open(adjustState(), 'draft', { draft: READY_DRAFT });
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${PACT_TEXT.levels[2].name}`) }));
    await fireEvent.press(screen.getByRole('button', { name: fillText(PACT_TEXT.signTap, { level: 2 }) }));
    await fireEvent.press(screen.getByRole('button', { name: fillText(PACT_TEXT.signConfirm, { level: 2 }) }));
    expect(store.getState().editDraft).toHaveBeenCalledWith({ pact: 2 });
    expect(store.getState().enqueue).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('Settings shows the pact and opens it; until it is in force it says when it starts', async () => {
    const onPact = jest.fn();
    // Signed during day 2: it starts with day 3.
    const signed = adjustState({ profile: profileRow(undefined, { accountability_level: 1, accountability_enabled_at: new Date(DAY_TWO_NOW) }) });
    await render(withStore(testStore({ view: project(signed, []) }),
      <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} onPact={onPact} version="0.1.0" deviceZone="Asia/Manila" />));
    // M10c: a row, its level as its line.
    await fireEvent.press(screen.getByRole('button', { name: `${PACT_TEXT.settings}. ${PACT_TEXT.names[1]}` }));
    expect(onPact).toHaveBeenCalled();
    expect(screen.getByText(PACT_TEXT.startsNext)).toBeTruthy();
  });

  it('the reveal offers "Read the pact" after "real stakes", and says when a signed one starts', async () => {
    const onPact = jest.fn();
    const store = testStore({ view: project(adjustState(), []), reveal: REVEAL, draft: READY_DRAFT });
    await render(withStore(store, <Reveal onAccept={() => {}} onFix={() => {}} onPact={onPact} />));
    await fireEvent.press(screen.getByRole('button', { name: PACT_TEXT.reveal.read }));
    expect(onPact).toHaveBeenCalled();
    await act(async () => store.setState({ draft: { ...READY_DRAFT, pact: 1 } }));
    expect(screen.getByText(fillText(PACT_TEXT.reveal.signed, { name: PACT_TEXT.names[1] }))).toBeTruthy();
  });
});

describe("the Shadow's scene (board F2)", () => {
  const scene = async (state = claimedState('shadow')) => {
    const store = testStore({ view: project(state, []) });
    const props = { onDone: jest.fn(), onRecovery: jest.fn(), onTrial: jest.fn(), onPact: jest.fn() };
    await render(withStore(store, <ShadowScene {...props} now={() => DAY_TWO_NOW} />));
    return { store, ...props };
  };

  it('claims the day it took, and opening it shows it once', async () => {
    const { store } = await scene();
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('claim', 2)} ${shadowLine('mark', 2)}`)).toBeTruthy();
    expect(screen.getByText(/^Claimed · /)).toBeTruthy();
    expect(store.getState().seeShadow).toHaveBeenCalledWith(7);
  });

  it('"Take back the day" opens the recovery quest', async () => {
    const { onRecovery } = await scene();
    await fireEvent.press(screen.getByRole('button', { name: fillText(SHADOW_TEXT.takeBack, { minutes: 5 }) }));
    expect(onRecovery).toHaveBeenCalledWith(204);
  });

  it('keeps a private note', async () => {
    const { store } = await scene();
    await fireEvent.changeText(screen.getByLabelText(SHADOW_TEXT.noteLabel), '  A late shift.  ');
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.keepNote }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'checkin_note', checkinId: 7, note: 'A late shift.' });
    expect(screen.getByText(SHADOW_TEXT.noteKept)).toBeTruthy();
  });

  it('at level 2 the trial is one tap away, and the Shadow names its seal', async () => {
    const { onTrial } = await scene(claimedState('trial'));
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('claim', 2)} ${shadowLine('mark', 2)} ${shadowLine('trial', 2)}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.trial.start }));
    expect(onTrial).toHaveBeenCalled();
  });

  it('after 3 in 7 days the Shadow steps back (the lighter plan only when it is offered)', async () => {
    await scene(claimedState('paused'));
    expect(screen.getByLabelText(`The Shadow: ${retreatLine(false)}`)).toBeTruthy();
  });

  it('once the recovery quest is cleared, the Shadow lets the day go', async () => {
    await scene(claimedState('shadow', {}, ['recovery']));
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('release', 2)}`)).toBeTruthy();
    expect(screen.queryByRole('button', { name: fillText(SHADOW_TEXT.takeBack, { minutes: 5 }) })).toBeNull();
  });
});

describe('Today after a miss (board F3)', () => {
  const today = async (state = claimedState('shadow'), over = {}) => {
    const props = { onSettings: jest.fn(), onOpenQuest: jest.fn(), onSwap: jest.fn(), onPain: jest.fn(), onVanish: jest.fn(), onTraining: jest.fn(), onCheckin: jest.fn(), onShadow: jest.fn(), onTrial: jest.fn() };
    await render(withStore(testStore({ view: project(state, []), ...over }), <Today {...props} now={() => DAY_TWO_NOW} />));
    return props;
  };
  it('puts the recovery quest Up next while it is open, for every player (M12 decision 3)', async () => {
    await today(claimedState(null));
    expect(within(screen.getByTestId('up-next')).getByText(/^Recovery quest · /)).toBeTruthy();
    expect(screen.getByText(CHECKIN_TEXT.held)).toBeTruthy(); // no pact: M7a's line
  });

  it("the Shadow's mark, its line and the System's, and its claim one tap away", async () => {
    const { onShadow } = await today();
    expect(screen.getByLabelText(SHADOW_TEXT.markLabel)).toBeTruthy();
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('mark', 2)}`)).toBeTruthy();
    expect(screen.getByText(SHADOW_TEXT.heldYesterday)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.reopen }));
    expect(onShadow).toHaveBeenCalled();
  });

  it('once the recovery quest is cleared the mark goes and the Shadow lets the day go', async () => {
    await today(claimedState('shadow', {}, ['recovery']));
    expect(screen.queryByLabelText(SHADOW_TEXT.markLabel)).toBeNull();
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('release', 2)}`)).toBeTruthy();
    expect(screen.getByText(PLAY_TEXT.cleared.recovered)).toBeTruthy();
  });

  it('level 2: the Trial above the side quests, which are sealed and open the Trial; the core quest is not', async () => {
    const { onTrial, onOpenQuest } = await today(claimedState('trial'));
    expect(screen.getByText(SHADOW_TEXT.trial.line)).toBeTruthy();
    expect(screen.getAllByText(SHADOW_TEXT.trial.sealed)).toHaveLength(2);
    await fireEvent.press(screen.getAllByRole('button', { name: new RegExp(SHADOW_TEXT.trial.sealedHint) })[0]!);
    expect(onTrial).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.trial.start }));
    expect(onTrial).toHaveBeenCalledTimes(2);
    expect(onOpenQuest).not.toHaveBeenCalled();
  });

  it('turned off, or the Trial done: nothing sealed', async () => {
    await today(claimedState('trial', { trial_done_at: new Date(DAY_TWO_NOW) }));
    expect(screen.queryByText(SHADOW_TEXT.trial.sealed)).toBeNull();
  });
});

describe('a sealed side quest and the marked portrait (M7c)', () => {
  it('the quest screen asks for the Trial instead of the log', async () => {
    const onTrial = jest.fn();
    await render(withStore(testStore({ view: project(claimedState('trial'), []) }),
      <Quest questId={201} now={() => DAY_TWO_NOW} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onTrial={onTrial} />));
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('trial', 2)}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.trial.start }));
    expect(onTrial).toHaveBeenCalled();
  });

  it('Character carries the mark until the recovery quest is cleared', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(screen.getByLabelText(new RegExp(SHADOW_TEXT.markLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
  });
});

describe('the Trial of Stillness (board F4)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows minutes and seconds left', () => {
    expect(clock(10 * 60_000)).toBe('10:00');
    expect(clock(6 * 60_000 + 41_200)).toBe('06:42');
    expect(clock(-5)).toBe('00:00');
  });

  it('counts while LevelMeUp is in front, pauses when it leaves, keeps the minutes, and breaks the seal at ten', async () => {
    let t = DAY_TWO_NOW;
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const store = testStore({ view: project(claimedState('trial'), []), trialMs: jest.fn(async () => 4 * 60_000) });
    const tree = () => withStore(store, <Trial now={() => t} onDone={jest.fn()} />);
    const view = await render(tree());
    expect(await screen.findByText('06:00')).toBeTruthy(); // four minutes were kept
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('lmu-trial');
    t += 60_000;
    await act(async () => {
      for (const listener of listeners) listener('background');
    });
    expect(store.getState().saveTrialMs).toHaveBeenLastCalledWith(7, 5 * 60_000);
    t += 60 * 60_000; // away for an hour: not counted
    await act(async () => {
      for (const listener of listeners) listener('active');
    });
    t += 5 * 60_000;
    await view.rerender(tree());
    expect(screen.getByText(SHADOW_TEXT.focus.done)).toBeTruthy();
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'trial', checkinId: 7 });
    expect(store.getState().enqueue).toHaveBeenCalledTimes(1);
  });

  it('there is nothing to do without a seal', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }), <Trial now={() => DAY_TWO_NOW} onDone={jest.fn()} />));
    expect(screen.getByText(SHADOW_TEXT.focus.gone)).toBeTruthy();
  });
});

describe('the review fixes (M7c)', () => {
  afterEach(() => jest.restoreAllMocks());

  it("the System's line names the Shadow only on the day it holds", async () => {
    const props = { onSettings: jest.fn(), onOpenQuest: jest.fn(), onSwap: jest.fn(), onPain: jest.fn(), onVanish: jest.fn(), onTraining: jest.fn(), onCheckin: jest.fn() };
    await render(withStore(testStore({ view: project(claimedState('shadow', { recovery_day_id: '1' }), []) }), <Today {...props} now={() => DAY_TWO_NOW} />));
    expect(screen.getByText(CHECKIN_TEXT.held)).toBeTruthy();
    expect(screen.queryByText(SHADOW_TEXT.heldYesterday)).toBeNull();
  });

  it('a pasted tab or other control character in the note becomes a space', async () => {
    const store = testStore({ view: project(claimedState('shadow'), []) });
    await render(withStore(store, <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    await fireEvent.changeText(screen.getByLabelText(SHADOW_TEXT.noteLabel), 'Rain\tthen\r\nwind ');
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.keepNote }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'checkin_note', checkinId: 7, note: 'Rain then\nwind' });
  });

  it('ten minutes kept from before: the seal breaks at once, sent once', async () => {
    const store = testStore({ view: project(claimedState('trial'), []), trialMs: jest.fn(async () => 10 * 60_000) });
    await render(withStore(store, <Trial now={() => DAY_TWO_NOW} onDone={jest.fn()} />));
    expect(await screen.findByText(SHADOW_TEXT.focus.done)).toBeTruthy();
    expect(store.getState().enqueue).toHaveBeenCalledTimes(1);
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'trial', checkinId: 7 });
  });

  it('when the hold goes mid-session (the pact lowered, the day over), the session stops and the screen may sleep', async () => {
    const store = testStore({ view: project(claimedState('trial'), []), trialMs: jest.fn(async () => 0) });
    await render(withStore(store, <Trial now={() => DAY_TWO_NOW} onDone={jest.fn()} />));
    expect(await screen.findByText('10:00')).toBeTruthy();
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('lmu-trial');
    (deactivateKeepAwake as jest.Mock).mockClear();
    await act(async () => store.setState({ view: project(claimedState('shadow'), []) }));
    expect(deactivateKeepAwake).toHaveBeenCalledWith('lmu-trial');
    expect(screen.getByText(SHADOW_TEXT.focus.gone)).toBeTruthy();
  });

  it('opened again after it was done, the focus session says the seal is broken', async () => {
    await render(withStore(testStore({ view: project(claimedState('trial', { trial_done_at: new Date(DAY_TWO_NOW) }), []) }),
      <Trial now={() => DAY_TWO_NOW} onDone={jest.fn()} />));
    expect(screen.getByText(SHADOW_TEXT.focus.done)).toBeTruthy();
  });
});
