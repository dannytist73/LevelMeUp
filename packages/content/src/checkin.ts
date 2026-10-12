// The missed-day check-in (spec §3.7, board F1) and the lighter-plan offer (M7a). Plain, never blaming: paused days earn
// nothing either way, so no answer is a wrong one.

export const CHECKIN_TEXT = {
  title: 'The day closed. What happened?',
  lead: "{day}'s core quest wasn't cleared. There's no wrong answer, and paused days earn nothing either way.",
  leadYesterday: "Yesterday's core quest wasn't cleared. There's no wrong answer, and paused days earn nothing either way.",
  leadGap: "You were away for {days} days. There's no wrong answer, and paused days earn nothing either way.",
  leadGapOne: "You were away for a day. There's no wrong answer, and paused days earn nothing either way.",
  answers: {
    sick_or_injured: { label: 'I was sick or injured', outcome: 'Streak paused · lighter tomorrow' },
    emergency: { label: 'Emergency, travel or a brutal day', outcome: 'Streak paused' },
    too_hard: { label: 'It was too hard', outcome: 'Streak paused · that quest steps down' },
    lighter_load: { label: 'I need a lighter load', outcome: 'Streak paused · fewer minutes a day' },
    just_didnt: { label: "I just didn't", outcome: 'A 5-minute recovery quest today keeps your streak' },
  },
  /** For a day whose quest has no ladder, or a player already at the fewest minutes. */
  pausedOnly: 'Streak paused',
  which: 'Which was it?',
  sick: 'Sick',
  injured: 'Injured',
  injuredNote: 'That exercise rests until you bring it back.',
  how: 'How do you want to take the day back?',
  recovery: 'Take back the day · 5 min',
  secondWind: 'Second Wind: redo {quest} for full XP',
  answer: 'Answer',
  later: 'Answer later',
  laterNote: 'Your streak stays paused until you answer.',
  open: 'Answer',
  openLater: 'Later',
  held: 'Clear the recovery quest today and your streak survives.',
  waiting: 'Your recovery quest appears once the System has your answer.',
  streakPaused: 'paused',
  streakHeld: 'held today',
  done: 'Got it',
  gone: 'Nothing is waiting for an answer.',
  result: {
    recovered: 'You took the day back. Your streak holds.',
    unbreakable: 'The recovery quest stayed open, but Unbreakable held your streak. It is ready again in 30 days.',
    shield: 'The recovery quest stayed open, so a shield kept your streak.',
    reset: 'The recovery quest stayed open and no shield was left, so your streak starts again. Your best stays {best}.',
  },
} as const;

export const LIGHTER_TEXT = {
  offer:
    'The last two weeks asked a lot of you. A lighter plan might fit better: {from} → {to} minutes a day, from your ' +
    'next quest day.',
  accept: 'Lighten the plan',
  decline: 'Keep my plan',
  restLimit: 'Lighten the plan: {from} → {to} minutes a day',
} as const;
