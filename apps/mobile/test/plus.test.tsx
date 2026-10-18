// M13: LevelMeUp Plus on the phone: what each screen shows for the server's state.plus, the offer screen's Google Play
// disclosures, the looks and frames it keeps for Plus, Today's one-time cards and the trial's words.
import { NOTIFY_TEXT, PLUS_TEXT, STAT_NAMES, fillText } from '@levelmeup/content';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import type { EntitlementRow } from '../../../supabase/functions/_shared/plus.ts';
import { project } from '../src/game/project.ts';
import type { Shown } from '../src/game/project.ts';
import { NOT_PLUS, frameAllowed, plusCard, shownFrame, shownTheme, statusLine } from '../src/plus/plus.ts';
import type { PlusView } from '../src/plus/plus.ts';
import * as purchases from '../src/plus/purchases.ts';
import type { Plan } from '../src/plus/purchases.ts';
import { DeleteCharacter } from '../src/screens/DeleteCharacter.tsx';
import { Look } from '../src/screens/Look.tsx';
import { Plus } from '../src/screens/Plus.tsx';
import { Settings } from '../src/screens/Settings.tsx';
import { Today } from '../src/screens/Today.tsx';
import { StatChart, chartPoints } from '../src/screens/chronicle/StatChart.tsx';
import { PALETTES, THEMES, appliedTheme, applyTheme } from '../src/theme/palettes.ts';
import { colors } from '../src/theme/tokens.ts';
import { RIPPLE } from '../src/ui/Tap.tsx';
import { Portrait } from '../src/ui/Portrait.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13);
const LATER = new Date(Date.UTC(2026, 10, 20));
const row = (over: Partial<EntitlementRow> = {}): EntitlementRow => ({
  source: 'play', product: 'plus_yearly', starts_at: new Date(Date.UTC(2026, 9, 1)), ends_at: LATER, trial: false, will_renew: true,
  manage_url: null, ...over,
});
const FOUNDER = row({ source: 'beta_founder', product: null, ends_at: null, will_renew: null });
const viewWith = (rows: EntitlementRow[] = [], done: ('core' | 'side1')[] = []): Shown => project(serverState(done, {}, rows), []);
const plusOn = (over: Partial<PlusView> = {}): PlusView => ({ ...NOT_PLUS, active: true, source: 'play', product: 'plus_yearly', endsAt: LATER.toISOString(), willRenew: true, ...over });

const PLANS: Plan[] = [
  { kind: 'yearly', price: '₱699.00', trialDays: 7, pkg: { id: 'y' } },
  { kind: 'monthly', price: '₱129.00', trialDays: null, pkg: { id: 'm' } },
  { kind: 'lifetime', price: '₱1,490.00', trialDays: null, pkg: { id: 'l' } },
];

describe('Plus as the screens read it (plus.ts)', () => {
  it('Settings\' line for each kind of Plus', () => {
    const zone = 'Asia/Manila';
    expect(statusLine(NOT_PLUS, zone)).toBe(PLUS_TEXT.settings.free);
    expect(statusLine(plusOn(), zone)).toBe('Plus, yearly: renews Fri 20 Nov');
    expect(statusLine(plusOn({ trial: true }), zone)).toBe('Plus, free trial: ends Fri 20 Nov');
    expect(statusLine(plusOn({ product: 'plus_monthly', willRenew: false }), zone)).toBe('Plus, monthly: ends Fri 20 Nov, cancelled');
    expect(statusLine(plusOn({ product: 'plus_lifetime', endsAt: null, willRenew: null }), zone)).toBe(PLUS_TEXT.settings.status.lifetime);
    expect(statusLine(plusOn({ source: 'beta_founder', product: null, endsAt: null }), zone)).toBe(PLUS_TEXT.settings.status.founder);
    expect(statusLine({ ...plusOn(), active: false }, zone)).toBe('Plus ended Fri 20 Nov');
  });

  it('a lapsed Plus shows Moonlight and no frame, whatever was picked; the Founder frame is the Founders\' own', () => {
    expect(shownTheme('mintNight', NOT_PLUS)).toBe('moonlight');
    expect(shownTheme('mintNight', plusOn())).toBe('mintNight');
    expect(shownFrame('moon', NOT_PLUS)).toBe('none');
    expect(frameAllowed('founder', plusOn())).toBe(false);
    expect(frameAllowed('founder', plusOn({ source: 'beta_founder' }))).toBe(true);
  });

  it('Today\'s cards: a week in, only on sale, only once the core quest is cleared, never on a hard or protected day', () => {
    const base = viewWith([], ['core']);
    const day7 = { ...base, today: { ...base.today!, dayNumber: 7 } };
    expect(plusCard(day7, [], NOW, true)).toBe('day7');
    expect(plusCard(day7, [], NOW, false)).toBeNull();
    expect(plusCard(day7, ['plus:day7'], NOW, true)).toBeNull();
    expect(plusCard({ ...base, today: { ...base.today!, dayNumber: 6 } }, [], NOW, true)).toBeNull();
    expect(plusCard({ ...day7, today: { ...day7.today, hardDay: true } }, [], NOW, true)).toBeNull();
    expect(plusCard({ ...day7, today: { ...day7.today, protection: 'pain' } }, [], NOW, true)).toBeNull();
    const open = viewWith();
    expect(plusCard({ ...open, today: { ...open.today!, dayNumber: 7 } }, [], NOW, true)).toBeNull();
  });

  it('the trial\'s card shows in its last two days', () => {
    const base = viewWith([], ['core']);
    const trial = (endsInMs: number) => ({ ...base, plus: plusOn({ trial: true, endsAt: new Date(NOW + endsInMs).toISOString() }) });
    expect(plusCard(trial(3 * 86_400_000), [], NOW, true)).toBeNull();
    expect(plusCard(trial(2 * 86_400_000), [], NOW, true)).toBe('trial');
    expect(plusCard(trial(2 * 86_400_000), ['plus:trial'], NOW, true)).toBeNull();
  });
});

describe('the offer screen (Google Play subscription rules)', () => {
  it('with Plus not on sale yet, says so and still lets the player go', async () => {
    const onClose = jest.fn();
    await render(withStore(testStore({ view: viewWith() }), <Plus onClose={onClose} />));
    expect(await screen.findByText(PLUS_TEXT.notSetUp)).toBeTruthy();
    expect(screen.getByText(PLUS_TEXT.lead)).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: PLUS_TEXT.notNow }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });

  it('lists the plans with Google Play\'s prices, the yearly trial and its timeline, and buys the chosen plan', async () => {
    const store = testStore({ view: viewWith(), plusShop: jest.fn(async () => ({ ok: true as const, plans: PLANS })) });
    await render(withStore(store, <Plus onClose={jest.fn()} />));
    expect(await screen.findByText('7 days free, then ₱699.00 a year.')).toBeTruthy();
    expect(screen.getByText('₱129.00 a month')).toBeTruthy();
    expect(screen.getByText('₱1,490.00, paid once')).toBeTruthy();
    expect(screen.getByText('Day 5: we remind you, if notifications are on.')).toBeTruthy();
    expect(screen.getByText('Day 7: ₱699.00 is charged unless you cancel before then.')).toBeTruthy();
    expect(screen.getByText(PLUS_TEXT.renews)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start 7 days free' }));
    expect(store.getState().buyPlus).toHaveBeenCalledWith(PLANS[0]);
    expect(await screen.findByText(PLUS_TEXT.thanks)).toBeTruthy();
  });

  it('never shows the yearly plan as a monthly amount, and its two buttons are the same kind of full-width button', async () => {
    const store = testStore({ view: viewWith(), plusShop: jest.fn(async () => ({ ok: true as const, plans: PLANS })) });
    await render(withStore(store, <Plus onClose={jest.fn()} />));
    await screen.findByText('₱129.00 a month');
    expect(screen.queryByText(/₱699\.00 a month|58\.25/)).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: /Monthly/ }));
    expect(screen.getByRole('button', { name: 'Buy monthly' })).toBeTruthy();
    expect(screen.queryByText(/Day 7:/)).toBeNull();
    // The close button says Not now too, so a screen reader hears the same way out at the top and beside Buy.
    expect(screen.getAllByRole('button', { name: PLUS_TEXT.notNow })).toHaveLength(2);
  });

  it('a restore that finds nothing says so; Terms and Privacy open the site', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const store = testStore({ view: viewWith(), plusShop: jest.fn(async () => ({ ok: true as const, plans: PLANS })) });
    await render(withStore(store, <Plus onClose={jest.fn()} />));
    await fireEvent.press(await screen.findByRole('button', { name: PLUS_TEXT.restore }));
    expect(await screen.findByText(PLUS_TEXT.nothingToRestore)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PLUS_TEXT.privacy }));
    expect(open).toHaveBeenCalledWith('https://levelmeup.dannytist.com/privacy');
  });

  it('a player already on Plus sees their Plus, not plans', async () => {
    await render(withStore(testStore({ view: viewWith([row()]) }), <Plus onClose={jest.fn()} />));
    expect(await screen.findByText(/^Plus, yearly: renews/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Start|Buy/ })).toBeNull();
  });
});

describe('Your look', () => {
  it('a free player\'s Plus colours and frames open the offer and change nothing', async () => {
    const onPlus = jest.fn();
    const store = testStore({ view: viewWith() });
    await render(withStore(store, <Look onBack={jest.fn()} onPlus={onPlus} />));
    await fireEvent.press(screen.getByRole('radio', { name: /System Blue/ }));
    await fireEvent.press(screen.getByRole('radio', { name: /Moon ring/ }));
    expect(onPlus).toHaveBeenCalledTimes(2);
    expect(store.getState().setTheme).not.toHaveBeenCalled();
    expect(store.getState().setFrame).not.toHaveBeenCalled();
    expect(screen.queryByRole('radio', { name: /Founder/ })).toBeNull();
  });

  it('a Plus player picks them; a Founder also has the Founder frame', async () => {
    const store = testStore({ view: viewWith([FOUNDER]) });
    await render(withStore(store, <Look onBack={jest.fn()} onPlus={jest.fn()} />));
    await fireEvent.press(screen.getByRole('radio', { name: /Mint Night/ }));
    await fireEvent.press(screen.getByRole('radio', { name: /^Founder/ }));
    expect(store.getState().setTheme).toHaveBeenCalledWith('mintNight');
    expect(store.getState().setFrame).toHaveBeenCalledWith('founder');
  });
});

describe('Settings → LevelMeUp Plus', () => {
  const settings = (view: Shown, onPlus = jest.fn()) => withStore(testStore({ view }), (
    <Settings onBack={jest.fn()} onTraining={jest.fn()} onGame={jest.fn()} onDelete={jest.fn()} version="0.6.0" deviceZone="Asia/Manila"
      onPlus={onPlus} onLook={jest.fn()} />
  ));

  it('a free player sees "Not on Plus" and a way to see it', async () => {
    const onPlus = jest.fn();
    await render(settings(viewWith(), onPlus));
    expect(screen.getByText(PLUS_TEXT.settings.free)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PLUS_TEXT.settings.see }));
    expect(onPlus).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: PLUS_TEXT.settings.manage })).toBeNull();
  });

  it('a subscriber can manage the subscription in Google Play (Google requires the way to cancel)', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(settings(viewWith([row()])));
    await fireEvent.press(screen.getByRole('button', { name: PLUS_TEXT.settings.manage }));
    expect(open).toHaveBeenCalledWith(purchases.manageUrl('plus_yearly'));
  });

  it('a Founder has nothing to manage', async () => {
    await render(settings(viewWith([FOUNDER])));
    expect(screen.getByText(PLUS_TEXT.settings.status.founder)).toBeTruthy();
    expect(screen.queryByRole('button', { name: PLUS_TEXT.settings.manage })).toBeNull();
  });
});

describe('Today\'s Plus card', () => {
  const today = (view: Shown, onPlus = jest.fn()) => withStore(testStore({ view }), (
    <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()}
      onCheckin={jest.fn()} onPlus={onPlus} now={() => NOW} />
  ));

  it('a week in, once Plus is on sale, the card offers it once', async () => {
    jest.spyOn(purchases, 'purchasesSetUp').mockReturnValue(true);
    const base = viewWith([], ['core']);
    const onPlus = jest.fn();
    await render(today({ ...base, today: { ...base.today!, dayNumber: 7 } }, onPlus));
    const strip = screen.getByTestId('notice-strip');
    expect(within(strip).getByText(`${PLUS_TEXT.day7.title}. ${PLUS_TEXT.day7.line}`)).toBeTruthy();
    await fireEvent.press(within(strip).getByRole('button', { name: PLUS_TEXT.day7.see }));
    expect(onPlus).toHaveBeenCalled();
  });

  it('never while Plus isn\'t on sale', async () => {
    const base = viewWith([], ['core']);
    await render(today({ ...base, today: { ...base.today!, dayNumber: 7 } }));
    expect(screen.queryByText(new RegExp(PLUS_TEXT.day7.title))).toBeNull();
  });
});

describe('deleting with a running subscription', () => {
  it('says that deleting doesn\'t cancel it', async () => {
    await render(withStore(testStore({ view: viewWith([row()]) }), <DeleteCharacter onDeleted={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(PLUS_TEXT.deleteNote)).toBeTruthy();
  });

  it('and says nothing about it otherwise', async () => {
    await render(withStore(testStore({ view: viewWith([FOUNDER]) }), <DeleteCharacter onDeleted={jest.fn()} onBack={jest.fn()} />));
    expect(screen.queryByText(PLUS_TEXT.deleteNote)).toBeNull();
  });
});

describe('the all-time stat chart', () => {
  it('locked for a free player, with a way to Plus', async () => {
    const onPlus = jest.fn();
    await render(<StatChart weeks={null} onPlus={onPlus} />);
    expect(screen.getByText(PLUS_TEXT.chart.locked)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PLUS_TEXT.settings.see }));
    expect(onPlus).toHaveBeenCalled();
  });

  it('draws the chosen stat over the weeks and says it in words', async () => {
    const weeks = [
      { week: '2026-10-05', points: { strength: 7, vitality: 5, wisdom: 5, focus: 5, discipline: 4 } },
      { week: '2026-10-12', points: { strength: 9, vitality: 6, wisdom: 5, focus: 5, discipline: 4 } },
    ];
    await render(<StatChart weeks={weeks} onPlus={jest.fn()} />);
    expect(screen.getByLabelText(fillText(PLUS_TEXT.chart.label, { stat: STAT_NAMES.strength, from: 7, to: 9, weeks: 2 }))).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: STAT_NAMES.vitality }));
    expect(screen.getByLabelText(fillText(PLUS_TEXT.chart.label, { stat: STAT_NAMES.vitality, from: 5, to: 6, weeks: 2 }))).toBeTruthy();
  });

  it('places the points across the width, highest at the top; a flat line sits in the middle', () => {
    expect(chartPoints([1, 3], 120, 100)).toEqual([[10, 90], [110, 10]]);
    expect(chartPoints([4, 4, 4], 120, 100).map(([, y]) => y)).toEqual([50, 50, 50]);
  });
});

describe('the Plus looks', () => {
  afterEach(() => applyTheme('moonlight'));

  it('applying a look swaps every colour at once, ripples included', () => {
    applyTheme('systemBlue');
    expect(appliedTheme()).toBe('systemBlue');
    expect(colors.night).toBe(PALETTES.systemBlue.night);
    expect(RIPPLE.night).toBe(PALETTES.systemBlue.rippleNight);
    applyTheme('moonlight');
    expect(colors.accent).toBe('#A9B4FF');
  });

  it('every look has every colour Moonlight has', () => {
    for (const t of THEMES) expect(Object.keys(PALETTES[t]).sort()).toEqual(Object.keys(PALETTES.moonlight).sort());
  });

  it('a frame draws over the portrait', async () => {
    await render(<Portrait classId="warrior" level={3} figure="a" label="Your portrait" frame="moon" />);
    expect(screen.getByTestId('frame-moon', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('the trial reminder\'s words', () => {
  it('say when it ends and that cancelling is in Google Play', () => {
    expect(NOTIFY_TEXT.trial.title).toMatch(/2 days/);
    expect(NOTIFY_TEXT.trial.body).toMatch(/cancel in Google Play/);
  });
});
