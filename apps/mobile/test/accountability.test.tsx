import { SHADOW_TEXT } from '@levelmeup/content';
import { render, screen } from '@testing-library/react-native';
import { Portrait } from '../src/ui/Portrait.tsx';
import { ShadowBox } from '../src/ui/ShadowBox.tsx';
import { ShadowMark } from '../src/ui/ShadowMark.tsx';

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(async () => {}),
  deactivateKeepAwake: jest.fn(async () => {}),
}));

describe("the Shadow's look (visual spec §2–3)", () => {
  it('speaks in its own box, read as one line, speaker first', async () => {
    await render(<ShadowBox lines={['The day closed in silence, so I took it.', 'Come and take it back.']} />);
    expect(screen.getByLabelText('The Shadow: The day closed in silence, so I took it. Come and take it back.')).toBeTruthy();
    expect(screen.getByText('THE SHADOW')).toBeTruthy();
  });

  it('marks the header and the portrait, and says so to screen readers', async () => {
    await render(<ShadowMark label={SHADOW_TEXT.mark} accessibilityLabel={SHADOW_TEXT.markLabel} />);
    expect(screen.getByLabelText(SHADOW_TEXT.markLabel)).toBeTruthy();
    await render(<Portrait classId="warrior" label="Warrior, level 3" marked />);
    expect(screen.getByLabelText('Warrior, level 3')).toBeTruthy();
    expect(screen.getByTestId('shadow-mark', { includeHiddenElements: true })).toBeTruthy();
    await render(<Portrait classId="warrior" label="Warrior, level 3" />);
    expect(screen.queryByTestId('shadow-mark', { includeHiddenElements: true })).toBeNull();
  });
});
