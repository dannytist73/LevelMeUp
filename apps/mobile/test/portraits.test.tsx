import { CHARACTER_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PORTRAIT_BASE } from '../src/art/portraits.ts';
import { project } from '../src/game/project.ts';
import { Character } from '../src/screens/Character.tsx';
import { Reveal } from '../src/screens/onboarding/Reveal.tsx';
import { Portrait } from '../src/ui/Portrait.tsx';
import { READY_DRAFT, REVEAL, serverState } from './support/fixtures.ts';
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
