// The characters the bundled font keeps (visual spec §1.2): M PLUS Rounded 1c (M11) also covers Japanese, which makes
// it over 3 MB a weight, so `scripts/subset-fonts.mts` keeps only these ranges. A test checks that every string
// in the content package is covered; when it fails, add the character's range here and run the script again.

/** Inclusive Unicode ranges. */
export const LATIN_RANGES: readonly (readonly [number, number])[] = [
  [0x0020, 0x007e], // Basic Latin
  [0x00a0, 0x00ff], // Latin-1: no-break space, ·, ×, é, ü …
  [0x2010, 0x2015], // hyphens and dashes
  [0x2018, 0x201f], // curly quotes
  [0x2020, 0x2022], // daggers, bullet
  [0x2026, 0x2026], // ellipsis
  [0x2032, 0x2033], // prime marks
  [0x2039, 0x203a], // single angle quotes
  [0x2190, 0x2193], // arrows
  [0x2212, 0x2212], // minus sign
];

export function inSubset(char: string): boolean {
  const code = char.codePointAt(0);
  return code !== undefined && LATIN_RANGES.some(([from, to]) => code >= from && code <= to);
}

/** Every character of the ranges, as the text `subset-font` keeps. */
export function subsetText(): string {
  let text = '';
  for (const [from, to] of LATIN_RANGES) {
    for (let code = from; code <= to; code++) text += String.fromCodePoint(code);
  }
  return text;
}
