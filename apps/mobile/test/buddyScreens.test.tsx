// Monster Buddy (docs/2026-10-25-monster-buddy.md): the buddies' paintings, and your buddy in the battle replay, at the
// camp's fire, in the quest pictures and on the class change screen. (Me, the reveal and the level-up: portraits.test.)
import { ART_KEYS, BUDDIES, BUDDY_TEXT, PLAY_TEXT, STAT_NAMES, fillText } from '@levelmeup/content';
import { CLASSES } from '@levelmeup/rules';
import type { ClassId } from '@levelmeup/rules';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { BUDDY_ART, BUDDY_QUEST_ART } from '../src/art/buddies.ts';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { BattleResult } from '../src/screens/BattleResult.tsx';
import { Camp } from '../src/screens/Camp.tsx';
import { ClassChange } from '../src/screens/ClassChange.tsx';
import { Quest } from '../src/screens/Quest.tsx';
import { Today } from '../src/screens/Today.tsx';
import { DAY_TWO_NOW, adjustState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13);
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
const hidden = { includeHiddenElements: true } as const;
const still = () => screen.getByTestId('buddy-still', hidden).props.source;

/** The state with a decided battle 1 (won or lost) and battle 2 running. */
function decided(won: boolean): ServerState {
  const s = serverState(['core']);
  const last = { n: 1, grumble: 'snoozle', won, power: won ? 9 : 5, need: 8, rematch: 0, byStat: won ? { vitality: 9 } : { strength: 5 } };
  return { ...s, camp: { wins: won ? { snoozle: 1 } : {}, last }, battle: { ...s.battle, n: 2, first: 4, last: 6 } };
}

describe('the buddies’ paintings', () => {
  it('every class’s buddy in three sizes, each with all six stills', () => {
    for (const c of CLASS_IDS) {
      expect(BUDDY_ART[c]).toHaveLength(3);
      for (const size of BUDDY_ART[c]!) expect(Object.keys(size).sort()).toEqual(['blink', 'happy', 'idle', 'sleep', 'think', 'throw']);
    }
  });

  it('every kind of quest has its picture, for every buddy', () => {
    for (const c of CLASS_IDS) expect(Object.keys(BUDDY_QUEST_ART[c] ?? {}).sort()).toEqual([...ART_KEYS].sort());
  });
});

describe('your buddy in the battle replay', () => {
  it('throws while the shots fly, then cheers a win', async () => {
    await render(withStore(testStore({ view: project(decided(true), []) }), <BattleResult onDone={jest.fn()} onCamp={jest.fn()} />));
    expect(screen.getByLabelText('Pummel throwing your power')).toBeTruthy();
    expect(still()).toBe(BUDDY_ART.warrior![0].throw);
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByLabelText('Pummel')).toBeTruthy();
    expect(still()).toBe(BUDDY_ART.warrior![0].happy);
  });

  it('a loss leaves it as it was: never sad', async () => {
    await render(withStore(testStore({ view: project(decided(false), []) }), <BattleResult onDone={jest.fn()} onCamp={jest.fn()} />));
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(still()).toBe(BUDDY_ART.warrior![0].idle);
  });
});

describe('your buddy at camp', () => {
  it('keeps the fire', async () => {
    await render(withStore(testStore({ view: project(serverState([]), []) }), <Camp now={() => NOW} />));
    expect(screen.getByText(fillText(BUDDY_TEXT.camp, BUDDIES.warrior))).toBeTruthy();
    expect(screen.getByTestId('buddy-warrior', hidden)).toBeTruthy();
  });
});

describe('quest pictures: your buddy doing the quest', () => {
  it('runs across the top of the core quest’s Up next card', async () => {
    await render(withStore(testStore({ view: project(serverState([]), []) }),
      <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()}
        onCheckin={jest.fn()} now={() => NOW} />));
    expect(screen.getByTestId('quest-art', hidden)).toBeTruthy();
  });

  it('shows in the quest screen’s How, labelled for screen readers', async () => {
    const server = serverState([]);
    const core = server.today!.quests.find((q) => q.slot === 'core')!;
    await render(withStore(testStore({ view: project(server, []) }),
      <Quest questId={core.id} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} now={() => NOW} />));
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.quest.steps }));
    expect(screen.getByLabelText(fillText(BUDDY_TEXT.questPicture, { name: 'Pummel', stat: STAT_NAMES[core.stat] }))).toBeTruthy();
  });
});

describe('the class change says which buddy each class brings', () => {
  it('names each one', async () => {
    await render(withStore(testStore({ view: project(adjustState(), []) }), <ClassChange now={() => DAY_TWO_NOW} onDone={jest.fn()} onBack={jest.fn()} />));
    for (const c of CLASS_IDS) expect(screen.getByText(new RegExp(fillText(BUDDY_TEXT.becomes, BUDDIES[c])))).toBeTruthy();
  });
});
