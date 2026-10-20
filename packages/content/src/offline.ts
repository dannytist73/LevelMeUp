// What the phone says about a day it built offline (M6e decisions 8 and 14).
export const OFFLINE_TEXT = {
  built: "No connection, so this phone built today's quests. The System checks them when it's back online.",
  later: 'Swaps, a hard day and rest open once this day reaches the System.',
  /** Premium pass A6: the deadline, said before it passes. */
  countsBy: 'Connect by {when} so what you clear here counts.',
  previewLead: 'The day this phone would build if today had just ended. Nothing is sent.',
  previewNone: "This phone can't build a day from what it holds yet. Sync once with a server that has M6e.",
} as const;
