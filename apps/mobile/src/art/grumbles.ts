// Monster Week: the Grumbles' paintings (docs/2026-10-25-monster-week.md, art pipeline). Each Grumble is painted on the
// owner's PC as a few stills that ship in the app: idle, blink (idle with its eyes shut), hit, happy and sleep. The app
// brings them to life (src/ui/GrumbleArt.tsx). A Grumble not painted yet shows a stand-in.
import type { ImageSourcePropType } from 'react-native';

export type GrumblePose = 'idle' | 'hit' | 'happy' | 'sleep';
export type GrumbleStills = Record<GrumblePose | 'blink', ImageSourcePropType>;

/** Filled by the art pipeline (scripts/art/grumbles), one entry per painted Grumble. */
export const GRUMBLE_ART: Readonly<Record<string, GrumbleStills>> = {};
