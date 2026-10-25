// Design tokens. Monster Week (docs/2026-10-25-monster-week.md, the owner's pick from the cute-redesign canvas on
// 2026-10-25): "Monster Night", a night palette with a lime accent and candy for the battles, Lilita One for titles, is
// the free look. Before it, Lantern (M11): a navy night, soft rounded cards and one calm accent, "Moonlight" (navy +
// periwinkle), now a Plus look beside System Blue and Mint Night. Dark only. Every colour on a screen comes from here, so
// another palette is a change to these tables alone. Red belongs to the Shadow and nothing else.
// M13: `colors` holds the look in use (theme/palettes.ts applyTheme swaps it), so screens read it while they draw, never
// into a constant at load.

export const MONSTER_NIGHT = {
  night: '#191B33',
  panel: '#24274A',
  halftone: '#1F2140',
  line: '#3A3E6B',
  lineStrong: '#777CB4',
  divider: '#2C2F55',
  paper: '#F2F3FF',
  ink: '#1A1C33',
  chalk: '#F5F5FF',
  ash: '#A9ADD2',
  ashLight: '#CDD0EA',
  accent: '#B6F04A',
  commit: '#B6F04A',
  onAccent: '#18220A',
  accentText: '#C6F570',
  accentInk: '#3D6A0A',
  shadow: '#FF6B7A',
  shadowDeep: '#D9475C',
  void: '#07080F',
  white: '#FFFFFF',
  inkSoft: '#3A3D5E',
  inkMuted: '#585C7E',
  lineSoft: '#30345C',
  tabBar: '#12142A',
  segmentNext: '#30345A',
  trackOnPaper: '#DADCF2',
  rippleNight: '#B6F04A33',
  ripplePaper: '#1A1C331F',
  rippleAccent: '#18220A2E',
  /** Monster Week: the battles' colour (a quest on the Grumble's weakness, power shots). Text on the night too. */
  candy: '#FF7AD9',
  /** Monster Week: power's glow. */
  glow: '#4FD8FF',
  /** The chunky buttons' lip: the darker band under a bright button, and under a quiet one. */
  accentLip: '#7FAE24',
  lip: '#0E1024',
} as const;

export const MOONLIGHT = {
  /** App background. */
  night: '#171A2B',
  /** Cards on the night. */
  panel: '#222640',
  /** Headers and scenes: a shade above the night. */
  halftone: '#1E2236',
  /** Quiet borders: decoration only (dividers inside cards, chips, art frames). */
  line: '#383F63',
  /**
   * M12 (audit 13): the edge of anything you can press or type in (fields, unselected options, outline buttons,
   * steppers): 3.75:1 on the night, 3.22:1 on a panel (WCAG 1.4.11 asks 3:1).
   */
  lineStrong: '#6A73A0',
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
  /** M12 (audit 4): the ripple of a press on the night or a panel, on paper, and on an accent button. */
  rippleNight: '#A9B4FF33',
  ripplePaper: '#1B1E311F',
  rippleAccent: '#161A2B2E',
  candy: '#F58BE0',
  glow: '#7FD6FF',
  accentLip: '#6F79C8',
  lip: '#0D0F1C',
} as const;

export type ColorName = keyof typeof MONSTER_NIGHT;
export type Palette = Readonly<Record<ColorName, string>>;

/** The look in use: Monster Night until applyTheme says otherwise. */
export const colors: Record<ColorName, string> = { ...MONSTER_NIGHT };

/**
 * Font families as loaded by `useFonts` in app/_layout.tsx (the Latin subsets in assets/fonts). Monster Week: Lilita One
 * for display, titles and headings; Lantern's (M11) M PLUS Rounded 1c Regular, Medium and Bold for the body.
 */
export const fonts = {
  display: 'LilitaOne',
  body: 'MPlusRounded-Regular',
  bodyMedium: 'MPlusRounded-Medium',
  bodyBold: 'MPlusRounded-Bold',
} as const;

export type TypeVariant = 'display' | 'title' | 'heading' | 'label' | 'body' | 'small' | 'meta' | 'caption';

type TypeSpec = {
  family: string;
  size: number;
  /** Multiple of the size. */
  lineHeight: number;
  /** Letter spacing in em. */
  tracking: number;
  /**
   * Cap on the phone's font scale (decision 9 of the M4 plan): text grows, layouts wrap, nothing truncates. M12 (audit
   * 6): body, labels and small text follow the phone up to 2× (Android's largest); titles to 1.5×.
   */
  maxScale: number;
  uppercase: boolean;
};

export const type: Readonly<Record<TypeVariant, TypeSpec>> = {
  display: { family: fonts.display, size: 54, lineHeight: 1.05, tracking: 0, maxScale: 1.3, uppercase: false },
  title: { family: fonts.display, size: 30, lineHeight: 1.15, tracking: 0, maxScale: 1.5, uppercase: false },
  heading: { family: fonts.display, size: 21, lineHeight: 1.25, tracking: 0, maxScale: 1.5, uppercase: false },
  // Lantern: labels in sentence case, in the body's bold, not shouted.
  label: { family: fonts.bodyBold, size: 14, lineHeight: 1.35, tracking: 0.01, maxScale: 2, uppercase: false },
  body: { family: fonts.body, size: 16, lineHeight: 1.55, tracking: 0, maxScale: 2, uppercase: false },
  small: { family: fonts.body, size: 14, lineHeight: 1.5, tracking: 0, maxScale: 2, uppercase: false },
  meta: { family: fonts.body, size: 13, lineHeight: 1.45, tracking: 0, maxScale: 2, uppercase: false },
  caption: { family: fonts.body, size: 12, lineHeight: 1.4, tracking: 0, maxScale: 2, uppercase: false },
};

export const space = {
  /** Side gutter. */
  gutter: 20,
  /** Minimum touch target (M12, audit 14: Material's 48 dp). */
  touch: 48,
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
