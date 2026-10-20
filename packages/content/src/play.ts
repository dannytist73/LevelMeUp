// The words of quest play (M6a): the quest screen, the completion panels, "Quest cleared" (board D2) and the level-up and
// achievement moments. Player-facing, so the lint and the app's font-subset test cover every line.

export const PLAY_TEXT = {
  /** M11: who speaks, written small at the top of their boxes and said first to screen readers. */
  speakers: { system: 'System', shadow: 'The Shadow' },
  quest: {
    back: 'Back',
    open: 'Opens the quest',
    why: 'Why this quest',
    steps: 'How to do it',
    safety: 'Safety',
    gone: "This quest's day has closed. Today's quests are on the Today tab.",
    article: "Today's reading opens once the daily articles arrive. Nothing is lost while it waits.",
    willSync: 'Will sync',
    picture: '{stat} quest picture',
    slots: { core: 'Core quest', side: 'Side quest', article: "Today's reading", recovery: 'Recovery quest' },
    /** M12 (board R3-2): under the fixed button of a rep log or a workout. */
    kept: 'Your sets are kept for next time.',
  },
  claim: {
    tap: 'Mark cleared',
    timer: 'Claim',
    log: 'Log it',
    /** M12: a rep log's button says what it logs. */
    set: 'Log 1 set',
    sets: 'Log {n} sets',
    /** M12: the fixed button adds the quest's XP. */
    xp: '· +{xp} XP',
  },
  timer: {
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    progress: 'Timer progress',
    note: 'It keeps counting with the screen off. You can claim it from {at}.',
    ready: 'Ready to claim.',
  },
  reps: {
    set: 'Set {n}',
    fewer: 'Set {n}, one less',
    more: 'Set {n}, one more',
    addSet: 'Add a set',
    removeSet: 'Remove the last set',
    unitLine: 'Each set in {unit}.',
    units: { reps: 'reps', repsPerSide: 'reps per side', seconds: 'seconds', secondsPerSide: 'seconds per side' },
    note: 'Log what you did. Less than the target still counts.',
    /** M10c decision 7: the sets of the last time this quest was logged on this phone. */
    lastTime: 'Last time: {sets}',
  },
  workout: {
    exercise: 'Exercise {n} of {total}',
    rest: 'Rest about 2 minutes between sets.',
    note: 'Each set starts where you left it last time, or at the bottom of the range. Log what you did; less still counts.',
    lastTime: 'Last time: {sets}',
    set: 'Set {n}',
    fewer: '{name}, set {n}, one less',
    more: '{name}, set {n}, one more',
    how: 'How to do it',
    hide: 'Hide the steps',
    log: 'Log workout',
    change: 'Change equipment or program',
    replanning: 'Your new training setup is on its way. Log this workout once it syncs.',
    /** M16: a weekly workout's place in its block; {day} is a letter, A to C. */
    block: 'Week {week} of 6 · Workout {day}',
    easyBlock: 'Week 6 of 6, the easy week · Workout {day}',
    /** What each week of the block asks for (the workout builder's set scheme). */
    weeks: [
      'Week 1: two sets of each exercise. Pick weights you control with 2 or 3 reps to spare, and learn the moves.',
      'Three sets of each exercise this week.',
      'Three sets of each exercise again. Go a little heavier where every set reached the top of its range.',
      'The main exercises get a fourth set this week. Rest well between sets.',
      'Four sets on the main exercises again: the hardest week of the block.',
      'The easy week: two sets at half the reps, with the same weight as last week. Your body catches up, and the next block starts stronger.',
    ],
  },
  /** M10c decision 8: the rest between sets, started by a set's Done. */
  rest: {
    done: 'Set {n} done',
    label: 'Rest between sets',
    left: 'Rest {time}',
    more: '+15 s',
    moreLabel: 'Rest 15 seconds longer',
    skip: 'Skip',
    over: 'Rest over. Next set when you are ready.',
  },
  sentence: {
    label: 'One sentence',
    note: 'One line is enough.',
  },
  cleared: {
    title: 'Cleared',
    statUp: 'Stat up',
    discipline: 'Discipline · today counts',
    streak: 'Streak',
    streakDays: '{from} → {to} days',
    recovered: 'You took the day back. Your streak holds when today ends.',
    levelLine: 'Lv {level} · {into} / {for} XP',
    toNext: '{xp} to Lv {next}',
    rateLabel: 'How did it feel? Optional, it tunes your next step.',
    easy: 'Easy',
    right: 'Right',
    tooHard: 'Too hard',
    tooHardNote: 'Noted. If it stays too hard, the System eases this one.',
    continue: 'Continue',
    undo: 'Logged by mistake? Undo',
    /** M12 (board R3-3, plan decision 6): Cleared leads on. */
    next: 'Next: {title}',
    nextReading: "Next: today's reading · {length}",
    back: 'Back to Today',
  },
  celebration: {
    levelLabel: 'Level up',
    level: 'Level {level}. The System marks your growth.',
    achievementLabel: 'Achievement',
    titleEarned: 'Title earned: {title}',
    /** M9a decision 8: a level-up that changes the portrait's tier (levels 5 and 10). */
    portrait: 'Your portrait has changed.',
    continue: 'Continue',
  },
} as const;

/** M10c: Today's own words: the streak note, the core quest's Begin, the cleared day, the day's options and the notices'
 * count. M12 (Round 3, boards R3-1 and R3-4): Up next, Then, the day done, the check circle and its Undo, the states. */
export const TODAY_TEXT = {
  streak: 'day streak',
  counts: 'today counts',
  shields: '{n} of {max} shields',
  /** M17: the level on the XP bar's line, in Today's header. */
  levelLine: 'Lv {level} · {xp} / {max} XP',
  begin: 'Begin',
  cleared: 'Cleared +{xp}',
  clearedAt: '{stat} · cleared {time}',
  dayCleared: 'Day {day} cleared',
  earned: '+{xp} XP today',
  nextDay: 'The next day starts at {time}.',
  change: 'Change today',
  notices: '{n} of {total}',
  gotIt: 'Got it',
  upNext: 'Up next',
  then: 'Then',
  left: '{n} left',
  doneToday: 'Done today · {n}',
  extra: 'If you want more',
  optional: 'Optional',
  tapHint: 'tap the circle when done',
  markDone: 'Mark {title} done',
  markedDone: '{title} cleared',
  undo: 'Undo',
  dayDone: {
    holds: 'Your streak holds. Rest well.',
    rest: 'Rest well.',
    kept: '1 lesson kept',
    keptMany: '{n} lessons kept',
  },
  reminder: {
    title: 'A morning briefing?',
    line: 'Your quest day, each morning at {time}. Change it any time in Settings.',
    yes: 'Remind me',
    no: 'Not now',
  },
  states: {
    loading: 'Loading your day',
    offline: "You're offline",
    offlineLine: "Today's quests come with the next sync.",
    failed: "Couldn't reach the System",
    failedLine: "It tries again by itself. Today's quests come with the next sync.",
    waiting: "Today's quests aren't here yet",
    waitingLine: 'They come with the next sync.',
    ended: 'This day has ended',
    endedLine: 'The next day is on its way.',
    none: 'No quests today',
    noneLine: 'Nothing is asked of today. The next day brings new quests.',
    retry: 'Try again',
  },
} as const;

/** Fills `{name}` placeholders. A missing value is a bug, so it throws. */
export function fillText(text: string, values: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (!(name in values)) throw new RangeError(`no value for {${name}} in "${text}"`);
    return String(values[name]);
  });
}

/** M16: a weekly workout's place in its block, "Week 2 of 6 · Workout B"; week 6 says it is the easy week. */
export function programBlockLabel(block: { week: number; day: number }): string {
  const day = 'ABC'.charAt(block.day);
  return block.week === 6 ? fillText(PLAY_TEXT.workout.easyBlock, { day }) : fillText(PLAY_TEXT.workout.block, { week: block.week, day });
}
