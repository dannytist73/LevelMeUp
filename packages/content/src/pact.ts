// The Accountability Pact and what the System says around the Shadow (spec §4.3; M7c, boards F2–F5). The Shadow's own
// lines are SHADOW_LINES (shadow.ts): it speaks only in Shadow boxes. Level 2's evening reminder arrives with
// notifications (M7d), so these words don't promise it yet (M7c decision 1).

export const PACT_TEXT = {
  title: 'The Accountability Pact',
  lead: 'A promise you make to yourself. Read all of it before you sign.',
  choose: 'Choose a level',
  levels: {
    0: { name: 'Level 0 · Off', line: 'Nothing happens on a miss.' },
    1: {
      name: 'Level 1 · The Shadow',
      line:
        'After you answer "I just didn\'t": a short dark scene, the Shadow claims the day, and a mark stays on your ' +
        'portrait until you clear the recovery quest. You can leave yourself a private note.',
    },
    2: {
      name: 'Level 2 · Trial of Stillness',
      line:
        'Level 1, plus: that day your side quests stay sealed until you finish a 10-minute focus session. The core ' +
        'quest, the recovery quest and the article are never sealed.',
    },
  },
  preview: 'Preview the Shadow',
  hidePreview: 'Hide the preview',
  rulesTitle: 'The rules',
  rules: [
    'Only your own answer "I just didn\'t" sets it off.',
    'Never a crash, a failed sync, a missed notification or an unanswered check-in.',
    'At most once a day. After 3 in 7 days it pauses and offers a lighter plan.',
    "It starts with tomorrow's quest day, never today's.",
    'Turn it off any time in Settings. It stops at once and never touches your progress.',
  ],
  sign: 'Hold to sign · Level {level}',
  signTap: 'Sign · Level {level}',
  signConfirm: 'Confirm: sign level {level}',
  signNote: "It starts with your next quest day, never today's.",
  lower: 'Change to level {level}',
  off: 'Turn off the Pact',
  lowerNote: 'This takes effect now, today included, and never touches your progress.',
  current: 'This is your pact now.',
  startsNext: 'It starts with your next quest day.',
  notNow: 'Not now',
  settings: 'Accountability Pact',
  names: { 0: 'Off', 1: 'The Shadow · level 1', 2: 'Trial of Stillness · level 2' },
  reveal: {
    read: 'Read the pact',
    signed: 'Pact signed: {name}. It starts on day 2.',
  },
} as const;

export const SHADOW_TEXT = {
  pactLabel: 'Pact · level {level}',
  claimed: 'Claimed · {day}',
  claimedDays: 'Claimed · days {from}–{to}',
  art: 'The Shadow, waiting in the dark',
  noteLabel: 'What got in the way? Optional, and only you can see it.',
  keepNote: 'Keep the note',
  noteKept: 'Kept. Only you can see it.',
  takeBack: 'Take back the day · {minutes} min',
  settings: 'Change or turn off the Pact',
  done: 'Back to today',
  gone: 'Nothing is waiting here.',
  reopen: "The Shadow's claim",
  mark: 'Shadow mark',
  markLabel: "The Shadow's mark: it stays until you clear the recovery quest.",
  heldYesterday: 'Yesterday belongs to the Shadow. Clear the recovery quest today and your streak survives.',
  held: 'The missed day belongs to the Shadow. Clear the recovery quest today and your streak survives.',
  trial: {
    title: 'Trial of Stillness',
    line:
      'Your side quests stay sealed until you finish a 10-minute focus session. The core quest, the recovery quest and ' +
      'the article are never sealed.',
    start: 'Begin focus session',
    sealed: 'Sealed',
    sealedHint: 'Opens the Trial of Stillness',
  },
  focus: {
    label: 'Focus session',
    left: 'left of 10:00',
    stay: 'Stay with it. If you leave the app, the timer pauses and waits for you.',
    apps: 'Calls, messages and every other app still work. Leaving only pauses this timer.',
    end: 'End session',
    endNote: 'Ending keeps the side quests sealed. Your minutes are kept: come back any time today.',
    done: 'The seal is broken. Your side quests are open.',
    gone: 'There is no trial to finish today.',
  },
} as const;
