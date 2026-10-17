import { contrast } from '../src/theme/contrast.ts';
import { colors } from '../src/theme/tokens.ts';
import type { ColorName } from '../src/theme/tokens.ts';

describe('the Lantern colours (M11, Moonlight)', () => {
  it('match the plan', () => {
    expect(colors).toMatchObject({
      night: '#171A2B', panel: '#222640', halftone: '#1E2236', line: '#383F63', divider: '#2A2F4A', paper: '#EEF0FA',
      ink: '#1B1E31', chalk: '#F1F0F7', ash: '#A4AAC8', ashLight: '#C9CDE2', accent: '#A9B4FF', commit: '#A9B4FF',
      onAccent: '#161A2B', accentText: '#BAC3FF', accentInk: '#4F5BB8', shadow: '#FF6B7A', void: '#07080F', lineStrong: '#6A73A0',
    });
  });

  it('keeps red for the Shadow alone: no other colour is red or orange', () => {
    const hue = (hex: string): { h: number; s: number } => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : d / max };
    };
    const warm = (Object.entries(colors) as [ColorName, string][])
      .filter(([, hex]) => {
        const { h, s } = hue(hex);
        return s > 0.3 && (h < 50 || h > 330);
      })
      .map(([name]) => name);
    expect(warm.sort()).toEqual(['shadow', 'shadowDeep']);
  });

  // Every text pairing the screens use.
  const pairs: [ColorName, ColorName][] = [
    ['paper', 'ink'], ['paper', 'accentInk'], ['paper', 'inkSoft'], ['paper', 'inkMuted'], ['commit', 'onAccent'], ['accent', 'onAccent'],
    ['ink', 'chalk'], ['tabBar', 'chalk'], ['tabBar', 'ash'], ['tabBar', 'accentText'],
    ['night', 'chalk'], ['night', 'ash'], ['night', 'ashLight'], ['night', 'accentText'], ['night', 'shadow'],
    ['panel', 'chalk'], ['panel', 'ash'], ['panel', 'ashLight'], ['panel', 'accentText'], ['panel', 'shadow'],
    ['halftone', 'chalk'], ['halftone', 'ash'], ['void', 'shadow'], ['accentInk', 'white'],
  ];

  // M12 (audit 13): what you can press or type in has an edge of 3:1 on the surfaces it sits on.
  it.each([['night', 'lineStrong'], ['panel', 'lineStrong'], ['halftone', 'lineStrong']] as [ColorName, ColorName][])('an interactive edge on %s (%s) reaches 3:1', (back, edge) => {
    expect(contrast(colors[back], colors[edge])).toBeGreaterThanOrEqual(3);
  });

  it.each(pairs)('%s text pairing with %s reaches 4.5:1', (back, text) => {
    expect(contrast(colors[back], colors[text])).toBeGreaterThanOrEqual(4.5);
  });

  // The XP bar's fill against its track and the surface around it, on the night and on paper (M11 review).
  const graphics: [ColorName, ColorName][] = [['segmentNext', 'accent'], ['night', 'accent'], ['trackOnPaper', 'accentInk'], ['paper', 'accentInk']];
  it.each(graphics)('the bar on %s with a %s fill reaches 3:1', (back, fill) => {
    expect(contrast(colors[back], colors[fill])).toBeGreaterThanOrEqual(3);
  });

  it('computes WCAG ratios', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
    expect(() => contrast('red', '#FFFFFF')).toThrow(RangeError);
  });
});
