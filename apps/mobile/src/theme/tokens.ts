// Ink Panel design tokens (visual spec §1). Dark only: the MVP has no light theme. Exact values live in the board
// sources (docs/design/ink-panel/); change them there first.

export const colors = {
  /** App background. */
  night: '#0E0E10',
  /** Cards on the night. */
  panel: '#18181B',
  /** Headers and scenes, under 7 px chalk dots at 13 %. */
  halftone: '#1A1A1E',
  /** Quiet borders, unselected options. */
  line: '#4A4A50',
  /** List row separators. */
  divider: '#26262B',
  /** The panel you act on now; primary buttons on the night. */
  paper: '#E8E1D3',
  /** Text and borders on paper; primary buttons on paper. */
  ink: '#151515',
  /** Text and strong borders on the night. */
  chalk: '#F1ECE1',
  /** Secondary text on the night. */
  ash: '#A8A196',
  /** Body-secondary text on the night. */
  ashLight: '#C9C2B6',
  /** XP bars, panel offsets, the active tab, progress. Never text. */
  vermilion: '#E0452B',
  /** Commitment buttons, with white text. */
  seal: '#C2321C',
  /** Red text, stamps and the Shadow on the night. */
  ember: '#F0765E',
  /** Red labels on paper. */
  sealText: '#B02E1A',
  /** The Shadow's scene background. */
  void: '#050506',
  white: '#FFFFFF',
  // Board values the spec's token table leaves out (D1 Today):
  /** Secondary text on paper (a quest's target). */
  inkSoft: '#3A362F',
  /** Quiet text on paper (the safety line). */
  inkMuted: '#5A544A',
  /** The border of a cleared side quest. */
  lineSoft: '#3A3A40',
  /** The tab bar. */
  tabBar: '#0A0A0B',
} as const;

export type ColorName = keyof typeof colors;

/** Font families as loaded by `useFonts` in app/_layout.tsx (the Latin subsets in assets/fonts). */
export const fonts = {
  display: 'BlackHanSans',
  body: 'GothicA1-Regular',
  bodyMedium: 'GothicA1-Medium',
  bodyBold: 'GothicA1-Bold',
} as const;

export type TypeVariant = 'display' | 'title' | 'heading' | 'label' | 'body' | 'small' | 'meta' | 'caption';

type TypeSpec = {
  family: string;
  size: number;
  /** Multiple of the size. */
  lineHeight: number;
  /** Letter spacing in em. */
  tracking: number;
  /** Cap on the phone's font scale (decision 9 of the M4 plan): text grows, layouts wrap, nothing truncates. */
  maxScale: number;
  uppercase: boolean;
};

export const type: Readonly<Record<TypeVariant, TypeSpec>> = {
  display: { family: fonts.display, size: 58, lineHeight: 1, tracking: 0, maxScale: 1.15, uppercase: false },
  title: { family: fonts.display, size: 34, lineHeight: 1.05, tracking: 0.02, maxScale: 1.15, uppercase: false },
  heading: { family: fonts.display, size: 22, lineHeight: 1.15, tracking: 0.06, maxScale: 1.2, uppercase: false },
  label: { family: fonts.display, size: 13, lineHeight: 1.3, tracking: 0.14, maxScale: 1.3, uppercase: true },
  body: { family: fonts.body, size: 16, lineHeight: 1.5, tracking: 0, maxScale: 1.5, uppercase: false },
  small: { family: fonts.body, size: 14, lineHeight: 1.45, tracking: 0, maxScale: 1.5, uppercase: false },
  meta: { family: fonts.body, size: 13, lineHeight: 1.45, tracking: 0, maxScale: 1.5, uppercase: false },
  caption: { family: fonts.body, size: 12, lineHeight: 1.4, tracking: 0, maxScale: 1.5, uppercase: false },
};

export const space = {
  /** Side gutter. */
  gutter: 20,
  /** Minimum touch target. */
  touch: 44,
  border: 2,
  heroBorder: 3,
  /** The vermilion offset behind the current action's panel. */
  offset: 6,
} as const;
