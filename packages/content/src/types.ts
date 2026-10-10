import type { QuestTemplate } from '../../rules/src/index.ts';

/** The three voices a player can choose (spec §1.1 beat 2). */
export type Voice = 'mentor' | 'system' | 'questmaster';

export const VOICES: readonly Voice[] = ['mentor', 'system', 'questmaster'];

/** A quest's title and one-line description in one voice. */
export type VoiceText = { title: string; line: string };

/** A quest template with its words. */
export type AuthoredTemplate = QuestTemplate & {
  /** Plain name shared by every voice, used in lists and why-lines ("Knee push-ups"). */
  name: string;
  /** 1–5 short, plain how-to steps. */
  steps: readonly string[];
  /** Form cues and when to stop; required on exercise quests. */
  safety: readonly string[];
  voice: Readonly<Record<Voice, VoiceText>>;
};
