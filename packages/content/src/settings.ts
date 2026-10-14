// Settings (spec §1.3; M7b): Your game (voice, the day's end, minutes, difficulty) and deleting the character. Plain
// words; deleting says exactly what goes, and that a Google sign-in stays (M3 owner decision). M10b: the Haptics switch.

export const SETTINGS_TEXT = {
  game: {
    /** M10c: the row in Settings, with what's set now as its line. */
    open: 'Daily plan',
    row: '{voice} voice · day ends {time} · {minutes} min a day',
    title: 'Your game',
    line: 'How the System speaks to you, when your quest day ends, and how much each day asks of you.',
    voice: 'Voice',
    dayEnd: 'Your quest day ends at',
    dayEndNote: 'Pick a time you are usually asleep, so a day never ends in the middle of your evening.',
    minutes: 'Minutes a day',
    difficulty: 'Difficulty',
    when:
      'The voice changes at once. The rest applies from your next quest day; a big change to when your day ends arrives ' +
      'over a few days.',
    save: 'Save',
  },
  haptics: {
    label: 'Haptics',
    line: 'A click you can feel when a stamp lands or a vow is sworn.',
  },
  account: {
    /** M10c: the last section of Settings, after About. */
    section: 'Your character',
    delete: 'Delete my character',
  },
  delete: {
    title: 'Delete your character',
    what:
      'This deletes your character: level, stats, quests, streaks, check-ins and history, on the System and on this ' +
      "phone. It can't be undone.",
    guest: 'Your guest sign-in is deleted with it.',
    google:
      "Your Google sign-in itself isn't deleted, only your LevelMeUp data. Signing in with Google again later starts a " +
      'new character.',
    connection: 'Deleting needs a connection.',
    start: 'Delete everything',
    sure: 'Everything above goes for good. Delete your character?',
    yes: 'Yes, delete my character',
    keep: 'Keep my character',
    network: "The System couldn't be reached, so nothing was deleted. Try again with a connection.",
    failed: "The System couldn't delete your character, so nothing changed. Try again later.",
  },
} as const;
