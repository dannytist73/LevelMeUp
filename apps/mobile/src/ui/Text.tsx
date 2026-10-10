// The Ink Panel type scale (visual spec §1.2). Every text grows with the phone's font size up to its variant's cap and
// wraps; none sets numberOfLines, so nothing is ever cut off.
import { Text as RNText } from 'react-native';
import type { TextProps as RNTextProps } from 'react-native';
import { colors, fonts, type as scale } from '../theme/tokens.ts';
import type { TypeVariant } from '../theme/tokens.ts';

export type Tone = 'chalk' | 'ash' | 'ashLight' | 'ink' | 'inkSoft' | 'inkMuted' | 'ember' | 'sealText' | 'white';
export type TextProps = Omit<RNTextProps, 'numberOfLines' | 'ellipsizeMode'> & {
  tone?: Tone;
  /** Body variants only: Gothic A1 Medium or Bold. */
  weight?: 'regular' | 'medium' | 'bold';
};

function make(variant: TypeVariant, defaultTone: Tone) {
  const spec = scale[variant];
  function InkText({ tone = defaultTone, weight = 'regular', style, ...rest }: TextProps) {
    const family =
      spec.family === fonts.body && weight !== 'regular' ? (weight === 'medium' ? fonts.bodyMedium : fonts.bodyBold) : spec.family;
    return (
      <RNText
        {...rest}
        maxFontSizeMultiplier={spec.maxScale}
        style={[
          {
            fontFamily: family,
            fontSize: spec.size,
            lineHeight: Math.round(spec.size * spec.lineHeight),
            letterSpacing: spec.tracking * spec.size,
            color: colors[tone],
            textTransform: spec.uppercase ? 'uppercase' : 'none',
          },
          style,
        ]}
      />
    );
  }
  InkText.displayName = `Text.${variant}`;
  return InkText;
}

export const Display = make('display', 'chalk');
export const Title = make('title', 'chalk');
export const Heading = make('heading', 'chalk');
export const Label = make('label', 'ash');
export const Body = make('body', 'chalk');
export const Small = make('small', 'ashLight');
export const Meta = make('meta', 'ash');
export const Caption = make('caption', 'ash');
