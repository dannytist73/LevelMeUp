// Notifications (spec §4.4; M7d): the words of Settings → Notifications and of each notification. The briefing and the
// reminders speak in the player's voice (spec §1.3); the Shadow's reminder is its own evening line (shadow.ts). A
// reminder never shames and never holds the streak over the player (CLAUDE.md, "No shaming copy").
import { fillText } from './play.ts';
import { shadowLine } from './shadow.ts';
import type { Voice } from './types.ts';

export type NoteWords = { title: string; body: string };

export const NOTIFY_TEXT = {
  section: 'Notifications',
  open: 'Change notifications',
  briefing: 'Morning briefing',
  evening: 'Evening reminder',
  eveningNote: "Only if the core quest isn't done",
  timers: 'Timer alerts',
  off: 'Off',
  blocked: "Off in your phone's settings",
  title: 'Notifications',
  lead: 'The System can reach you outside the app. All of it is optional; the game works the same without it.',
  briefingLine: 'Your quest day, each morning at the time you pick. On a planned rest day it says so.',
  eveningLine: "A nudge at the time you pick, only while the core quest isn't done. Never on a rest day.",
  timersLine: 'A note when a running quest timer reaches its time, even with the app closed.',
  briefingAt: 'Briefing time',
  eveningAt: 'Reminder time',
  shadowTitle: "The Shadow's reminder",
  shadowNote:
    'With the Pact at level 2: on a day the Shadow holds, a second, sterner reminder comes at {time} until the ' +
    'recovery quest is cleared. Lower the Pact to stop it.',
  late: 'To save battery, your phone may deliver them a few minutes late.',
  ask: {
    title: 'Allow notifications?',
    line: 'Your phone will ask whether LevelMeUp may send notifications. Only the ones you turn on here will come.',
    allow: 'Allow notifications',
    notNow: 'Not now',
  },
  denied: {
    line: "Notifications are off for LevelMeUp in your phone's settings, so none will arrive. Everything else works the same.",
    open: 'Open phone settings',
  },
  channels: { reminders: 'Reminders', timers: 'Quest timers' },
  titles: {
    briefing: 'Day {day} · Morning briefing',
    rest: 'Day {day} · Rest day',
    evening: 'Day {day} · Evening reminder',
    shadow: 'The Shadow',
  },
} as const;

type VoiceLines = { briefing: readonly string[]; rest: string; evening: readonly string[]; timer: string };

/** Each reminder in the three voices; the briefing and the evening lines rotate by day number. */
export const NOTE_LINES: Readonly<Record<Voice, VoiceLines>> = {
  questmaster: {
    briefing: [
      'A new day, new trials. Your quests are posted on the board.',
      'The board is set for today. Rise and take your first quest.',
      'Your quests await. Clear the core quest and the day is yours.',
    ],
    rest: 'A planned rest day. No quests are due; rest and return stronger.',
    evening: [
      'The core quest still stands open. There is time before the day ends.',
      'Night is coming and the core quest waits. Clear it before the day closes.',
    ],
    timer: 'Time is up. Return and claim your quest.',
  },
  mentor: {
    briefing: [
      "Good morning. Today's quests are ready whenever you are.",
      'A new day. Start with the smallest quest and build from there.',
      'Morning. One quest at a time; the core quest is a good place to start.',
    ],
    rest: 'A rest day you planned. Nothing is due today, so let yourself rest.',
    evening: [
      "Your core quest is still open. There's still time today.",
      'A gentle nudge: the core quest is still open, and the day is not over yet.',
    ],
    timer: 'Your timer is done. Open the quest to claim it.',
  },
  system: {
    briefing: [
      'Daily quests generated. Open the System to begin.',
      'New quest day. Core quest available.',
      "Quest board updated. Today's quests are ready.",
    ],
    rest: 'Planned rest day. No quests due.',
    evening: [
      'Core quest incomplete. Time remains in the quest day.',
      'Reminder: core quest open. The quest day is still running.',
    ],
    timer: 'Timer complete. Open the quest to claim it.',
  },
};

function checkDay(dayNumber: number): void {
  if (!Number.isInteger(dayNumber) || dayNumber < 1) throw new RangeError(`dayNumber must be an integer of at least 1, got ${dayNumber}`);
}

const rotate = (lines: readonly string[], dayNumber: number): string => lines[(dayNumber - 1) % lines.length]!;

/** The morning briefing of quest day `dayNumber`; a planned rest day says so. */
export function briefingWords(voice: Voice, dayNumber: number, rest: boolean): NoteWords {
  checkDay(dayNumber);
  const lines = NOTE_LINES[voice];
  return rest
    ? { title: fillText(NOTIFY_TEXT.titles.rest, { day: dayNumber }), body: lines.rest }
    : { title: fillText(NOTIFY_TEXT.titles.briefing, { day: dayNumber }), body: rotate(lines.briefing, dayNumber) };
}

/** The evening reminder of quest day `dayNumber` (only while its core quest is open). */
export function eveningWords(voice: Voice, dayNumber: number): NoteWords {
  checkDay(dayNumber);
  return { title: fillText(NOTIFY_TEXT.titles.evening, { day: dayNumber }), body: rotate(NOTE_LINES[voice].evening, dayNumber) };
}

/** Level 2's second, sterner reminder (spec §4.3): the Shadow speaks, in its own words. */
export function shadowEveningWords(dayNumber: number): NoteWords {
  return { title: NOTIFY_TEXT.titles.shadow, body: shadowLine('evening', dayNumber) };
}

/** A running quest timer reached its time: the quest's own title, in the player's voice. */
export function timerWords(voice: Voice, questTitle: string): NoteWords {
  return { title: questTitle, body: NOTE_LINES[voice].timer };
}
