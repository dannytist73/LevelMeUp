// M13 (plan docs/superpowers/plans/2026-10-18-m13-plus.md, the owner's Plus set): the two Plus looks from the
// proposals canvas (Lantern round 2: System Blue, Mint Night). Monster Week (2026-10-25): Monster Night is the free look
// and Moonlight joins the Plus looks. Each meets every pairing test/tokens.test.ts asks; red stays the Shadow's alone.
import { MONSTER_NIGHT, MOONLIGHT, colors } from './tokens.ts';
import type { Palette } from './tokens.ts';

export type ThemeName = 'monsterNight' | 'moonlight' | 'systemBlue' | 'mintNight';
export const THEMES: readonly ThemeName[] = ['monsterNight', 'moonlight', 'systemBlue', 'mintNight'];
/** The look everyone has; the others are Plus. */
export const FREE_THEME: ThemeName = 'monsterNight';

const SYSTEM_BLUE: Palette = {
  night: '#0F1824', panel: '#182435', halftone: '#142030', line: '#2A3B52', lineStrong: '#5E7C9A', divider: '#1F2D40',
  paper: '#EAF3FA', ink: '#0F1A26', chalk: '#EEF4FA', ash: '#9CB0C6', ashLight: '#C5D3E2', accent: '#5CC8FF', commit: '#5CC8FF',
  onAccent: '#0B1420', accentText: '#7DD4FF', accentInk: '#1C6895', shadow: '#FF6B7A', shadowDeep: '#D9475C', void: '#060A10',
  white: '#FFFFFF', inkSoft: '#34465A', inkMuted: '#4F6276', lineSoft: '#22344A', tabBar: '#0A111A', segmentNext: '#22324A',
  trackOnPaper: '#D3E2EE', rippleNight: '#5CC8FF33', ripplePaper: '#0F1A261F', rippleAccent: '#0B14202E',
  candy: '#FF85DD', glow: '#5CC8FF', accentLip: '#2F86B5', lip: '#080D14',
};

const MINT_NIGHT: Palette = {
  night: '#13201F', panel: '#1C2C2B', halftone: '#182726', line: '#2C4240', lineStrong: '#5A807A', divider: '#213332',
  paper: '#EAF5F1', ink: '#10201D', chalk: '#EEF5F2', ash: '#9FB8B2', ashLight: '#C8DCD6', accent: '#6EE0B8', commit: '#6EE0B8',
  onAccent: '#0F1C1A', accentText: '#8BE8C8', accentInk: '#1C6E55', shadow: '#FF6B7A', shadowDeep: '#D9475C', void: '#050C0B',
  white: '#FFFFFF', inkSoft: '#33504A', inkMuted: '#4C6862', lineSoft: '#24403C', tabBar: '#0D1716', segmentNext: '#24393A',
  trackOnPaper: '#D2E8E0', rippleNight: '#6EE0B833', ripplePaper: '#10201D1F', rippleAccent: '#0F1C1A2E',
  candy: '#FF8ADF', glow: '#6EE0B8', accentLip: '#3A9C7C', lip: '#0A1312',
};

export const PALETTES: Readonly<Record<ThemeName, Palette>> = {
  monsterNight: MONSTER_NIGHT, moonlight: MOONLIGHT, systemBlue: SYSTEM_BLUE, mintNight: MINT_NIGHT,
};

export const isPlusTheme = (name: ThemeName): boolean => name !== FREE_THEME;

export const asTheme = (value: unknown): ThemeName => (THEMES as readonly unknown[]).includes(value) ? (value as ThemeName) : FREE_THEME;

let applied: ThemeName = FREE_THEME;

/** The look `colors` holds now. */
export const appliedTheme = (): ThemeName => applied;

/** Makes `name` the look in use. Screens drawn before keep the old colours until they draw again (the root redraws all). */
export function applyTheme(name: ThemeName): void {
  Object.assign(colors, PALETTES[name]);
  applied = name;
}
