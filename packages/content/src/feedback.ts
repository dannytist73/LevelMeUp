// Premium pass B (2026-10-20): what the System says once an action that closes its own screen has worked, on whichever
// screen comes next (the app's note at the bottom), and what it says when the phone couldn't save it. Every action
// answers: it worked, and when it applies. Player-facing, so the lint and the app's font-subset test cover every line.

export const FEEDBACK_TEXT = {
  /** The phone's own records refused the write (rare): nothing was saved, and the player can simply try again. */
  saveFailed: "Couldn't save that on this phone. Try again.",
  swapped: 'Swapped to {title}.',
  game: 'Saved. It starts with your next quest day.',
  voice: 'Saved. The new voice speaks from now on.',
  gameVoice: 'Saved. The new voice speaks now; the rest starts with your next quest day.',
  /** With the Training screen's own line on when it applies (ADJUST_TEXT.training.today / planTomorrow). */
  training: 'Training saved. {when}',
  pactOn: 'The Pact is on at level {level}. It starts with your next quest day.',
  pactRaised: 'Level {level} starts with your next quest day; today stays at level {from}.',
  pactLevel: 'The Pact is at level {level} now.',
  pactOff: 'The Pact is off.',
  bookSet: 'Now reading "{title}".',
  bookFinished: '"{title}" joins your finished books.',
  bookAside: '"{title}" is set aside.',
  classChanged: "You're a {class} now. Tomorrow is built for it.",
  /** After a check-in answer: its outcome line from CHECKIN_TEXT.answers. */
  answered: 'Noted: {outcome}.',
  answeredSecondWind: 'Noted: {quest} is back today, for full XP.',
  lighter: 'Lighter from your next quest day: {minutes} minutes a day. Change it in Settings, Daily plan.',
  lighterNo: 'Your plan stays as it is.',
  reminderOn: 'The morning reminder is on, at {time}.',
  reminderRefused: "Android didn't allow notifications, so there's no reminder. You can turn them on in Settings, Notifications.",
} as const;
