import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../src/theme/tokens.ts';
import { Button } from '../src/ui/Button.tsx';
import { Chip } from '../src/ui/Chip.tsx';
import { HalftoneHeader } from '../src/ui/HalftoneHeader.tsx';
import { Icon } from '../src/ui/icons.tsx';
import { InkTabBar } from '../src/ui/InkTabBar.tsx';
import { NarrationBox } from '../src/ui/NarrationBox.tsx';
import { NightCard } from '../src/ui/NightCard.tsx';
import { OutlinedTitle, fittedSize } from '../src/ui/OutlinedTitle.tsx';
import { ScreenScroll } from '../src/ui/ScreenScroll.tsx';
import { SectionTitle } from '../src/ui/SectionTitle.tsx';
import { SlamIn } from '../src/ui/SlamIn.tsx';
import { SlantPanel, slantPoints } from '../src/ui/SlantPanel.tsx';
import { MarkStamp, XpStamp, clampRotation } from '../src/ui/Stamp.tsx';
import { XpBar, fillFraction } from '../src/ui/XpBar.tsx';
import { HOLD_SETTLE_MS, HoldButton } from '../src/ui/HoldButton.tsx';
import { OptionCard } from '../src/ui/OptionCard.tsx';
import { ProgressSegments } from '../src/ui/ProgressSegments.tsx';
import { QuestArt } from '../src/ui/QuestArt.tsx';
import { SpeedLines } from '../src/ui/SpeedLines.tsx';
import { TextField } from '../src/ui/TextField.tsx';
import { TimeStepper } from '../src/ui/TimeStepper.tsx';

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

  it('the outlined title keeps its size when it fits and shrinks to fit when it does not', () => {
    expect(fittedSize(58, 300, 400)).toBe(58);
    expect(fittedSize(58, null, 100)).toBe(58); // not measured yet
    expect(fittedSize(58, 400, 300)).toBe(43); // 400 × 43/58 ≈ 297, inside 300
    expect(fittedSize(58, 400, 0)).toBe(1); // never zero or negative
  });

  it('the outlined title draws only once measured, then at the size that fits its box', async () => {
    type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };
    /** The font size of each drawn SVG copy of the title. */
    const drawnSizes = () => {
      const sizes: unknown[] = [];
      const walk = (node: Node | string | null) => {
        if (node === null || typeof node === 'string') return;
        if (node.type === 'RNSVGText') sizes.push((node.props.font as { fontSize?: unknown } | undefined)?.fontSize ?? node.props.fontSize);
        node.children?.forEach(walk);
      };
      walk(screen.toJSON() as Node);
      return sizes;
    };
    const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 70 } } });
    await render(<OutlinedTitle text="INK PANEL" />);
    await fireEvent(screen.getByRole('header', { name: 'INK PANEL' }), 'layout', layout(300));
    expect(drawnSizes()).toEqual([]); // not measured yet: nothing drawn, so no clipped first frame
    await fireEvent(screen.getByText('INK PANEL', { includeHiddenElements: true }), 'layout', layout(400));
    expect(drawnSizes()).toEqual([41, 41, 41]); // three copies; room 300 − 8 − 5 = 287, 58 × 287/400 ≈ 41.6
  });

  it('the outlined title can be centred: each copy is anchored at the middle of its box (Quest cleared, M6a)', async () => {
    type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };
    const drawn: { x: unknown; anchor: unknown }[] = [];
    const walk = (node: Node | string | null) => {
      if (node === null || typeof node === 'string') return;
      if (node.type === 'RNSVGText') drawn.push({ x: (node.props.x as unknown[])[0], anchor: (node.props.font as { textAnchor?: unknown }).textAnchor });
      node.children?.forEach(walk);
    };
    const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 70 } } });
    await render(<OutlinedTitle text="CLEARED" align="center" />);
    await fireEvent(screen.getByRole('header', { name: 'CLEARED' }), 'layout', layout(300));
    await fireEvent(screen.getByText('CLEARED', { includeHiddenElements: true }), 'layout', layout(200));
    walk(screen.toJSON() as Node);
    // the vermilion copy sits 5 to the right (58 × 0.09), the ink and chalk copies at the middle
    expect(drawn).toEqual([{ x: 155, anchor: 'middle' }, { x: 150, anchor: 'middle' }, { x: 150, anchor: 'middle' }]);
  });

  it('a screen scroll shows its content, with a band behind the status bar that never takes touches', async () => {
    await render(<ScreenScroll><Text>Quest</Text></ScreenScroll>);
    expect(screen.getByText('Quest')).toBeTruthy();
    expect(screen.getByTestId('status-band').props.pointerEvents).toBe('none');
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
    // single words: wrapping broke CHARACTER mid-word at the largest font and display size (emulator), so they shrink to fit
    for (const label of ['Today', 'Character', 'Chronicle']) {
      expect(screen.getByText(label).props).toMatchObject({ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.6 });
    }
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

describe('OptionCard', () => {
  it('is a radio, unchecked and without the offset until selected', async () => {
    const onPress = jest.fn();
    await render(<OptionCard label="Mentor" detail="Warm" selected={false} onPress={onPress} />);
    const card = screen.getByRole('radio', { name: 'Mentor. Warm' });
    expect(card.props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.queryByTestId('option-offset')).toBeNull();
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('selected: checked, with the vermilion offset for a single choice only', async () => {
    await render(
      <>
        <OptionCard label="Steady" selected onPress={() => {}} />
        <OptionCard label="Knees" kind="checkbox" selected onPress={() => {}} />
      </>,
    );
    expect(screen.getByRole('radio', { name: 'Steady' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole('checkbox', { name: 'Knees' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getAllByTestId('option-offset')).toHaveLength(1);
  });

  it('a disabled card says so and ignores taps', async () => {
    const onPress = jest.fn();
    await render(<OptionCard label="Read and learn" kind="checkbox" selected={false} disabled onPress={onPress} />);
    const card = screen.getByRole('checkbox', { name: 'Read and learn' });
    expect(card.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(card);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ProgressSegments', () => {
  it('one bar per screen; the current one named for screen readers', async () => {
    await render(<ProgressSegments count={6} current={2} />);
    expect(screen.getByRole('progressbar', { name: 'Step 3 of 6' })).toBeTruthy();
    expect(screen.getAllByTestId('segment', { includeHiddenElements: true })).toHaveLength(6);
  });
});

describe('TimeStepper', () => {
  it('moves by half an hour and wraps around midnight', async () => {
    const onChange = jest.fn();
    await render(<TimeStepper label="Sleep" minutes={23 * 60 + 30} onChange={onChange} />);
    expect(screen.getByText('11:30 PM')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sleep 30 minutes later' }));
    expect(onChange).toHaveBeenLastCalledWith(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Sleep 30 minutes earlier' }));
    expect(onChange).toHaveBeenLastCalledWith(23 * 60);
  });
});

describe('TextField', () => {
  it('is a labelled input', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="What should I call you?" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('What should I call you?'), 'Rin');
    expect(onChangeText).toHaveBeenCalledWith('Rin');
  });
});

describe('HoldButton', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fires after a two-second hold, once the press has settled; letting go early cancels', async () => {
    const onDone = jest.fn();
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={onDone} screenReader={false} />);
    const button = screen.getByRole('button', { name: 'Hold to swear' });
    await fireEvent(button, 'pressIn');
    await act(async () => { jest.advanceTimersByTime(1_000); });
    await fireEvent(button, 'pressOut');
    await act(async () => { jest.advanceTimersByTime(3_000); });
    expect(onDone).not.toHaveBeenCalled();
    await fireEvent(button, 'pressIn');
    await act(async () => { jest.advanceTimersByTime(HOLD_SETTLE_MS + 2_000 - 1); });
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('with a screen reader on: tap, then confirm (visual spec §3)', async () => {
    const onDone = jest.fn();
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={onDone} screenReader />);
    await fireEvent.press(screen.getByRole('button', { name: 'Swear' }));
    expect(onDone).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm the vow' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('SpeedLines', () => {
  it('draws nothing a screen reader or a tap can reach', async () => {
    await render(<SpeedLines />);
    expect(screen.getByTestId('speed-lines', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
  });
});

describe('QuestArt (M6a decision 10)', () => {
  it('shows the picture when there is one', async () => {
    await render(<QuestArt uri="https://example.test/a.webp" label="Strength quest picture" fallback="Strength" />);
    expect(screen.getByTestId('quest-art').props.source).toEqual({ uri: 'https://example.test/a.webp' });
    expect(screen.getByLabelText('Strength quest picture')).toBeTruthy();
  });

  it('draws the ink fallback without a picture', async () => {
    await render(<QuestArt uri={null} label="Focus quest picture" fallback="Focus" />);
    expect(screen.getByTestId('quest-art-fallback')).toBeTruthy();
    expect(screen.getByText('FOCUS')).toBeTruthy();
  });

  it('falls back when the picture fails to load', async () => {
    await render(<QuestArt uri="https://example.test/missing.webp" label="Wisdom quest picture" fallback="Wisdom" />);
    await fireEvent(screen.getByTestId('quest-art'), 'error');
    expect(screen.getByText('WISDOM')).toBeTruthy();
  });
});

describe('XpBar on paper', () => {
  it('uses an ink border on paper and chalk on the night', async () => {
    await render(<XpBar value={1} max={2} label="On paper" on="paper" />);
    expect(StyleSheet.flatten(screen.getByRole('progressbar', { name: 'On paper' }).props.style).borderColor).toBe(colors.ink);
    await render(<XpBar value={1} max={2} label="On night" />);
    expect(StyleSheet.flatten(screen.getByRole('progressbar', { name: 'On night' }).props.style).borderColor).toBe(colors.chalk);
  });
});
