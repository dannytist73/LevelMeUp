import * as content from '@levelmeup/content';
import { inSubset, subsetText } from '../src/theme/glyphs.ts';

/** Every string reachable from a value (objects, arrays, functions skipped). */
function strings(value: unknown, seen = new Set<unknown>()): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object' || value === null || seen.has(value)) return [];
  seen.add(value);
  return Object.values(value).flatMap((v) => strings(v, seen));
}

describe('the font subsets', () => {
  it('cover every character the content package can show', () => {
    const all = strings(content);
    expect(all.length).toBeGreaterThan(1000);
    const missing = [...new Set(all.flatMap((s) => [...s]))].filter((c) => !inSubset(c));
    expect(missing.map((c) => `${c} U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)).toEqual([]);
  });

  it('keep the letters, digits and the punctuation the boards use', () => {
    for (const c of ['A', 'z', '0', '·', '×', '—', '’', '“', '…', '→', '−']) expect(inSubset(c)).toBe(true);
    expect(inSubset('한')).toBe(false);
    expect([...subsetText()].every(inSubset)).toBe(true);
  });
});
