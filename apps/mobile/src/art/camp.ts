// A simpler day (docs/2026-10-26-simpler-day.md, decisions 2 and 12): the camp's clay paintings, one per stage, painted
// empty on the owner's PC (scripts/art/camp-art.py) with the backdrop cut away, and where the app stands everyone on
// each. A spot is the middle of someone's feet, as fractions of the painting's width (x) and height (y), and their height
// as a fraction of its width (h).
import type { ImageSourcePropType } from 'react-native';

export type CampStage = 'first' | 'cabin' | 'lodge';
export type Spot = { x: number; y: number; h: number };
export type CampArt = {
  picture: ImageSourcePropType;
  /** Width over height. */
  ratio: number;
  /** The fire's middle and its glow's reach (of the width). */
  fire: { x: number; y: number; r: number };
  buddy: Spot;
  visitor: Spot;
  /** Up to six friends, drawn in this order: back ones first. */
  friends: readonly Spot[];
};

/** Friends made before each stage: the cabin at 3, the lodge at 10. */
export function campStage(friends: number): CampStage {
  return friends >= 10 ? 'lodge' : friends >= 3 ? 'cabin' : 'first';
}

const RATIO = 904 / 740;

export const CAMP_ART: Readonly<Record<CampStage, CampArt>> = {
  first: {
    picture: require('../../assets/camp/first.webp'),
    ratio: RATIO,
    fire: { x: 0.54, y: 0.55, r: 0.2 },
    buddy: { x: 0.36, y: 0.67, h: 0.21 },
    visitor: { x: 0.7, y: 0.76, h: 0.17 },
    friends: [{ x: 0.66, y: 0.5, h: 0.1 }, { x: 0.2, y: 0.64, h: 0.1 }],
  },
  cabin: {
    picture: require('../../assets/camp/cabin.webp'),
    ratio: RATIO,
    fire: { x: 0.5, y: 0.55, r: 0.18 },
    buddy: { x: 0.64, y: 0.67, h: 0.2 },
    visitor: { x: 0.73, y: 0.79, h: 0.15 },
    friends: [
      { x: 0.36, y: 0.62, h: 0.11 }, { x: 0.62, y: 0.5, h: 0.1 }, { x: 0.47, y: 0.76, h: 0.11 },
      { x: 0.28, y: 0.72, h: 0.1 }, { x: 0.84, y: 0.66, h: 0.1 }, { x: 0.4, y: 0.45, h: 0.09 },
    ],
  },
  lodge: {
    picture: require('../../assets/camp/lodge.webp'),
    ratio: RATIO,
    fire: { x: 0.51, y: 0.56, r: 0.18 },
    buddy: { x: 0.63, y: 0.67, h: 0.19 },
    visitor: { x: 0.8, y: 0.8, h: 0.14 },
    friends: [
      { x: 0.36, y: 0.58, h: 0.1 }, { x: 0.66, y: 0.5, h: 0.09 }, { x: 0.46, y: 0.74, h: 0.1 },
      { x: 0.2, y: 0.7, h: 0.1 }, { x: 0.87, y: 0.6, h: 0.09 }, { x: 0.3, y: 0.48, h: 0.09 },
    ],
  },
};
