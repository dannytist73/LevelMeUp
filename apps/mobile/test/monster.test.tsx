// Monster Week's screens (docs/2026-10-25-monster-week.md): the battle on Camp, the power on each quest, the battle
// explained once, the streak on Me, the Grumble book, and a decided battle shown once. A simpler day
// (docs/2026-10-26-simpler-day.md): the arena became the camp scene and its battle strip, and the Camp tab's book sits
// under it.
import { CAMP_TEXT, CHECKIN_TEXT, GRUMBLES, MONSTER_TEXT, STAT_NAMES, TODAY_TEXT, fillText } from '@levelmeup/content';
import { questPower } from '@levelmeup/rules';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { BattleResult, MAX_SHOTS, shotsOf } from '../src/screens/BattleResult.tsx';
import { Character, streakLine } from '../src/screens/Character.tsx';
import { Today } from '../src/screens/Today.tsx';
import { clockLine } from '../src/screens/camp/BattleStrip.tsx';
import { peekToast } from '../src/ui/toast.ts';
import { colors } from '../src/theme/tokens.ts';
import { checkinState, serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs 12:00–20:00 UTC
const A = MONSTER_TEXT.arena;

const renderToday = (store: ReturnType<typeof testStore>, shown = true) => render(withStore(store,
  <Today onOpenQuest={jest.fn()} onDay={jest.fn()} shown={shown} now={() => NOW} />));

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

describe('the battle on Camp (a simpler day)', () => {
  it("shows the Grumble here now at the edge of camp, holding out today's quest, and its weakness, clock and power in the strip", async () => {
    const s = serverState([]);
    await renderToday(testStore({ view: project(s, []) }));
    expect(screen.getByLabelText('Snoozle, the snooze button')).toBeTruthy();
    expect(within(screen.getByTestId('camp-bubble')).getByText(CAMP_TEXT.bubble.gift)).toBeTruthy();
    const strip = within(screen.getByTestId('battle-strip'));
    expect(strip.getByText(fillText(CAMP_TEXT.power, { name: 'Snoozle', power: s.battle.power, need: s.battle.need }))).toBeTruthy();
    expect(strip.getByText(fillText(A.weakTo, { stat: 'Vitality' }))).toBeTruthy();
    expect(strip.getByText(clockLine(s.battle.endsAt!, s.today!.timeZone, NOW))).toBeTruthy();
    expect(strip.getByRole('progressbar').props.accessibilityValue).toMatchObject({ max: s.battle.need, now: s.battle.power });
  });

  it('every open quest shows the power it gives; one on the weakness is marked so', async () => {
    const s = serverState([]);
    await renderToday(testStore({ view: project(s, []) }));
    const chips = [...screen.queryAllByTestId('power-chip', { includeHiddenElements: true }), ...screen.queryAllByTestId('power-chip-weak', { includeHiddenElements: true })];
    expect(chips.length).toBe(s.today!.quests.filter((q) => q.slot !== 'article').length);
    const weak = s.today!.quests.filter((q) => q.slot !== 'article' && q.stat === 'vitality').length;
    expect(screen.queryAllByTestId('power-chip-weak', { includeHiddenElements: true })).toHaveLength(weak);
    const core = s.today!.quests.find((q) => q.slot === 'core')!;
    expect(within(screen.getByTestId('quest-scroll')).getAllByText(fillText(core.stat === 'vitality' ? A.questWeak : A.questPower, { n: questPower(core.stat, 'vitality') }), { includeHiddenElements: true }).length).toBeGreaterThanOrEqual(1); // the scroll holds the extras too
  });

  it('a new player hears the visitor explain itself, once: it counts as said once they leave Camp', async () => {
    const store = testStore({ view: project(serverState([]), []), offers: [] });
    const view = await renderToday(store);
    const intro = fillText(CAMP_TEXT.bubble.intro, { name: 'Snoozle', standsFor: 'the snooze button' });
    expect(within(screen.getByTestId('camp-bubble')).getByText(intro)).toBeTruthy();
    expect(store.getState().markOffer).not.toHaveBeenCalledWith('monster:intro'); // a battle's replay waits for it
    await view.rerender(withStore(store, <Today onOpenQuest={jest.fn()} onDay={jest.fn()} shown={false} now={() => NOW} />));
    expect(store.getState().markOffer).toHaveBeenCalledWith('monster:intro');
  });

  it('a battle waiting for a check-in says so instead of its clock and power', async () => {
    const s = serverState([]);
    const held = { ...s, battle: { ...s.battle, waiting: true }, today: { ...s.today!, dayNumber: 4 } };
    await renderToday(testStore({ view: project(held, []) }));
    const strip = within(screen.getByTestId('battle-strip'));
    expect(strip.getByText(fillText(A.waiting, { name: 'Snoozle' }))).toBeTruthy();
    expect(strip.queryByRole('progressbar')).toBeNull();
    expect(within(screen.getByTestId('camp-bubble')).getByText(CAMP_TEXT.bubble.ask)).toBeTruthy();
  });

  it('the reading quest shows its power too', async () => {
    const base = serverState([]);
    const s = { ...base, today: { ...base.today!, article: { id: 'article-9', cluster: 'sleep' as const, title: 'Wake time', minutes: 6 } } };
    await renderToday(testStore({ view: project(s, []) }));
    const reading = s.today.quests.find((q) => q.slot === 'article')!;
    const label = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel as string).find((l) => typeof l === 'string' && l.includes('Wake time'))!;
    expect(label).toContain(fillText(reading.stat === 'vitality' ? A.questWeakLabel : A.questPowerLabel, { n: questPower(reading.stat, 'vitality') }));
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

describe('the camp and its Grumble book (under the scene since a simpler day)', () => {
  it('before a first win: nobody at the fire but your buddy, the Grumble here now, and a book of 24 dark silhouettes but one', async () => {
    await renderToday(testStore({ view: project(serverState([]), []) }));
    expect(screen.getByLabelText('Your camp: Pummel by the fire. Snoozle waits at the edge of camp.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /, a friend\./ })).toBeNull();
    expect(screen.getByText(fillText(MONSTER_TEXT.camp.bookCount, { n: 0, total: 24 }))).toBeTruthy();
    expect(GRUMBLES.map((g) => screen.getByTestId(`book-${g.id}`))).toHaveLength(24);
    expect(screen.getByTestId('book-snoozle').props.accessibilityLabel).toContain(MONSTER_TEXT.camp.hereNow);
    expect(screen.getByTestId('book-scrollo').props.accessibilityLabel).toBe(`${MONSTER_TEXT.camp.unknown}. It never reaches the bottom.`);
  });

  it('after a win: the friend sits at the fire and says its line when tapped; the book counts it', async () => {
    await renderToday(testStore({ view: project(decided(true), []) }));
    expect(screen.getByLabelText('Your camp: Pummel by the fire. Friends here: Snoozle. Scrollo waits at the edge of camp.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: fillText(CAMP_TEXT.scene.friend, { name: 'Snoozle' }) }));
    expect(peekToast()?.message).toBe('Snoozle: “Fine. Mornings are nice too.”');
    expect(screen.getByText(fillText(MONSTER_TEXT.camp.bookCount, { n: 1, total: 24 }))).toBeTruthy();
    expect(screen.getByTestId('book-snoozle').props.accessibilityLabel).toContain(MONSTER_TEXT.camp.joinedOnce);
    expect(screen.getByTestId('book-scrollo').props.accessibilityLabel).toContain(MONSTER_TEXT.camp.hereNow);
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
