// The Codex (M11 decision 7): the lessons a player kept from their Story Decks, on this phone only, newest first. Kept
// under kv `lmu.codex`; it goes with the character when the character is deleted, like the workouts' last sets.

export type CodexEntry = { articleId: string; title: string; lesson: string; keptAt: number };

/** At most this many lessons are kept; the oldest go first. */
export const CODEX_MAX = 200;

const isEntry = (v: unknown): v is CodexEntry =>
  typeof v === 'object' && v !== null
  && typeof (v as CodexEntry).articleId === 'string' && typeof (v as CodexEntry).title === 'string'
  && typeof (v as CodexEntry).lesson === 'string' && typeof (v as CodexEntry).keptAt === 'number';

/** The stored Codex, newest first; anything unreadable counts as empty. */
export function readCodex(raw: string | null): CodexEntry[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isEntry).sort((a, b) => b.keptAt - a.keptAt).slice(0, CODEX_MAX) : [];
  } catch {
    return [];
  }
}

export const isKept = (codex: readonly CodexEntry[], articleId: string): boolean => codex.some((e) => e.articleId === articleId);

/** One lesson per article: keeping it again takes it out. */
export function toggled(codex: readonly CodexEntry[], entry: CodexEntry): CodexEntry[] {
  return isKept(codex, entry.articleId)
    ? codex.filter((e) => e.articleId !== entry.articleId)
    : [entry, ...codex].slice(0, CODEX_MAX);
}
