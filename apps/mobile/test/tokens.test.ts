import { contrast } from '../src/theme/contrast.ts';
import { colors } from '../src/theme/tokens.ts';
import type { ColorName } from '../src/theme/tokens.ts';

describe('the Ink Panel colours', () => {
  it('match the visual spec', () => {
    expect(colors).toMatchObject({
      night: '#0E0E10', panel: '#18181B', halftone: '#1A1A1E', line: '#4A4A50', divider: '#26262B', paper: '#E8E1D3',
      ink: '#151515', chalk: '#F1ECE1', ash: '#A8A196', ashLight: '#C9C2B6', vermilion: '#E0452B', seal: '#C2321C',
      ember: '#F0765E', sealText: '#B02E1A', void: '#050506',
    });
  });

  // Every text pairing the boards use (visual spec §1.1).
  const pairs: [ColorName, ColorName][] = [
    ['paper', 'ink'], ['paper', 'sealText'], ['paper', 'inkSoft'], ['paper', 'inkMuted'], ['seal', 'white'], ['ink', 'chalk'],
    ['tabBar', 'chalk'], ['tabBar', 'ash'],
    ['night', 'chalk'], ['night', 'ash'], ['night', 'ashLight'], ['night', 'ember'],
    ['panel', 'chalk'], ['panel', 'ash'], ['panel', 'ashLight'], ['halftone', 'chalk'], ['halftone', 'ash'], ['void', 'ember'],
  ];

  it.each(pairs)('%s text pairing with %s reaches 4.5:1', (back, text) => {
    expect(contrast(colors[back], colors[text])).toBeGreaterThanOrEqual(4.5);
  });

  it('computes WCAG ratios', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
    expect(() => contrast('red', '#FFFFFF')).toThrow(RangeError);
  });
});
