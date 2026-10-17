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
  },
  claim: {
    tap: 'Mark cleared',
    timer: 'Claim',
    log: 'Log it',
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

/** M10c: Today's own words: the streak note, the core quest's Begin, the next quest, the cleared day, the day's options,
 * the notices' count and quick clear. */
export const TODAY_TEXT = {
  streak: 'day streak',
  counts: 'today counts',
  shields: '{n} of {max} shields',
  begin: 'Begin',
  next: 'Next',
  cleared: 'Cleared +{xp}',
  clearedAt: '{stat} · cleared {time}',
  dayCleared: 'Day {day} cleared',
  earned: '+{xp} XP today',
  nextDay: 'The next day starts at {time}.',
  change: 'Change today',
  notices: '{n} of {total}',
  hold: 'Hold to clear · +{xp} XP',
  holdTap: 'Clear it',
  holdConfirm: 'Yes, mark it cleared',
} as const;

/** Fills `{name}` placeholders. A missing value is a bug, so it throws. */
export function fillText(text: string, values: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (!(name in values)) throw new RangeError(`no value for {${name}} in "${text}"`);
    return String(values[name]);
  });
}
