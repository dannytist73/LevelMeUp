// M9b: the update card (decision 5), About and the privacy screen (decision 6).
import { ABOUT_TEXT, ONBOARDING_TEXT, PRIVACY_TEXT, UPDATE_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { Analysis } from '../src/screens/onboarding/Analysis.tsx';
import { Awakening } from '../src/screens/onboarding/Awakening.tsx';
import { Privacy } from '../src/screens/Privacy.tsx';
import { Settings } from '../src/screens/Settings.tsx';
import { Today } from '../src/screens/Today.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const SERVER = serverState();
const now = () => Date.parse(SERVER.today!.startsAt!) + 60_000;
const settings = (over: Partial<Parameters<typeof Settings>[0]> = {}) => (
  <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} version="0.2.0" deviceZone="Asia/Manila" {...over} />
);

describe('the update card (M9b decision 5)', () => {
  it('Today says to update above the day, and the day is still there', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), updateRequired: true }),
      <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()}
        onCheckin={jest.fn()} now={now} />));
    expect(screen.getByLabelText(`System: ${UPDATE_TEXT.line}`)).toBeTruthy();
    expect(screen.getByTestId('up-next')).toBeTruthy();
  });

  it('Settings says it in the Sync section; without it there is no card', async () => {
    await render(withStore(testStore({ updateRequired: true }), settings()));
    expect(screen.getByLabelText(`System: ${UPDATE_TEXT.line}`)).toBeTruthy();
    await render(withStore(testStore(), settings()));
    expect(screen.queryByLabelText(`System: ${UPDATE_TEXT.line}`)).toBeNull();
  });

  it('the onboarding analysis says the answers are kept', async () => {
    const store = testStore({ startCharacter: jest.fn(async () => ({ ok: false as const, code: 'update_required' })) });
    await render(withStore(store, <Analysis onRevealed={jest.fn()} onToday={jest.fn()} minMs={0} />));
    expect(await screen.findByLabelText(`System: ${ONBOARDING_TEXT.analysis.update}`)).toBeTruthy();
  });

  it('a Google restore on a too-old app shows the card, not "no connection" (review)', async () => {
    const store = testStore({ phase: 'not_started' });
    store.setState({
      signInWithGoogle: jest.fn(async () => {
        store.setState({ updateRequired: true }); // the restore's sync was answered 426
        return { ok: true as const, found: 'unknown' as const };
      }),
    });
    await render(withStore(store, <Awakening onNavigate={jest.fn()} onRestored={jest.fn()} />));
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    expect(screen.getByLabelText(`System: ${UPDATE_TEXT.line}`)).toBeTruthy();
    expect(screen.queryByText(ONBOARDING_TEXT.awakening.restoreOffline)).toBeNull();
  });

  it('the card is a polite live region, so a screen reader hears it arrive (review)', async () => {
    await render(withStore(testStore({ updateRequired: true }), settings()));
    let node: ReturnType<typeof screen.getByLabelText> | null = screen.getByLabelText(`System: ${UPDATE_TEXT.line}`);
    const regions: unknown[] = [];
    for (; node !== null; node = node.parent) regions.push(node.props.accessibilityLiveRegion);
    expect(regions).toContain('polite');
  });
});

describe('About and privacy (M9b decision 6)', () => {
  it('About shows the version and the medical line, and opens the privacy screen', async () => {
    const onPrivacy = jest.fn();
    await render(withStore(testStore(), settings({ onPrivacy })));
    expect(screen.getByText('Version 0.2.0')).toBeTruthy();
    expect(screen.getByText(ABOUT_TEXT.notMedical)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PRIVACY_TEXT.open }));
    expect(onPrivacy).toHaveBeenCalled();
  });

  it('the privacy screen shows every section and line, and goes back', async () => {
    const onBack = jest.fn();
    await render(withStore(testStore(), <Privacy onBack={onBack} />));
    expect(screen.getByText(PRIVACY_TEXT.title)).toBeTruthy();
    for (const section of PRIVACY_TEXT.sections) {
      expect(screen.getByText(section.title)).toBeTruthy();
      for (const line of section.lines) expect(screen.getByText(line)).toBeTruthy();
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});
