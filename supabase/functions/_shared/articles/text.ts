// Word helpers for the article checks (M8a).

/** Lowercase words, letters and digits only, so punctuation and case can't hide a copied run. */
export function wordsOf(text: string): string[] {
  return text.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w !== '');
}

export function wordCount(text: string): number {
  return wordsOf(text).length;
}

/** Every run of n consecutive words, joined by spaces. */
export function shingles(text: string, n: number): string[] {
  const words = wordsOf(text);
  const runs: string[] = [];
  for (let i = 0; i + n <= words.length; i++) runs.push(words.slice(i, i + n).join(' '));
  return runs;
}
