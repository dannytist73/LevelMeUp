import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../src/theme/tokens.ts';
import { Body, Caption, Display, Heading, Label, Meta, Small, Title } from '../src/ui/Text.tsx';

const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

describe('Lantern text (M11)', () => {
  it.each([
    ['Display', Display, 'BlackHanSans', 54, 1.15],
    ['Title', Title, 'BlackHanSans', 30, 1.15],
    ['Heading', Heading, 'BlackHanSans', 21, 1.2],
    ['Label', Label, 'GothicA1-Bold', 14, 1.3],
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

  it('labels keep their words as written (sentence case), barely tracked', async () => {
    await render(<Label>Core quest</Label>);
    expect(styleOf('Core quest')).toMatchObject({ textTransform: 'none' });
    expect(styleOf('Core quest').letterSpacing).toBeLessThan(0.5);
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
