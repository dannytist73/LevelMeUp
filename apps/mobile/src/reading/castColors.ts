// M14 (plan 2026-10-19-m14-story-lessons.md, decision 1): each regular's colour, behind their initial on the story's
// cards. Fixed pastels with fixed dark ink, so they read the same in every look (tested at 4.5:1 or more).
import type { CastId } from '@levelmeup/content';

export const CAST_COLORS: Record<CastId, string> = {
  priya: '#A9B4FF',
  jonah: '#8FD3C1',
  mika: '#F2C4DE',
  tomas: '#F5D78E',
  amara: '#B9E3F5',
  lena: '#D6C8FF',
};

/** The initial's ink on every regular's colour. */
export const CAST_INK = '#161A2B';
