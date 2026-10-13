// The class portraits (M9a decisions 2–7): four classes, two figures, three tiers by level, and the Shadow, in the public
// `lmu-art` bucket's `class-v1` folder. Fixed names and no manifest: the set is complete. A picture that can't load
// (before the upload, or offline before it was first seen) leaves the class's ink emblem in its frame (src/ui/Portrait.tsx).
import type { ClassId, ProgramStyle } from '@levelmeup/rules';
import { SUPABASE_URL } from '../config.ts';

/** `a` a man, `b` a woman (decision 2). */
export type Figure = 'a' | 'b';
export type Tier = 1 | 2 | 3;

export const FIGURES: readonly Figure[] = ['a', 'b'];
export const PORTRAIT_BASE = `${SUPABASE_URL}/storage/v1/object/public/lmu-art/class-v1`;
export const SHADOW_ART_URL = `${PORTRAIT_BASE}/shadow.webp`;

/** Levels 1–4, 5–9 and 10 on: the class path's unlocks (spec §2.5). */
export function portraitTier(level: number): Tier {
  return level >= 10 ? 3 : level >= 5 ? 2 : 1;
}

export function portraitUrl(classId: ClassId, figure: Figure, level: number): string {
  return `${PORTRAIT_BASE}/${classId}-${figure}-${portraitTier(level)}.webp`;
}

/** Reaching this level changes the portrait (levels 5 and 10; decision 8). */
export function portraitChanges(level: number): boolean {
  return level > 1 && portraitTier(level) !== portraitTier(level - 1);
}

/** The player's choice, or before one the program style's: the Women's program shows `b`, anything else `a` (decision 5). */
export function figureFor(chosen: Figure | null | undefined, programStyle: ProgramStyle): Figure {
  return chosen ?? (programStyle === 'women' ? 'b' : 'a');
}

export const otherFigure = (figure: Figure): Figure => (figure === 'a' ? 'b' : 'a');

/** The kept choice (`lmu.portrait`); anything else counts as none. */
export function readFigure(text: string | null): Figure | null {
  return text === 'a' || text === 'b' ? text : null;
}
