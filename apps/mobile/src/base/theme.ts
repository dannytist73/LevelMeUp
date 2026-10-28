// Graphite (the owner's pick from the ten looks, 2026-10-28; docs/2026-10-28-base-app.md "Look"): charcoal with one
// cobalt accent and Geist, and its light partner. Every text pair is 4.5:1 or better and every control edge 3:1, in both
// (test/baseTheme.test.ts). `G` holds the look in use: screens read it while they draw, and the root redraws the app
// when the look changes (applyLook).

export const GRAPHITE_DARK = {
  bg: '#111315',
  surface: '#1A1D21',
  /** Inputs and the pressed or selected surface. */
  raised: '#23272D',
  /** Decorative lines inside cards. */
  line: '#2C3138',
  /** The edge of anything you can press or type in: 3:1 on the background and on a card. */
  edge: '#66707D',
  text: '#F2F4F7',
  muted: '#A3ABB6',
  accent: '#3463E8',
  onAccent: '#FFFFFF',
  /** Accent words on the dark (links, the selected option's label, done ticks). */
  accentText: '#8FB2FF',
  /** A done set's row. */
  doneBg: '#17233F',
  tabBar: '#0C0E10',
  /** Pain and warnings: words only, never a fill. */
  warn: '#FFB4A8',
  ripple: '#FFFFFF1F',
};

export type Look = typeof GRAPHITE_DARK;

export const GRAPHITE_LIGHT: Look = {
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  raised: '#ECEEF1',
  line: '#DEE1E6',
  edge: '#868E99',
  text: '#111315',
  muted: '#59616C',
  accent: '#2F5BDB',
  onAccent: '#FFFFFF',
  accentText: '#2A4FC0',
  doneBg: '#E3EAFC',
  tabBar: '#FFFFFF',
  warn: '#B3261E',
  ripple: '#0000001A',
};

/** The look in use (dark until applyLook says otherwise). */
export const G: Look = { ...GRAPHITE_DARK };

export type Scheme = 'dark' | 'light';
let applied: Scheme = 'dark';

/** Switches the look in use; the caller redraws the app. */
export function applyLook(scheme: Scheme): void {
  if (scheme === applied) return;
  Object.assign(G, scheme === 'light' ? GRAPHITE_LIGHT : GRAPHITE_DARK);
  applied = scheme;
}

export const F = {
  regular: 'Geist-Regular',
  medium: 'Geist-Medium',
  semibold: 'Geist-SemiBold',
  bold: 'Geist-Bold',
} as const;

/** Text sizes: body text follows the phone's font size up to 2×, titles up to 1.5× (nothing truncates, rows wrap). */
export const TYPE = {
  title: { fontFamily: F.bold, fontSize: 28, lineHeight: 34, maxScale: 1.5 },
  heading: { fontFamily: F.semibold, fontSize: 20, lineHeight: 26, maxScale: 1.5 },
  big: { fontFamily: F.bold, fontSize: 34, lineHeight: 40, maxScale: 1.3 },
  body: { fontFamily: F.regular, fontSize: 16, lineHeight: 24, maxScale: 2 },
  bodyStrong: { fontFamily: F.semibold, fontSize: 16, lineHeight: 24, maxScale: 2 },
  small: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, maxScale: 2 },
  label: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, maxScale: 2 },
} as const;
export type TypeName = keyof typeof TYPE;

export const S = { gutter: 20, gap: 12, touch: 48, radius: 16, control: 12 } as const;
