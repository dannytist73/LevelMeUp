// The home-screen widget's words (M10c decision 9): the day, the streak, the core quest or the cleared day, how many
// quests are cleared, and what to do when the day has moved on. Player-facing, so the lint and the font subsets cover it.

export const WIDGET_TEXT = {
  day: 'Day {day}',
  streak: '{n}-day streak',
  core: 'Core quest',
  cleared: 'Cleared',
  dayCleared: 'Day cleared',
  progress: '{done} of {total} cleared',
  newDay: 'A new day is ready.',
  open: 'Tap to open LevelMeUp',
  none: 'Open LevelMeUp to begin.',
  label: "Today's quest and your streak. Tap to open LevelMeUp.",
} as const;
