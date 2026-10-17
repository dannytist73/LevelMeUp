// Lantern design tokens (M11, plan docs/superpowers/plans/2026-10-18-m11-lantern-story-deck.md): a navy night, soft
// rounded cards and one calm accent, "Moonlight" (navy + periwinkle), chosen from the proposals canvas on 2026-10-18.
// Dark only. Every colour on a screen comes from here, so another palette (System Blue, Mint Night) is a change to
// this table alone. Red belongs to the Shadow and nothing else. Replaces the Ink Panel tokens (visual spec §1).

export const colors = {
  /** App background. */
  night: '#171A2B',
  /** Cards on the night. */
  panel: '#222640',
  /** Headers and scenes: a shade above the night. */
  halftone: '#1E2236',
  /** Quiet borders, unselected options. */
  line: '#383F63',
  /** List row separators. */
  divider: '#2A2F4A',
  /** The light "moon" surface: reading cards, the System's box, selected options, solid chips. */
  paper: '#EEF0FA',
  /** Text and borders on paper. */
  ink: '#1B1E31',
  /** Text on the night. */
  chalk: '#F1F0F7',
  /** Secondary text on the night. */
  ash: '#A4AAC8',
  /** Body-secondary text on the night. */
  ashLight: '#C9CDE2',
  /** The accent: XP bars, progress, the active tab, the card you act on now, main buttons. Never body text. */
  accent: '#A9B4FF',
  /** Commitment buttons (accept, swear, sign, claim), with `onAccent` text. */
  commit: '#A9B4FF',
  /** Text on the accent and on commitment buttons. */
  onAccent: '#161A2B',
  /** Accent words on the night: rewards, ranks, labels that lead. */
  accentText: '#BAC3FF',
  /** Accent words on paper. */
  accentInk: '#4F5BB8',
  /** The Shadow's red: its words, its box, its marks, its glow. Nothing else is red. */
  shadow: '#FF6B7A',
  /** The Shadow's darker red, for its embers' second shade. */
  shadowDeep: '#D9475C',
  /** The Shadow's scene background. */
  void: '#07080F',
  white: '#FFFFFF',
  /** Secondary text on paper (a quest's target). */
  inkSoft: '#3A3F5C',
  /** Quiet text on paper (the safety line). */
  inkMuted: '#5A5F7E',
  /** The border of a cleared side quest. */
  lineSoft: '#2E3456',
  /** The tab bar. */
  tabBar: '#11131F',
  /** An onboarding progress bar not reached yet. */
  segmentNext: '#2E3352',
  /** A bar's empty track on paper. */
  trackOnPaper: '#D9DDF2',
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
  display: { family: fonts.display, size: 54, lineHeight: 1.05, tracking: 0, maxScale: 1.15, uppercase: false },
  title: { family: fonts.display, size: 30, lineHeight: 1.15, tracking: 0, maxScale: 1.15, uppercase: false },
  heading: { family: fonts.display, size: 21, lineHeight: 1.25, tracking: 0, maxScale: 1.2, uppercase: false },
  // Lantern: labels in sentence case, in the body's bold, not shouted.
  label: { family: fonts.bodyBold, size: 14, lineHeight: 1.35, tracking: 0.01, maxScale: 1.3, uppercase: false },
  body: { family: fonts.body, size: 16, lineHeight: 1.55, tracking: 0, maxScale: 1.5, uppercase: false },
  small: { family: fonts.body, size: 14, lineHeight: 1.5, tracking: 0, maxScale: 1.5, uppercase: false },
  meta: { family: fonts.body, size: 13, lineHeight: 1.45, tracking: 0, maxScale: 1.5, uppercase: false },
  caption: { family: fonts.body, size: 12, lineHeight: 1.4, tracking: 0, maxScale: 1.5, uppercase: false },
};

export const space = {
  /** Side gutter. */
  gutter: 20,
  /** Minimum touch target. */
  touch: 44,
  /** Borders: quiet lines. */
  border: 1.5,
  /** The card you act on now, outlined in the accent. */
  heroBorder: 2,
} as const;

/** Lantern's rounded corners. */
export const radius = {
  /** Cards and panels. */
  card: 22,
  /** Buttons that aren't pills, fields, options. */
  control: 16,
  /** Small boxes: stamps' tags, steppers. */
  small: 10,
  /** Pills: buttons, chips, bars. */
  pill: 999,
} as const;
