import { PACT_TEXT, SHADOW_LINES, SHADOW_TEXT, fillText } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { Pact } from '../src/screens/Pact.tsx';
import { Settings } from '../src/screens/Settings.tsx';
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
    expect(screen.getByText('THE SHADOW')).toBeTruthy();
  });

  it('marks the header and the portrait, and says so to screen readers', async () => {
    await render(<ShadowMark label={SHADOW_TEXT.mark} accessibilityLabel={SHADOW_TEXT.markLabel} />);
    expect(screen.getByLabelText(SHADOW_TEXT.markLabel)).toBeTruthy();
    await render(<Portrait classId="warrior" label="Warrior, level 3" marked />);
    expect(screen.getByLabelText('Warrior, level 3')).toBeTruthy();
    expect(screen.getByTestId('shadow-mark', { includeHiddenElements: true })).toBeTruthy();
    await render(<Portrait classId="warrior" label="Warrior, level 3" />);
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
    await fireEvent.press(screen.getByRole('button', { name: `${PACT_TEXT.settings} · ${PACT_TEXT.names[1]}` }));
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
