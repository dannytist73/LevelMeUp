import { GOAL_CHOICES, GOOGLE_ERRORS, ONBOARDING_TEXT, SAFETY_CHECK, VOICE_SAMPLES } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { NEW_DRAFT, STEP_PATH } from '../src/onboarding/flow.ts';
import type { Draft } from '../src/onboarding/flow.ts';
import { Awakening } from '../src/screens/onboarding/Awakening.tsx';
import { BodyStep } from '../src/screens/onboarding/BodyStep.tsx';
import { GoalsStep } from '../src/screens/onboarding/GoalsStep.tsx';
import { MindStep } from '../src/screens/onboarding/MindStep.tsx';
import { RhythmStep } from '../src/screens/onboarding/RhythmStep.tsx';
import { SlipStep } from '../src/screens/onboarding/SlipStep.tsx';
import { VoiceStep } from '../src/screens/onboarding/VoiceStep.tsx';
import type { GameState } from '../src/state/store.ts';
import { READY_DRAFT } from './support/fixtures.ts';
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
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.voice);
  });

  it('brings a saved character back with Google', async () => {
    const onRestored = jest.fn();
    await show(<Awakening onNavigate={() => {}} onRestored={onRestored} />);
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    expect(onRestored).toHaveBeenCalled();
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

describe('Voice (O02)', () => {
  it('shows each voice with its sample line and continues once one is picked', async () => {
    const onNavigate = jest.fn();
    await show(<VoiceStep onNavigate={onNavigate} />, { name: 'Rin' });
    expect(screen.getByText('Rin. How should I speak to you?')).toBeTruthy();
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('radio', { name: `Mentor. ${VOICE_SAMPLES.mentor}` }));
    await fireEvent.press(continueButton());
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.goals);
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

describe('Body and safety (O04)', () => {
  it('waits for training, limits and all seven safety answers', async () => {
    const onNavigate = jest.fn();
    await show(<BodyStep onNavigate={onNavigate} />, { ...READY_DRAFT, training: null, noLimits: false, safety: NEW_DRAFT.safety });
    await fireEvent.press(screen.getByRole('radio', { name: 'Now and then' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: ONBOARDING_TEXT.body.nothing }));
    for (const question of SAFETY_CHECK.slice(0, 6)) await fireEvent.press(screen.getByRole('radio', { name: `${question} No` }));
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('radio', { name: `${SAFETY_CHECK[6]} Yes` }));
    expect(screen.getByText(ONBOARDING_TEXT.body.gentleTitle)).toBeTruthy();
    await fireEvent.press(continueButton());
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.rhythm);
  });

  it('says "no flags" when every answer is no', async () => {
    await show(<BodyStep onNavigate={() => {}} />, READY_DRAFT);
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

describe('When you slip (O06)', () => {
  it('goes to the analysis', async () => {
    const onNavigate = jest.fn();
    await show(<SlipStep onNavigate={onNavigate} />, { ...READY_DRAFT, slip: null });
    await fireEvent.press(screen.getByRole('radio', { name: /^Real stakes/ }));
    await fireEvent.press(continueButton());
    expect(onNavigate).toHaveBeenCalledWith('/onboarding/analysis');
  });
});
