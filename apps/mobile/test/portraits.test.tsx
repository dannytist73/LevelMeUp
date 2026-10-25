// Monster Week (2026-10-25): the owner retired the earlier generated pictures. The class portrait is its frame and emblem
// alone, Switch portrait and the level-up's new portrait are gone, and the Shadow is its dark panel and eyes.
import { PLAY_TEXT, SHADOW_TEXT } from '@levelmeup/content';
import { render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { Celebration } from '../src/screens/Celebration.tsx';
import { Character } from '../src/screens/Character.tsx';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';
import { Reveal } from '../src/screens/onboarding/Reveal.tsx';
import { Portrait } from '../src/ui/Portrait.tsx';
import { DAY_TWO_NOW, READY_DRAFT, REVEAL, claimedState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const hidden = { includeHiddenElements: true } as const;
type Node = { type: string; children?: (Node | string)[] | null };
/** Every picture drawn: the host tree's Image elements. */
const pictures = (): Node[] => {
  const found: Node[] = [];
  const walk = (n: Node | Node[] | string | null): void => {
    if (n === null || typeof n === 'string') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.type === 'Image') found.push(n);
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON() as Node | Node[] | null);
  return found;
};

describe('the class portrait without its paintings (Monster Week)', () => {
  it("is the class's emblem in its frame, labelled for screen readers, and loads no picture", async () => {
    await render(<Portrait classId="mage" label="Mage portrait, level 6" />);
    expect(screen.getByLabelText('Mage portrait, level 6')).toBeTruthy();
    expect(screen.getByTestId('portrait-emblem', hidden)).toBeTruthy();
    expect(screen.queryByTestId('portrait-art', hidden)).toBeNull();
    expect(pictures()).toEqual([]);
  });

  it("still draws the Shadow's mark over it (M7c decision 9)", async () => {
    await render(<Portrait classId="warrior" label="Warrior portrait, level 3" marked />);
    expect(screen.getByTestId('shadow-mark', hidden)).toBeTruthy();
  });
});

describe('Character and the reveal: the portrait, no Switch portrait', () => {
  const SERVER = serverState();

  it('Character shows the portrait and no switch', async () => {
    await render(withStore(testStore({ view: project(SERVER, []) }), <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} />));
    expect(screen.getByLabelText('Warrior portrait, level 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Switch portrait' })).toBeNull();
    expect(pictures()).toEqual([]);
  });

  it('the reveal shows the class portrait under the class name, and no switch', async () => {
    const store = testStore({ phase: 'not_started', draft: READY_DRAFT, reveal: REVEAL, view: project(SERVER, []) });
    await render(withStore(store, <Reveal onAccept={() => {}} onFix={() => {}} />));
    expect(screen.getByLabelText('Warrior portrait, level 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Switch portrait' })).toBeNull();
    expect(pictures()).toEqual([]);
  });
});

describe('a level-up shows no portrait, at levels 5 and 10 too', () => {
  const SERVER = serverState();

  it.each([[5, 4], [10, 9], [6, 4]])('level %i from %i: the level and its ability, no portrait', async (level, from) => {
    await render(withStore(testStore({ view: project(SERVER, []), celebrations: [{ kind: 'level', level, from }] }), <Celebration />));
    expect(screen.getByText(`Lv ${level}`)).toBeTruthy();
    expect(screen.queryByLabelText(/portrait/)).toBeNull();
    expect(screen.queryByText(/portrait/i)).toBeNull();
    expect(screen.getByText(PLAY_TEXT.celebration.continue)).toBeTruthy();
  });
});

describe('the Shadow without its painting', () => {
  it('is the dark panel and its eyes on its scene, labelled, loading no picture', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <ShadowScene onDone={jest.fn()} onRecovery={jest.fn()} onTrial={jest.fn()} onPact={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(screen.getByLabelText(SHADOW_TEXT.art)).toBeTruthy();
    expect(screen.getByTestId('shadow-eyes', hidden)).toBeTruthy();
    expect(screen.queryByTestId('shadow-art', hidden)).toBeNull();
    expect(pictures()).toEqual([]);
  });
});
