// Monster Buddy (docs/2026-10-25-monster-buddy.md): the buddy's size by level, as the portrait tiers were (decision 2).
import { BUDDY_SIZES } from '@levelmeup/content';
import type { BuddySize } from '@levelmeup/content';

/** 0 little (levels 1–4), 1 grown (5–9), 2 grand (10 on). */
export type SizeIndex = 0 | 1 | 2;

export function buddySize(level: number): SizeIndex {
  return level >= 10 ? 2 : level >= 5 ? 1 : 0;
}

export function buddySizeName(level: number): BuddySize {
  return BUDDY_SIZES[buddySize(level)];
}

/** A level-up from `from` to `to` grows the buddy: it crosses level 5 or 10. One sync can cross more than one level, after
 * offline days. */
export function buddyGrows(from: number, to: number): boolean {
  return buddySize(to) > buddySize(from);
}
