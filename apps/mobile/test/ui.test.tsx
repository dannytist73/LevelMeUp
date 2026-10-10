import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../src/theme/tokens.ts';
import { Button } from '../src/ui/Button.tsx';
import { Chip } from '../src/ui/Chip.tsx';
import { HalftoneHeader } from '../src/ui/HalftoneHeader.tsx';
import { Icon } from '../src/ui/icons.tsx';
import { InkTabBar } from '../src/ui/InkTabBar.tsx';
import { NarrationBox } from '../src/ui/NarrationBox.tsx';
import { NightCard } from '../src/ui/NightCard.tsx';
import { OutlinedTitle } from '../src/ui/OutlinedTitle.tsx';
import { SectionTitle } from '../src/ui/SectionTitle.tsx';
import { SlamIn } from '../src/ui/SlamIn.tsx';
import { SlantPanel, slantPoints } from '../src/ui/SlantPanel.tsx';
import { MarkStamp, XpStamp, clampRotation } from '../src/ui/Stamp.tsx';
import { XpBar, fillFraction } from '../src/ui/XpBar.tsx';

const flat = (style: unknown): Record<string, unknown> => (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;

describe('Button', () => {
  it('is a labelled button at least 48 high that calls back on press', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(flat(button.props.style).minHeight).toBeGreaterThanOrEqual(48);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a commitment button is seal red with white text', async () => {
    await render(<Button label="Accept class" variant="commitment" onPress={() => {}} />);
    expect(flat(screen.getByRole('button').props.style).backgroundColor).toBe(colors.seal);
    expect(flat(screen.getByText('Accept class').props.style).color).toBe(colors.white);
  });

  it('a primary button is paper on the night and ink on paper', async () => {
    await render(<Button label="A" onPress={() => {}} />);
    expect(flat(screen.getByRole('button').props.style).backgroundColor).toBe(colors.paper);
    await screen.unmount();
    await render(<Button label="B" on="paper" onPress={() => {}} />);
    expect(flat(screen.getByRole('button').props.style).backgroundColor).toBe(colors.ink);
  });

  it('a disabled button says so and does nothing', async () => {
    const onPress = jest.fn();
    await render(<Button label="Wait" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Wait' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SlantPanel', () => {
  it('cuts the top-left corner down by the depth', () => {
    expect(slantPoints('top', 18, 300, 200)).toBe('0,18 300,0 300,200 0,200');
  });

  it('cuts the bottom edge up towards the right', () => {
    expect(slantPoints('bottom', 30, 390, 240)).toBe('0,0 390,0 390,210 0,240');
  });

  it('never cuts deeper than half the panel', () => {
    expect(slantPoints('top', 18, 300, 20)).toBe('0,10 300,0 300,20 0,20');
  });

  it('renders its children, with the vermilion offset only when asked', async () => {
    await render(<SlantPanel offset><Text>inside</Text></SlantPanel>);
    expect(screen.getByText('inside')).toBeTruthy();
    expect(screen.queryByTestId('slant-offset')).toBeNull(); // drawn once the panel knows its size
    await fireEvent(screen.getByTestId('slant-panel'), 'layout', { nativeEvent: { layout: { width: 300, height: 200 } } });
    expect(screen.getByTestId('slant-offset')).toBeTruthy();
    await screen.unmount();
    await render(<SlantPanel><Text>plain</Text></SlantPanel>);
    await fireEvent(screen.getByTestId('slant-panel'), 'layout', { nativeEvent: { layout: { width: 300, height: 200 } } });
    expect(screen.queryByTestId('slant-offset')).toBeNull();
  });
});

describe('NarrationBox', () => {
  it('reads as one line: the speaker, then the words', async () => {
    await render(<NarrationBox>The System is preparing your trials.</NarrationBox>);
    expect(screen.getByLabelText('System: The System is preparing your trials.')).toBeTruthy();
    expect(screen.getByText('SYSTEM')).toBeTruthy();
  });
});

describe('stamps', () => {
  it('keep their tilt between −12° and +12°', () => {
    expect(clampRotation(-30)).toBe(-12);
    expect(clampRotation(5)).toBe(5);
    expect(clampRotation(40)).toBe(12);
  });

  it('an XP stamp is announced as its reward', async () => {
    await render(<XpStamp xp={20} rotate={-25} />);
    const stamp = screen.getByLabelText('+20 XP');
    expect(flat(stamp.props.style).transform).toEqual([{ rotate: '-12deg' }]);
    expect(flat(stamp.props.style).backgroundColor).toBe(colors.seal);
  });

  it('a mark stamp is an ember outline', async () => {
    await render(<MarkStamp text="Cleared +20" />);
    expect(flat(screen.getByLabelText('Cleared +20').props.style)).toMatchObject({ borderColor: colors.ember });
  });
});

describe('small pieces', () => {
  it('a chip is an uppercase label, solid or outlined', async () => {
    await render(<Chip label="strength" />);
    expect(flat(screen.getByText('strength').props.style).textTransform).toBe('uppercase');
    await screen.unmount();
    await render(<Chip label="timer" kind="outline" />);
    expect(flat(screen.getByTestId('chip').props.style).borderColor).toBe(colors.chalk);
  });

  it('a night card has a 2 px chalk border, or a quiet one once cleared', async () => {
    await render(<NightCard><Text>a</Text></NightCard>);
    expect(flat(screen.getByTestId('night-card').props.style)).toMatchObject({ borderWidth: 2, borderColor: colors.chalk });
    await screen.unmount();
    await render(<NightCard quiet><Text>b</Text></NightCard>);
    expect(flat(screen.getByTestId('night-card').props.style).borderColor).toBe(colors.lineSoft);
  });

  it('a section title is a heading', async () => {
    await render(<SectionTitle title="Side quests" count="1 / 2" />);
    expect(screen.getByRole('header', { name: 'Side quests' })).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
  });

  it('icons are hidden from screen readers', async () => {
    await render(<Icon name="settings" />);
    expect(screen.queryByTestId('icon-settings')).toBeNull();
    expect(screen.getByTestId('icon-settings', { includeHiddenElements: true }).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('the halftone header shows its children', async () => {
    await render(<HalftoneHeader><Text>Day 3</Text></HalftoneHeader>);
    expect(screen.getByText('Day 3')).toBeTruthy();
  });

  it('the outlined title is read as plain text', async () => {
    await render(<OutlinedTitle text="Ink Panel" />);
    expect(screen.getByRole('header', { name: 'Ink Panel' })).toBeTruthy();
  });
});

describe('XpBar', () => {
  it('reports its progress and fills in proportion, within range', async () => {
    expect(fillFraction(62, 130)).toBeCloseTo(0.477, 3);
    expect(fillFraction(0, 130)).toBe(0);
    expect(fillFraction(200, 130)).toBe(1);
    expect(fillFraction(5, 0)).toBe(0);
    await render(<XpBar value={62} max={130} label="Level 6 progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Level 6 progress' });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 130, now: 62 });
  });
});

describe('InkTabBar', () => {
  const tabs = [
    { key: 'index', label: 'Today', icon: 'sun' },
    { key: 'character', label: 'Character', icon: 'user' },
    { key: 'chronicle', label: 'Chronicle', icon: 'calendar' },
  ] as const;

  it('shows three tabs, marks the active one, and switches on press', async () => {
    const onSelect = jest.fn();
    await render(<InkTabBar tabs={tabs} active="character" onSelect={onSelect} />);
    const all = screen.getAllByRole('tab');
    expect(all).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Character' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole('tab', { name: 'Today' }).props.accessibilityState).toMatchObject({ selected: false });
    expect(flat(screen.getByRole('tab', { name: 'Character' }).props.style)).toMatchObject({ borderTopColor: colors.vermilion, borderTopWidth: 4 });
    for (const tab of all) expect(flat(tab.props.style).minHeight).toBeGreaterThanOrEqual(44);
    await fireEvent.press(screen.getByRole('tab', { name: 'Chronicle' }));
    expect(onSelect).toHaveBeenCalledWith('chronicle');
  });
});

describe('SlamIn', () => {
  it('with reduced motion, shows its children without moving them', async () => {
    await render(<SlamIn reduceMotion><Text>panel</Text></SlamIn>);
    expect(screen.getByText('panel')).toBeTruthy();
    expect(flat(screen.getByTestId('slam-in').props.style).transform).toBeUndefined();
  });
});
