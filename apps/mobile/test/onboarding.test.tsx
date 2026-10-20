import {
  CLASS_DAYS, GOAL_CHOICES, GOOGLE_ERRORS, OBSTACLES, ONBOARDING_TEXT, SAFETY_CHECK, SETUP_TEXT, SLIP_SUGGESTIONS, classStats, routineLine,
} from '@levelmeup/content';
import { CLASSES } from '@levelmeup/rules';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { project } from '../src/game/project.ts';
import { NEW_DRAFT, STEP_PATH } from '../src/onboarding/flow.ts';
import type { Draft } from '../src/onboarding/flow.ts';
import { Analysis } from '../src/screens/onboarding/Analysis.tsx';
import { Awakening } from '../src/screens/onboarding/Awakening.tsx';
import { BodyStep } from '../src/screens/onboarding/BodyStep.tsx';
import { GoalsStep } from '../src/screens/onboarding/GoalsStep.tsx';
import { MindStep } from '../src/screens/onboarding/MindStep.tsx';
import { Reveal } from '../src/screens/onboarding/Reveal.tsx';
import { RhythmStep } from '../src/screens/onboarding/RhythmStep.tsx';
import { SafetyStep } from '../src/screens/onboarding/SafetyStep.tsx';
import { SlipSetup } from '../src/screens/SlipSetup.tsx';
import { Vow } from '../src/screens/Vow.tsx';
import type { GameState } from '../src/state/store.ts';
import { READY_DRAFT, REVEAL, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

async function show(screenEl: ReactElement, draft: Partial<Draft> = {}, over: Partial<GameState> = {}) {
  const store = testStore({ phase: 'not_started', draft: { ...NEW_DRAFT, ...draft }, ...over });
  await render(withStore(store, screenEl));
  return store;
}
const continueButton = () => screen.getByRole('button', { name: 'Continue' });

describe('Awakening (O01)', () => {
  it('asks for a name, without an account, and awakens once there is one', async () => {
    const onNavigate = jest.fn();
    const store = await show(<Awakening onNavigate={onNavigate} onRestored={() => {}} />);
    expect(screen.getByText(ONBOARDING_TEXT.awakening.note)).toBeTruthy();
    const awaken = screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.go });
    expect(awaken.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByLabelText(ONBOARDING_TEXT.awakening.ask), 'Rin');
    expect(store.getState().draft.name).toBe('Rin');
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.go }));
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.goals); // M12: the voice waits for day 1's card
  });

  it('brings a saved character back with Google, and forgets the draft', async () => {
    const onRestored = jest.fn();
    const store = await show(<Awakening onNavigate={() => {}} onRestored={onRestored} />, {}, {
      // Like the real store: the sync after the sign-in brings the character in.
      signInWithGoogle: jest.fn(async () => (store.setState({ phase: 'ready' }), { ok: true as const, found: true })),
    });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
    expect(store.getState().finishOnboarding).toHaveBeenCalled();
  });

  it('signed in but offline: never says there is no character (review)', async () => {
    await show(<Awakening onNavigate={() => {}} onRestored={() => {}} />, {}, { signInWithGoogle: jest.fn(async () => ({ ok: true as const, found: 'unknown' as const })) });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    expect(screen.getByText(ONBOARDING_TEXT.awakening.restoreOffline)).toBeTruthy();
    expect(screen.queryByText(ONBOARDING_TEXT.awakening.noSave)).toBeNull();
  });

  it('stays out of the way when the analysis makes the character (it stays mounted under the stack; re-review)', async () => {
    const onRestored = jest.fn();
    const store = await show(<Awakening onNavigate={() => {}} onRestored={onRestored} />, { name: 'Rin' }, {
      signInWithGoogle: jest.fn(async () => ({ ok: true as const, found: 'unknown' as const })),
    });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.go })); // the player moves on
    await act(async () => store.setState({ phase: 'ready' }));
    expect(onRestored).not.toHaveBeenCalled();
    expect(store.getState().finishOnboarding).not.toHaveBeenCalled();
  });

  it('says so when the Google account has no character, or the sign-in failed', async () => {
    const signInWithGoogle = jest.fn()
      .mockResolvedValueOnce({ ok: true, found: false })
      .mockResolvedValueOnce({ ok: false, code: 'network' });
    await show(<Awakening onNavigate={() => {}} onRestored={() => {}} />, {}, { signInWithGoogle });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    expect(screen.getByText(ONBOARDING_TEXT.awakening.noSave)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    expect(screen.getByText(GOOGLE_ERRORS.network)).toBeTruthy();
  });

  it('doesn\'t offer the sign-in to a player already signed in with Google', async () => {
    await show(<Awakening onNavigate={() => {}} onRestored={() => {}} />, {}, { account: { kind: 'saved', email: null } });
    expect(screen.queryByRole('button', { name: ONBOARDING_TEXT.awakening.restore })).toBeNull();
  });
});

describe('the chapters (M12, board R3-7)', () => {
  it('each step names its chapter over a bar of the steps this player sees, and offers Back', async () => {
    const onBack = jest.fn();
    await show(<GoalsStep onNavigate={() => {}} onBack={onBack} />, { name: 'Rin' });
    expect(screen.getByRole('header', { name: 'Chapter 1 of 3 · You' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Step 2 of 5' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByTestId('continue-bar')).toBeTruthy(); // Continue, fixed at the bottom
  });

  it('the first step has no Back', async () => {
    await show(<Awakening onNavigate={() => {}} onRestored={() => {}} />);
    expect(screen.getByRole('header', { name: 'Chapter 1 of 3 · You' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });
});

describe('Goals (O03)', () => {
  it('allows two goals and counts them', async () => {
    await show(<GoalsStep onNavigate={() => {}} />, { name: 'Rin', voice: 'mentor' });
    await fireEvent.press(screen.getByRole('checkbox', { name: GOAL_CHOICES.body }));
    await fireEvent.press(screen.getByRole('checkbox', { name: GOAL_CHOICES.learn }));
    expect(screen.getByText('2 of 2 chosen')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: GOAL_CHOICES.focus }).props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('Body (O04)', () => {
  it('waits for training and limits, then goes on to the safety check', async () => {
    const onNavigate = jest.fn();
    await show(<BodyStep onNavigate={onNavigate} />, { ...READY_DRAFT, training: null, noLimits: false, safety: NEW_DRAFT.safety });
    expect(screen.getByRole('header', { name: 'Chapter 2 of 3 · Your body' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Now and then' }));
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('checkbox', { name: ONBOARDING_TEXT.body.nothing }));
    await fireEvent.press(continueButton());
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.safety);
  });
});

describe('The safety check (O04, its own step since M12)', () => {
  it('waits for all seven answers, counting them', async () => {
    const onNavigate = jest.fn();
    await show(<SafetyStep onNavigate={onNavigate} />, { ...READY_DRAFT, safety: NEW_DRAFT.safety });
    expect(screen.getByText('0 of 7 answered')).toBeTruthy();
    for (const question of SAFETY_CHECK.slice(0, 6)) await fireEvent.press(screen.getByRole('radio', { name: `${question} No` }));
    expect(screen.getByText('6 of 7 answered')).toBeTruthy();
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('radio', { name: `${SAFETY_CHECK[6]} Yes` }));
    expect(screen.getByText(ONBOARDING_TEXT.body.gentleTitle)).toBeTruthy();
    expect(screen.queryByText(/of 7 answered/)).toBeNull();
    await fireEvent.press(continueButton());
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.rhythm);
  });

  it('says "no flags" when every answer is no', async () => {
    await show(<SafetyStep onNavigate={() => {}} />, READY_DRAFT);
    expect(screen.getByText(ONBOARDING_TEXT.body.clear)).toBeTruthy();
  });
});

describe('Mind', () => {
  it('asks only about the goals picked', async () => {
    await show(<MindStep onNavigate={() => {}} />, { ...READY_DRAFT, goals: ['learn'] });
    expect(screen.getByText(ONBOARDING_TEXT.mind.reading)).toBeTruthy();
    expect(screen.queryByText(ONBOARDING_TEXT.mind.focus)).toBeNull();
  });
});

describe('Rhythm and effort (O05)', () => {
  it('says when workouts won\'t fit: 10 or 15 minutes a day', async () => {
    await show(<RhythmStep onNavigate={() => {}} />, { ...READY_DRAFT, minutesPerDay: 15 });
    expect(screen.getByText(ONBOARDING_TEXT.rhythm.workouts)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '25 minutes a day' }));
    expect(screen.queryByText(ONBOARDING_TEXT.rhythm.workouts)).toBeNull();
  });

  it('shows where the quest day turns over', async () => {
    await show(<RhythmStep onNavigate={() => {}} />, READY_DRAFT);
    expect(screen.getByText("Your quest day turns over at 4:00 AM, while you're asleep.")).toBeTruthy();
  });

  it('warns an own-program player that 10 or 15 minutes leaves no strength quests', async () => {
    await show(<RhythmStep onNavigate={() => {}} />, { ...READY_DRAFT, training: 'own', minutesPerDay: 15 });
    expect(screen.getByText(ONBOARDING_TEXT.rhythm.ownProgram)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '25 minutes a day' }));
    expect(screen.queryByText(ONBOARDING_TEXT.rhythm.ownProgram)).toBeNull();
  });
});

describe('When you slip (day 2, M12 decision 8)', () => {
  const props = () => ({ onDone: jest.fn(), onPact: jest.fn(), onNotifications: jest.fn(), onGame: jest.fn() });

  it('shapes the suggestion; "real stakes" offers the Pact to read; nothing turns on', async () => {
    const p = props();
    await show(<SlipSetup {...p} />, {}, { phase: 'ready' });
    await fireEvent.press(screen.getByRole('radio', { name: /^Real stakes/ }));
    expect(screen.getByText(SLIP_SUGGESTIONS.stakes)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: SETUP_TEXT.slip.pact }));
    expect(p.onPact).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('radio', { name: /^A kind nudge/ }));
    expect(screen.queryByRole('button', { name: SETUP_TEXT.slip.pact })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: SETUP_TEXT.slip.done }));
    expect(p.onDone).toHaveBeenCalled();
  });

  it('"What gets in the way?" shows the tip for what the game already has', async () => {
    const p = props();
    await show(<SlipSetup {...p} />, {}, { phase: 'ready' });
    const forget = OBSTACLES.find((o) => o.id === 'forget')!;
    await fireEvent.press(screen.getByRole('radio', { name: forget.name }));
    expect(screen.getByText(forget.tip)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: forget.action! }));
    expect(p.onNotifications).toHaveBeenCalled();
    const pain = OBSTACLES.find((o) => o.id === 'pain')!;
    await fireEvent.press(screen.getByRole('radio', { name: pain.name }));
    expect(screen.getByText(pain.tip)).toBeTruthy();
  });
});

describe('Analysis (O07)', () => {
  it('a phone that cannot keep a sign-in: says so, keeps the answers, offers another try (M7b)', async () => {
    const startCharacter = jest.fn(async () => ({ ok: false, code: 'storage' }));
    await show(<Analysis onRevealed={() => {}} onToday={() => {}} minMs={0} />, READY_DRAFT, { startCharacter });
    await waitFor(() => expect(screen.getByText(ONBOARDING_TEXT.analysis.storage)).toBeTruthy());
    expect(screen.getByRole('button', { name: ONBOARDING_TEXT.analysis.retry })).toBeTruthy();
  });

  it('makes the character, then shows the reveal', async () => {
    const onRevealed = jest.fn();
    const store = await show(<Analysis onRevealed={onRevealed} onToday={() => {}} minMs={0} />, READY_DRAFT);
    await waitFor(() => expect(onRevealed).toHaveBeenCalled());
    expect(store.getState().startCharacter).toHaveBeenCalledTimes(1);
  });

  it('offline: keeps the answers and offers another try', async () => {
    const startCharacter = jest.fn().mockResolvedValueOnce({ ok: false, code: 'network' }).mockResolvedValueOnce({ ok: true });
    const onRevealed = jest.fn();
    await show(<Analysis onRevealed={onRevealed} onToday={() => {}} minMs={0} />, READY_DRAFT, { startCharacter });
    await waitFor(() => expect(screen.getByText(ONBOARDING_TEXT.analysis.offline)).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.analysis.retry }));
    await waitFor(() => expect(onRevealed).toHaveBeenCalled());
  });

  it('a player who has already begun goes to Today', async () => {
    const onToday = jest.fn();
    await show(<Analysis onRevealed={() => {}} onToday={onToday} minMs={0} />, READY_DRAFT, { startCharacter: jest.fn(async () => ({ ok: false, code: 'locked' })) });
    await waitFor(() => expect(screen.getByText(ONBOARDING_TEXT.analysis.locked)).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.analysis.today }));
    expect(onToday).toHaveBeenCalled();
  });
});

describe('Character reveal (O08)', () => {
  const SERVER = serverState();
  const revealed = (over: Partial<GameState> = {}) => ({ phase: 'ready' as const, reveal: REVEAL, view: project(SERVER, []), ...over });

  it('shows the class, the words, the stats as game estimates and the routine; the slip question waits for day 2 (M12)', async () => {
    await show(<Reveal onAccept={() => {}} onFix={() => {}} />, READY_DRAFT, revealed());
    expect(screen.getByText('Warrior')).toBeTruthy();
    expect(screen.getByText(classStats(CLASSES.warrior))).toBeTruthy();
    expect(screen.getByLabelText(`System: ${REVEAL.narrative}`)).toBeTruthy();
    expect(screen.getByText(ONBOARDING_TEXT.reveal.estimates)).toBeTruthy();
    const p = SERVER.profile;
    expect(screen.getByText(routineLine({ stats: CLASSES[p.classId], minutesPerDay: p.minutesPerDay, difficulty: p.difficulty, gentleStart: p.gentleStart }))).toBeTruthy();
    expect(screen.queryByText(SLIP_SUGGESTIONS.stakes)).toBeNull();
  });

  it('changing class runs the analysis again with the player\'s class', async () => {
    const store = await show(<Reveal onAccept={() => {}} onFix={() => {}} />, READY_DRAFT, revealed());
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.reveal.change }));
    await fireEvent.press(screen.getByRole('radio', { name: `Monk. ${classStats(CLASSES.monk)}. ${CLASS_DAYS.monk}` }));
    await waitFor(() => expect(store.getState().startCharacter).toHaveBeenCalled());
    expect(store.getState().draft.classId).toBe('monk');
  });

  it('fixing an assumption opens that question', async () => {
    const onFix = jest.fn();
    await show(<Reveal onAccept={() => {}} onFix={onFix} />, READY_DRAFT, revealed());
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.reveal.fix }));
    expect(screen.queryByRole('button', { name: ONBOARDING_TEXT.reveal.fixMind })).toBeNull(); // no Learn or Focus goal
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.reveal.fixBody }));
    expect(onFix).toHaveBeenCalledWith(STEP_PATH.body);
    // The analysis comes back to this same screen: it shows the new reveal, not the list (emulator, M5).
    expect(screen.getByRole('button', { name: ONBOARDING_TEXT.reveal.accept })).toBeTruthy();
  });

  it('accepting the class moves on, from the bar at the bottom (M17)', async () => {
    const onAccept = jest.fn();
    await show(<Reveal onAccept={onAccept} onFix={() => {}} />, READY_DRAFT, revealed());
    await fireEvent.press(within(screen.getByTestId('accept-bar')).getByRole('button', { name: ONBOARDING_TEXT.reveal.accept }));
    expect(onAccept).toHaveBeenCalled();
  });
});

describe('The vow (O09; day 3 since M12)', () => {
  it('"Why now?" fills the words (M12)', async () => {
    await show(<Vow onDone={() => {}} screenReader />, READY_DRAFT, { phase: 'ready' });
    const reason = ONBOARDING_TEXT.vow.reasons[0]!;
    await fireEvent.press(screen.getByRole('radio', { name: reason.name }));
    expect(screen.getByText(reason.vow)).toBeTruthy();
  });

  it('swears the words, after a screen reader\'s tap-then-confirm or a hold, and keeps them on the phone', async () => {
    const onDone = jest.fn();
    const store = await show(<Vow onDone={onDone} screenReader />, READY_DRAFT, { phase: 'ready' });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.edit }));
    await fireEvent.changeText(screen.getByLabelText(ONBOARDING_TEXT.vow.edit), 'I will rise.');
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.tap }));
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.confirm }));
    expect(store.getState().saveVow).toHaveBeenCalledWith('I will rise.');
    await fireEvent.press(await screen.findByRole('button', { name: ONBOARDING_TEXT.vow.next }));
    expect(onDone).toHaveBeenCalled();
  });

  it('can be skipped, and nothing is kept', async () => {
    const onDone = jest.fn();
    const store = await show(<Vow onDone={onDone} screenReader />, READY_DRAFT, { phase: 'ready' });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.skip }));
    expect(onDone).toHaveBeenCalled();
    expect(store.getState().saveVow).not.toHaveBeenCalled();
  });
});
