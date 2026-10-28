import { contrast } from '../src/theme/contrast.ts';
import { G } from '../src/base/theme.ts';

describe('Graphite (the base app look)', () => {
  it('every text pair is 4.5:1 or better', () => {
    const pairs: [string, string, string][] = [
      ['text on bg', G.text, G.bg], ['text on surface', G.text, G.surface], ['text on raised', G.text, G.raised],
      ['muted on bg', G.muted, G.bg], ['muted on surface', G.muted, G.surface], ['muted on raised', G.muted, G.raised],
      ['accent words on bg', G.accentText, G.bg], ['accent words on surface', G.accentText, G.surface], ['accent words on done', G.accentText, G.doneBg],
      ['on accent', G.onAccent, G.accent], ['text on done', G.text, G.doneBg], ['warn on bg', G.warn, G.bg], ['muted on tab bar', G.muted, G.tabBar],
    ];
    for (const [name, fg, bg] of pairs) expect([name, contrast(fg, bg) >= 4.5]).toEqual([name, true]);
  });
  it('control edges are 3:1 on the background and on a card', () => {
    expect(contrast(G.edge, G.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(G.edge, G.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(G.accent, G.bg)).toBeGreaterThanOrEqual(3);
  });
});
