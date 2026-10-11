// The words of quest play (M6a): the quest screen, the completion panels, "Quest cleared" (board D2) and the level-up and
// achievement moments. Player-facing, so the lint and the app's font-subset test cover every line.

export const PLAY_TEXT = {
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
  },
  workout: {
    exercise: 'Exercise {n} of {total}',
    rest: 'Rest about 2 minutes between sets.',
    note: 'Each set starts at the bottom of the range. Log what you did; less still counts.',
    set: 'Set {n}',
    fewer: '{name}, set {n}, one less',
    more: '{name}, set {n}, one more',
    how: 'How to do it',
    hide: 'Hide the steps',
    log: 'Log workout',
    change: 'Change equipment or program',
    replanning: 'Your new training setup is on its way. Log this workout once it syncs.',
  },
  sentence: {
    label: 'One sentence',
    note: 'One line is enough.',
  },
  cleared: {
    title: 'CLEARED',
    statUp: 'STAT UP',
    discipline: 'Discipline · today counts',
    streak: 'Streak',
    streakDays: '{from} → {to} DAYS',
    levelLine: 'LV {level} · {into} / {for} XP',
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
    levelLabel: 'LEVEL UP',
    level: 'Level {level}. The System marks your growth.',
    achievementLabel: 'ACHIEVEMENT',
    titleEarned: 'Title earned: {title}',
    continue: 'Continue',
  },
} as const;

/** Fills `{name}` placeholders. A missing value is a bug, so it throws. */
export function fillText(text: string, values: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (!(name in values)) throw new RangeError(`no value for {${name}} in "${text}"`);
    return String(values[name]);
  });
}
