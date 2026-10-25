// Monster Week (2026-10-25): the owner retired the earlier generated pictures, and Switch portrait went with them. Monster
// Buddy: the portrait is your buddy, which grows at levels 5 and 10, and the Shadow is painted again in clay.
import { BUDDIES, BUDDY_TEXT, ONBOARDING_TEXT, PLAY_TEXT, SHADOW_TEXT, fillText } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { Celebration } from '../src/screens/Celebration.tsx';
import { Character } from '../src/screens/Character.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { Reveal } from '../src/screens/onboarding/Reveal.tsx';
import { Portrait } from '../src/ui/Portrait.tsx';
import { DAY_TWO_NOW, READY_DRAFT, REVEAL, claimedState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const hidden = { includeHiddenElements: true } as const;

describe('the portrait is your buddy (Monster Buddy)', () => {
  it('draws the class’s buddy at its size, alive, labelled for screen readers', async () => {
    await render(<Portrait classId="mage" level={6} label="Starkit, your Mage buddy, grown, level 6" />);
    expect(screen.getByLabelText('Starkit, your Mage buddy, grown, level 6')).toBeTruthy();
    expect(screen.getByTestId('buddy-mage', hidden)).toBeTruthy();
    expect(screen.getByTestId('buddy-still', hidden)).toBeTruthy();
    expect(screen.queryByTestId('portrait-emblem', hidden)).toBeNull();
  });

  it("still draws the Shadow's mark over it (M7c decision 9)", async () => {
    await render(<Portrait classId="warrior" level={3} label="Pummel" marked />);
    expect(screen.getByTestId('shadow-mark', hidden)).toBeTruthy();
  });
});

describe('Character and the reveal: your buddy, named', () => {
  const SERVER = serverState();

  it('Character shows the buddy and its name and size, and no Switch portrait', async () => {
    await render(withStore(testStore({ view: project(SERVER, []) }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByLabelText('Pummel, your Warrior buddy, little, level 1')).toBeTruthy();
    expect(screen.getByText('Pummel · little', hidden)).toBeTruthy(); // shown, and said once, by the portrait's label
    expect(screen.queryByRole('button', { name: 'Switch portrait' })).toBeNull();
  });

  it('the reveal hatches the class’s buddy under the class name', async () => {
    const store = testStore({ phase: 'not_started', draft: READY_DRAFT, reveal: REVEAL, view: project(SERVER, []) });
    await render(withStore(store, <Reveal onAccept={() => {}} onFix={() => {}} />));
    expect(screen.getByLabelText('Pummel, your Warrior buddy, little, level 1')).toBeTruthy();
    expect(screen.getByText('Pummel hatched!')).toBeTruthy();
    expect(screen.getByText(fillText(BUDDY_TEXT.hatchedLine, { className: 'Warrior', kind: BUDDIES.warrior.kind }))).toBeTruthy();
  });

  it('choosing a class there says which buddy each brings', async () => {
    const store = testStore({ phase: 'not_started', draft: READY_DRAFT, reveal: REVEAL, view: project(SERVER, []) });
    await render(withStore(store, <Reveal onAccept={() => {}} onFix={() => {}} />));
    await fireEvent.press(screen.getByText(ONBOARDING_TEXT.reveal.change));
    expect(screen.getByText(/Buddy: Starkit, a violet fox/)).toBeTruthy();
    expect(screen.getByText(/Buddy: Mochi, a white seal pup/)).toBeTruthy();
  });
});

describe('a level-up grows the buddy at levels 5 and 10, and only then', () => {
  const SERVER = serverState();

  it.each([[5, 4, 'grown'], [10, 9, 'grand'], [6, 4, 'grown'], [11, 3, 'grand']])('level %i from %i: Pummel is %s now', async (level, from, size) => {
    await render(withStore(testStore({ view: project(SERVER, []), celebrations: [{ kind: 'level', level, from }] }), <Celebration />));
    expect(screen.getByText(`Lv ${level}`)).toBeTruthy();
    expect(screen.getByText('Pummel grew!')).toBeTruthy();
    expect(screen.getByText(fillText(BUDDY_TEXT.grewLine, { level, name: 'Pummel', size }))).toBeTruthy();
    expect(screen.getByText(PLAY_TEXT.celebration.continue)).toBeTruthy();
  });

  it.each([[2, 1], [7, 6], [12, 10]])('level %i from %i: no growing', async (level, from) => {
    await render(withStore(testStore({ view: project(SERVER, []), celebrations: [{ kind: 'level', level, from }] }), <Celebration />));
    expect(screen.getByText(`Lv ${level}`)).toBeTruthy();
    expect(screen.queryByTestId('buddy-grew', hidden)).toBeNull();
  });
});

describe('the Shadow, painted again in clay (Monster Buddy)', () => {
  it('is its painting on its scene, labelled, with a glow over each eye', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(screen.getByLabelText(SHADOW_TEXT.art)).toBeTruthy();
    expect(screen.getAllByTestId('shadow-art', hidden).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('eye-glow', hidden).length).toBeGreaterThan(0);
  });
});
