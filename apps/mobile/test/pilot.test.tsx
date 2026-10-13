// M9b: the update card (decision 5), About and the privacy screen (decision 6).
import { ABOUT_TEXT, ONBOARDING_TEXT, PRIVACY_TEXT, UPDATE_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { Analysis } from '../src/screens/onboarding/Analysis.tsx';
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
    expect(screen.getByText('Core quest')).toBeTruthy();
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
});
