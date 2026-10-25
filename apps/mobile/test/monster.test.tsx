// Monster Week's screens (docs/2026-10-25-monster-week.md): the arena on Today, the power on each quest, the one-time
// card, the streak on Me, the Camp and its Grumble book, and a decided battle shown once.
import { CHECKIN_TEXT, GRUMBLES, MONSTER_TEXT, STAT_NAMES, TODAY_TEXT, fillText } from '@levelmeup/content';
import { questPower } from '@levelmeup/rules';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { BattleResult, MAX_SHOTS, shotsOf } from '../src/screens/BattleResult.tsx';
import { Camp } from '../src/screens/Camp.tsx';
import { Character, streakLine } from '../src/screens/Character.tsx';
import { Today } from '../src/screens/Today.tsx';
import { clockLine } from '../src/screens/today/Arena.tsx';
import { colors } from '../src/theme/tokens.ts';
import { checkinState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs 12:00–20:00 UTC
const A = MONSTER_TEXT.arena;

const renderToday = (store: ReturnType<typeof testStore>) => render(withStore(store,
  <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()}
    onCheckin={jest.fn()} now={() => NOW} />));

/** The state with a decided battle 1 (won or lost) and battle 2 running. */
function decided(won: boolean): ServerState {
  const s = serverState(['core']);
  const last = { n: 1, grumble: 'snoozle', won, power: won ? 9 : 5, need: 8, rematch: 0, byStat: won ? { vitality: 4, strength: 3, wisdom: 2 } : { strength: 5 } };
  return {
    ...s,
    camp: { wins: won ? { snoozle: 1 } : {}, last },
    battle: { ...s.battle, n: 2, grumble: won ? 'scrollo' : 'snoozle', weakness: won ? 'focus' : 'vitality', rematch: won ? 0 : 1, first: 4, last: 6 },
  };
}

describe('the arena on Today', () => {
  it("shows the Grumble here now, its line, its weakness, the battle clock and the power to its need", async () => {
    const s = serverState(['core']);
    await renderToday(testStore({ view: project(s, []) }));
    const arena = within(screen.getByTestId('arena'));
    expect(arena.getByRole('header', { name: 'Snoozle' })).toBeTruthy();
    expect(arena.getByText('Five more minutes…')).toBeTruthy();
    expect(arena.getByText(fillText(A.weakTo, { stat: 'Vitality' }))).toBeTruthy();
    expect(arena.getByText(fillText(A.power, { power: s.battle.power, need: s.battle.need }))).toBeTruthy();
    expect(arena.getByText(clockLine(s.battle.endsAt!, s.today!.timeZone, NOW))).toBeTruthy();
    expect(arena.getByRole('progressbar').props.accessibilityValue).toMatchObject({ max: s.battle.need, now: s.battle.power });
  });

  it('every open quest shows the power it gives; one on the weakness is marked so', async () => {
    const s = serverState([]);
    await renderToday(testStore({ view: project(s, []) }));
    const chips = [...screen.queryAllByTestId('power-chip', { includeHiddenElements: true }), ...screen.queryAllByTestId('power-chip-weak', { includeHiddenElements: true })];
    expect(chips.length).toBe(s.today!.quests.filter((q) => q.slot !== 'article').length);
    const weak = s.today!.quests.filter((q) => q.slot !== 'article' && q.stat === 'vitality').length;
    expect(screen.queryAllByTestId('power-chip-weak', { includeHiddenElements: true })).toHaveLength(weak);
    const core = s.today!.quests.find((q) => q.slot === 'core')!;
    expect(within(screen.getByTestId('up-next')).getAllByText(fillText(core.stat === 'vitality' ? A.questWeak : A.questPower, { n: questPower(core.stat, 'vitality') }), { includeHiddenElements: true }).length).toBe(1);
  });

  it('a new player gets the one-time card that explains the battles; Got it marks it', async () => {
    const store = testStore({ view: project(serverState([]), []), offers: [] });
    await renderToday(store);
    expect(screen.getByText(MONSTER_TEXT.intro.line)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: MONSTER_TEXT.intro.go }));
    expect(store.getState().markOffer).toHaveBeenCalledWith('monster:intro');
  });

  it('says how far away the battle is, in days or hours', () => {
    const ends = new Date(Date.UTC(2026, 9, 12, 20)).toISOString(); // 04:00 on 13 Oct in Manila
    expect(clockLine(ends, 'Asia/Manila', Date.UTC(2026, 9, 11, 14))).toBe('Battle Tue 13 Oct 4:00 AM · in 1 d 6 h');
    expect(clockLine(ends, 'Asia/Manila', Date.UTC(2026, 9, 12, 14, 40))).toBe('Battle Tue 13 Oct 4:00 AM · in 5 h 20 min');
  });
});

describe('the streak on Me (it left Today with Monster Week)', () => {
  it('reads as Today said it: the count, today counting, the shields', () => {
    expect(streakLine(project(serverState([], { streak_current: 5, streak_best: 5 }), []))).toBe(`5 ${TODAY_TEXT.streak} · 0 of 2 shields`);
    expect(streakLine(project(serverState(['core'], { streak_current: 5, streak_best: 5 }), []))).toBe(`6 ${TODAY_TEXT.streak} · ${TODAY_TEXT.counts} · 0 of 2 shields`);
    expect(streakLine(project(checkinState(), []))).toContain(CHECKIN_TEXT.streakPaused);
  });

  it('opens the Chronicle from its row', async () => {
    const onChronicle = jest.fn();
    await render(withStore(testStore({ view: project(serverState([]), []) }),
      <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} onChronicle={onChronicle} now={() => NOW} />));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(MONSTER_TEXT.me.chronicle) }));
    expect(onChronicle).toHaveBeenCalled();
  });
});

describe('the Camp', () => {
  it('before a first win: an empty fire, the Grumble here now, and a book of 24 dark silhouettes but one', async () => {
    await render(withStore(testStore({ view: project(serverState([]), []) }), <Camp now={() => NOW} />));
    expect(screen.getByText(MONSTER_TEXT.camp.friendsNone)).toBeTruthy();
    expect(screen.getByText(MONSTER_TEXT.camp.empty)).toBeTruthy();
    expect(screen.getByText(fillText(MONSTER_TEXT.camp.here, { name: 'Snoozle' }))).toBeTruthy();
    expect(screen.getByText(fillText(MONSTER_TEXT.camp.bookCount, { n: 0, total: 24 }))).toBeTruthy();
    expect(GRUMBLES.map((g) => screen.getByTestId(`book-${g.id}`))).toHaveLength(24);
    expect(screen.getByTestId('book-snoozle').props.accessibilityLabel).toContain(MONSTER_TEXT.camp.hereNow);
    expect(screen.getByTestId('book-scrollo').props.accessibilityLabel).toBe(`${MONSTER_TEXT.camp.unknown}. It never reaches the bottom.`);
  });

  it('after a win: the friend sits at the fire and the book counts it', async () => {
    await render(withStore(testStore({ view: project(decided(true), []) }), <Camp now={() => NOW} />));
    expect(screen.getByText(MONSTER_TEXT.camp.friendsOne)).toBeTruthy();
    expect(screen.getByText(fillText(MONSTER_TEXT.camp.bookCount, { n: 1, total: 24 }))).toBeTruthy();
    expect(screen.getByTestId('book-snoozle').props.accessibilityLabel).toContain(MONSTER_TEXT.camp.joinedOnce);
    expect(screen.getByText(fillText(MONSTER_TEXT.camp.here, { name: 'Scrollo' }))).toBeTruthy();
  });
});

describe('a decided battle (shown once)', () => {
  it('a win, after Skip: it joined the camp, how, and who comes next; the moment is marked shown', async () => {
    const store = testStore({ view: project(decided(true), []) });
    const onCamp = jest.fn();
    await render(withStore(store, <BattleResult onDone={jest.fn()} onCamp={onCamp} />));
    expect(store.getState().markOffer).toHaveBeenCalledWith('battle:1:won');
    await fireEvent.press(screen.getByRole('button', { name: MONSTER_TEXT.result.skip }));
    expect(screen.getByRole('header', { name: fillText(MONSTER_TEXT.result.won, { name: 'Snoozle' }) })).toBeTruthy();
    expect(screen.getByText(fillText(MONSTER_TEXT.result.wonLine, { power: 9, need: 8 }))).toBeTruthy();
    expect(screen.getByText(fillText(MONSTER_TEXT.result.byStatWeak, { n: 4, stat: STAT_NAMES.vitality }))).toBeTruthy();
    expect(screen.getByText(fillText(MONSTER_TEXT.result.byStat, { n: 3, stat: STAT_NAMES.strength }))).toBeTruthy();
    expect(screen.getByText('It never reaches the bottom.')).toBeTruthy(); // Scrollo's hint, still a silhouette
    await fireEvent.press(screen.getByRole('button', { name: MONSTER_TEXT.result.camp }));
    expect(onCamp).toHaveBeenCalled();
  });

  it('a loss: it stays for a rematch; nothing is lost', async () => {
    const onDone = jest.fn();
    await render(withStore(testStore({ view: project(decided(false), []) }), <BattleResult onDone={onDone} onCamp={jest.fn()} />));
    await fireEvent.press(screen.getByRole('button', { name: MONSTER_TEXT.result.skip }));
    expect(screen.getByRole('header', { name: fillText(MONSTER_TEXT.result.lost, { name: 'Snoozle' }) })).toBeTruthy();
    expect(screen.getByText(fillText(MONSTER_TEXT.result.lostLine, { power: 5, need: 8 }))).toBeTruthy();
    expect(screen.queryByText(MONSTER_TEXT.result.how)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: MONSTER_TEXT.result.rematch }));
    expect(onDone).toHaveBeenCalled();
  });

  it('the replay fires one shot per point, at most 12, candy where the weakness was hit', () => {
    expect(shotsOf({ byStat: { vitality: 2, focus: 1 } }, 'vitality').map((s) => s.color)).toEqual([colors.candy, colors.candy, colors.glow]);
    const big = shotsOf({ byStat: { strength: 20, focus: 5 } }, 'focus');
    expect(big).toHaveLength(MAX_SHOTS);
    expect(big.reduce((sum, s) => sum + s.points, 0)).toBe(25);
  });

  it('the shots count the power up to the result', async () => {
    jest.useFakeTimers();
    try {
      const store = testStore({ view: project(decided(true), []) });
      await render(withStore(store, <BattleResult onDone={jest.fn()} onCamp={jest.fn()} />));
      await act(async () => {
        screen.getByTestId('battle-arena').props.onLayout({ nativeEvent: { layout: { width: 360, height: 300 } } });
      });
      expect(screen.getByText(fillText(A.power, { power: 0, need: 8 }))).toBeTruthy();
      await act(async () => {
        jest.advanceTimersByTime(10_000);
      });
      expect(screen.getByRole('header', { name: fillText(MONSTER_TEXT.result.won, { name: 'Snoozle' }) })).toBeTruthy();
      expect(screen.getByText(fillText(A.power, { power: 9, need: 8 }))).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
