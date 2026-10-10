import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../src/theme/tokens.ts';
import { Body, Caption, Display, Heading, Label, Meta, Small, Title } from '../src/ui/Text.tsx';

const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

describe('Ink Panel text', () => {
  it.each([
    ['Display', Display, 'BlackHanSans', 58, 1.15],
    ['Title', Title, 'BlackHanSans', 34, 1.15],
    ['Heading', Heading, 'BlackHanSans', 22, 1.2],
    ['Label', Label, 'BlackHanSans', 13, 1.3],
    ['Body', Body, 'GothicA1-Regular', 16, 1.5],
    ['Small', Small, 'GothicA1-Regular', 14, 1.5],
    ['Meta', Meta, 'GothicA1-Regular', 13, 1.5],
    ['Caption', Caption, 'GothicA1-Regular', 12, 1.5],
  ] as const)('%s uses its family, size and font-scale cap', async (_, Variant, family, size, cap) => {
    await render(<Variant>words</Variant>);
    expect(styleOf('words')).toMatchObject({ fontFamily: family, fontSize: size });
    expect(screen.getByText('words').props.maxFontSizeMultiplier).toBe(cap);
    expect(screen.getByText('words').props.numberOfLines).toBeUndefined();
  });

  it('labels are uppercase and tracked; the words stay as written for screen readers', async () => {
    await render(<Label>core quest</Label>);
    expect(styleOf('core quest')).toMatchObject({ textTransform: 'uppercase' });
    expect(styleOf('core quest').letterSpacing).toBeGreaterThan(1);
  });

  it('takes a tone and a body weight', async () => {
    await render(<Body tone="ink" weight="bold">on paper</Body>);
    expect(styleOf('on paper')).toMatchObject({ color: colors.ink, fontFamily: 'GothicA1-Bold' });
  });

  it('ignores a weight on display text', async () => {
    await render(<Heading weight="bold">Title</Heading>);
    expect(styleOf('Title').fontFamily).toBe('BlackHanSans');
  });
});
