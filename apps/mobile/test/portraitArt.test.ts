/** @jest-environment node */
import {
  FIGURES, PORTRAIT_BASE, SHADOW_ART_URL, figureFor, otherFigure, portraitChanges, portraitTier, portraitUrl, readFigure,
} from '../src/art/portraits.ts';

describe('the class portraits (M9a)', () => {
  it('reads the class-v1 folder of the public lmu-art bucket', () => {
    expect(PORTRAIT_BASE).toBe('https://knlgpcwoaaygncmlnbsm.supabase.co/storage/v1/object/public/lmu-art/class-v1');
    expect(SHADOW_ART_URL).toBe(`${PORTRAIT_BASE}/shadow.webp`);
  });

  it('changes with the class path: levels 1–4, 5–9, 10 on (decision 2)', () => {
    expect([1, 4, 5, 9, 10, 30].map(portraitTier)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(portraitUrl('warrior', 'a', 1)).toBe(`${PORTRAIT_BASE}/warrior-a-1.webp`);
    expect(portraitUrl('mage', 'b', 7)).toBe(`${PORTRAIT_BASE}/mage-b-2.webp`);
    expect(portraitUrl('monk', 'b', 10)).toBe(`${PORTRAIT_BASE}/monk-b-3.webp`);
    expect([1, 2, 4, 5, 6, 9, 10, 11].filter(portraitChanges)).toEqual([5, 10]);
  });

  it("is the player's figure, or the program style's default (decision 5)", () => {
    expect(FIGURES).toEqual(['a', 'b']);
    expect(figureFor(null, 'women')).toBe('b');
    expect(figureFor(null, 'men')).toBe('a');
    expect(figureFor(null, 'none')).toBe('a');
    expect(figureFor('b', 'men')).toBe('b');
    expect(figureFor(undefined, 'women')).toBe('b'); // a store without the field (the developer previews)
    expect([otherFigure('a'), otherFigure('b')]).toEqual(['b', 'a']);
    expect([readFigure('a'), readFigure('b'), readFigure('c'), readFigure(''), readFigure(null)]).toEqual(['a', 'b', null, null, null]);
  });
});
