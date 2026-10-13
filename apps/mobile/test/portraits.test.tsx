import { CHARACTER_TEXT, PLAY_TEXT, SHADOW_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PORTRAIT_BASE, SHADOW_ART_URL } from '../src/art/portraits.ts';
import { project } from '../src/game/project.ts';
import { Celebration } from '../src/screens/Celebration.tsx';
import { Character } from '../src/screens/Character.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { Reveal } from '../src/screens/onboarding/Reveal.tsx';
import { Portrait } from '../src/ui/Portrait.tsx';
import { DAY_TWO_NOW, READY_DRAFT, REVEAL, claimedState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const hidden = { includeHiddenElements: true } as const;

describe('the painted portrait (M9a)', () => {
  it("shows the class's picture for the figure and the level's tier, over its emblem", async () => {
    await render(<Portrait classId="mage" level={6} figure="b" label="Mage portrait, level 6" />);
    expect(screen.getByLabelText('Mage portrait, level 6')).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/mage-b-2.webp` });
    expect(screen.getByTestId('portrait-emblem', hidden)).toBeTruthy();
  });

  it('keeps the emblem when the picture cannot load (offline before it was first seen)', async () => {
    await render(<Portrait classId="rogue" level={12} figure="a" label="Rogue portrait, level 12" />);
    await fireEvent(screen.getByTestId('portrait-art', hidden), 'error');
    expect(screen.queryByTestId('portrait-art', hidden)).toBeNull();
    expect(screen.getByTestId('portrait-emblem', hidden)).toBeTruthy();
    expect(screen.getByLabelText('Rogue portrait, level 12')).toBeTruthy();
  });

  it('tries the next tier even after a failed one', async () => {
    await render(<Portrait classId="monk" level={9} figure="a" label="Monk portrait, level 9" />);
    await fireEvent(screen.getByTestId('portrait-art', hidden), 'error');
    await screen.rerender(<Portrait classId="monk" level={10} figure="a" label="Monk portrait, level 10" />);
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/monk-a-3.webp` });
  });

  it("draws the Shadow's mark over the picture (M7c decision 9)", async () => {
    await render(<Portrait classId="warrior" level={3} figure="a" label="Warrior portrait, level 3" marked />);
    expect(screen.getByTestId('shadow-mark', hidden)).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden)).toBeTruthy();
  });
});

describe('Character and the reveal show the portrait (M9a decisions 5, 8)', () => {
  const SERVER = serverState();
  const women = () => {
    const s = serverState();
    return { ...s, profile: { ...s.profile, programStyle: 'women' as const } };
  };

  it('Character shows the painted portrait of the level, and Switch portrait swaps the figure', async () => {
    const store = testStore({ view: project(SERVER, []) });
    await render(withStore(store, <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByLabelText('Warrior portrait, level 1')).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-a-1.webp` });
    await fireEvent.press(screen.getByRole('button', { name: CHARACTER_TEXT.switchPortrait }));
    expect(store.getState().setPortrait).toHaveBeenCalledWith('b');
  });

  it("shows the player's choice, and before one the Women's program shows figure b", async () => {
    await render(withStore(testStore({ view: project(SERVER, []), portrait: 'b' }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-b-1.webp` });
    await render(withStore(testStore({ view: project(women(), []) }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-b-1.webp` });
  });

  it('the reveal shows the class portrait under the class name, with Switch portrait', async () => {
    const store = testStore({ phase: 'not_started', draft: READY_DRAFT, reveal: REVEAL, view: project(SERVER, []) });
    await render(withStore(store, <Reveal onAccept={() => {}} onFix={() => {}} />));
    expect(screen.getByLabelText('Warrior portrait, level 1')).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-a-1.webp` });
    await fireEvent.press(screen.getByRole('button', { name: CHARACTER_TEXT.switchPortrait }));
    expect(store.getState().setPortrait).toHaveBeenCalledWith('b');
  });
});

describe('the level-up shows a new portrait at levels 5 and 10 (M9a decision 8)', () => {
  const SERVER = serverState();

  it('at level 5: the tier-2 portrait and its line', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), celebrations: [{ kind: 'level', level: 5 }] }), <Celebration />));
    expect(screen.getByLabelText('Warrior portrait, level 5')).toBeTruthy();
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-a-2.webp` });
    expect(screen.getByText(PLAY_TEXT.celebration.portrait)).toBeTruthy();
  });

  it('at level 10, with the chosen figure', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), portrait: 'b', celebrations: [{ kind: 'level', level: 10 }] }), <Celebration />));
    expect(screen.getByTestId('portrait-art', hidden).props.source).toEqual({ uri: `${PORTRAIT_BASE}/warrior-b-3.webp` });
  });

  it('other levels show no portrait', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), celebrations: [{ kind: 'level', level: 6 }] }), <Celebration />));
    expect(screen.queryByTestId('portrait-art', hidden)).toBeNull();
    expect(screen.queryByText(PLAY_TEXT.celebration.portrait)).toBeNull();
  });
});

describe("the Shadow's painted art (M9a decisions 4, 7)", () => {
  it('shows the painted Shadow on its scene, and the dark panel when it cannot load', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    const art = screen.getByTestId('shadow-art', hidden);
    expect(art.props.source).toEqual({ uri: SHADOW_ART_URL });
    expect(screen.getByLabelText(SHADOW_TEXT.art)).toBeTruthy();
    await fireEvent(art, 'error');
    expect(screen.queryByTestId('shadow-art', hidden)).toBeNull();
    expect(screen.getByLabelText(SHADOW_TEXT.art)).toBeTruthy();
  });
});
