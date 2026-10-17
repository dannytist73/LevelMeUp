import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../src/theme/tokens.ts';
import { Body, Caption, Display, Heading, Label, Meta, Small, Title } from '../src/ui/Text.tsx';

const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

describe('Lantern text (M11)', () => {
  it.each([
    ['Display', Display, 'MPlusRounded-ExtraBold', 54, 1.15],
    ['Title', Title, 'MPlusRounded-ExtraBold', 30, 1.15],
    ['Heading', Heading, 'MPlusRounded-ExtraBold', 21, 1.2],
    ['Label', Label, 'MPlusRounded-Bold', 14, 1.3],
    ['Body', Body, 'MPlusRounded-Regular', 16, 1.5],
    ['Small', Small, 'MPlusRounded-Regular', 14, 1.5],
    ['Meta', Meta, 'MPlusRounded-Regular', 13, 1.5],
    ['Caption', Caption, 'MPlusRounded-Regular', 12, 1.5],
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
    expect(styleOf('on paper')).toMatchObject({ color: colors.ink, fontFamily: 'MPlusRounded-Bold' });
  });

  it('ignores a weight on display text', async () => {
    await render(<Heading weight="bold">Title</Heading>);
    expect(styleOf('Title').fontFamily).toBe('MPlusRounded-ExtraBold');
  });
});
