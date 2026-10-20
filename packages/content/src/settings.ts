// Settings (spec §1.3; M7b): Your game (voice, the day's end, minutes, difficulty) and deleting the character. Plain
// words; deleting says exactly what goes, and that a Google sign-in stays (M3 owner decision). M10b: the Haptics switch.

export const SETTINGS_TEXT = {
  /** M17: the groups of Settings. */
  groups: { plan: 'Your plan', accountability: 'Accountability', feel: 'Look and feel', account: 'Account', sync: 'Sync', about: 'About' },
  /**
   * Premium pass C4: the account box. A Google save brings the character back on a new phone (level, stats, quests,
   * history); kept lessons and the vow live on the phone only, so it says so instead of "pick up where you left off".
   */
  google: {
    saved: 'Saved with Google.',
    savedLine:
      'A new phone can sign in with Google to get your character back: its level, stats, quests and history. Kept ' +
      'lessons and your vow stay on this phone.',
    guest: 'Playing as a guest.',
    guestLine: 'For now, only this phone can reach your character. Save it with Google so a new or lost phone keeps it.',
    save: 'Save with Google',
  },
  /** Premium pass C4: the quiet sync words (spec §1.4: never red, never "error"). */
  sync: {
    now: 'Sync now',
    syncing: 'Syncing…',
    offline: 'Offline · will sync',
    retrying: 'Will sync soon',
    never: 'Not synced yet',
    last: 'Last synced {time}',
    waiting: '{n} waiting',
    refused: "The last sync didn't go through. Sync now tries again.",
  },
  /** M17: Back with unsaved changes (Your game, Training). */
  leave: { title: 'Leave without saving?', line: "Your changes here aren't saved yet.", stay: 'Keep editing', leave: 'Leave' },
  game: {
    /** M10c: the row in Settings, with what's set now as its line. */
    open: 'Daily plan',
    // M17: no-break spaces, so a narrow row never leaves "day" alone on its last line.
    row: '{voice} voice · day ends {time} · {minutes}\u00a0min a\u00a0day',
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
  /** M12 (plan decision 11). */
  sounds: {
    label: 'Sounds',
    line: 'Short tones when you clear a quest, level up or a timer ends. Quiet while the phone is on silent; music keeps playing.',
  },
  /** Premium pass B5: what a button says while its work is on its way. */
  busy: { saving: 'Saving…', syncing: 'Syncing…', deleting: 'Deleting…' },
  account: {
    /** M10c: the last section of Settings, after About. */
    section: 'Your character',
    delete: 'Delete my character',
  },
  /** M4 re-review; premium pass A2: the sign-in is gone for good. What happened, and the player's choice, never automatic. */
  signInLost: {
    guest:
      "This phone lost its guest sign-in, so the System can't reach your character any more. You can start again as a " +
      "new guest; the progress kept on this phone can't be recovered.",
    saved:
      "This phone's Google sign-in ended, so the System can't reach your character from here. Your character is safe " +
      'with the System: sign in with Google again to bring it back.',
    /** Review: once the ended sign-in is gone from the phone, it can't tell a saved player from a guest: both ways. */
    unknown:
      "This phone's sign-in ended, so the System can't reach your character from here. Saved it with Google? Sign in " +
      "again to bring it back. A guest's progress on this phone can't be recovered.",
    unsentOne: "One action on this phone hasn't reached the System, and can't any more.",
    unsent: "{n} actions on this phone haven't reached the System, and can't any more.",
    again: 'Sign in with Google again',
    againNote: "Once you're signed in, this phone's copy is replaced by the character the System holds.",
    cancelled: "Not signed in, so nothing changed. Try again when you're ready.",
    failed: "Google sign-in didn't finish, so nothing changed. Try again.",
    start: 'Start again as a new guest',
    sure: "This clears the progress kept on this phone. It can't be undone.",
    yes: 'Yes, start again',
    notNow: 'Not now',
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
    /** Premium pass B5: said on the first screen after the deletion, so it never just looks like a fresh start. */
    deleted: 'Your character and its data were deleted.',
  },
} as const;
