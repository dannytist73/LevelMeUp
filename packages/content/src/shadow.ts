/** When the Shadow speaks (spec §4.3). */
export type ShadowMoment = 'claim' | 'mark' | 'release' | 'trial' | 'evening' | 'retreat';

export const SHADOW_MOMENTS: readonly ShadowMoment[] = ['claim', 'mark', 'release', 'trial', 'evening', 'retreat'];

/**
 * Written in advance and reviewed (spec §4.3): ominous, never insulting, never about the player's worth, never
 * threatening anything real. `claim` and `mark` start with the lines approved on the design canvas.
 */
export const SHADOW_LINES: Readonly<Record<ShadowMoment, readonly string[]>> = {
  claim: [
    'The day closed in silence, so I took it.',
    'You left the day unguarded. I keep what is left unguarded.',
    'No one came to claim the day. So I did.',
  ],
  mark: [
    'It stays mine until you clear the recovery quest. Come and take it back.',
    'My mark stays on this day until the recovery quest breaks it.',
  ],
  release: [
    'So you came back for it. The day is yours again.',
    "Cleared, and my mark is gone. I'll be watching the next one.",
  ],
  trial: [
    'Your side quests sit behind my seal. Ten still minutes will open it.',
    'Sit with me for ten minutes. Then the seal breaks.',
  ],
  evening: [
    'Night is close. The recovery quest is still open, and so is my claim.',
    'The day is nearly over. The recovery quest still takes it back.',
  ],
  retreat: [
    "I'll keep to the dark for a while. The System has a lighter plan for you.",
    'Enough for now. I step back while you find an easier pace.',
  ],
};

/** The line for a moment on a quest day: rotates by day number, so the same day always shows the same line. */
export function shadowLine(moment: ShadowMoment, dayNumber: number): string {
  if (!Number.isInteger(dayNumber) || dayNumber < 1) throw new RangeError(`dayNumber must be an integer of at least 1, got ${dayNumber}`);
  const lines = SHADOW_LINES[moment];
  return lines[(dayNumber - 1) % lines.length]!;
}
