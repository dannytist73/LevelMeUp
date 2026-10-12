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

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

/**
 * At most n characters of untrusted text, for a message or a stored field: control characters dropped and half an
 * emoji replaced, since Postgres refuses both (M8a review: one such character used to stop every later tick).
 */
export function clip(text: string, n: number): string {
  return Array.from(text.replace(CONTROL, '').replace(LONE_SURROGATE, '�')).slice(0, n).join('');
}

/** True when text holds a control character or half an emoji, which an article may not. */
export function hasBrokenCharacters(text: string): boolean {
  return /[\u0000-\u001f\u007f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(text);
}
