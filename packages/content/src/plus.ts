// M13: LevelMeUp Plus's words (plan docs/superpowers/plans/2026-10-18-m13-plus.md). Google Play's subscription rules
// (docs/research/2026-10-18-google-play-policies.md §3): the price and how often it is charged, that it renews, what the
// free trial is and what happens after it, how to cancel, and that the game works without it; never a monthly figure
// for the yearly plan. Prices are never written here: they come from Google Play, in the player's own currency.

export const PLUS_TEXT = {
  name: 'LevelMeUp Plus',
  lead: 'The whole game stays free. Plus adds looks and the long view of your stats.',
  adds: [
    { title: 'Two more looks', line: 'System Blue and Mint Night, for the whole app.' },
    { title: 'Your stats over all time', line: 'A chart of every stat, week by week, since day 1.' },
    { title: 'Portrait frames', line: "Three frames for your character's portrait." },
  ],
  free: 'Free for everyone, always: every quest, class, stat, streak and ability, rest days and the pain route, the Shadow pact, reminders, saving and deleting, and every reading.',
  plans: { yearly: 'Yearly', monthly: 'Monthly', lifetime: 'Lifetime' },
  // Review (Play's subscription rules): that it renews sits beside the price, not only in the small print.
  price: { yearly: '{price} a year, renews automatically', monthly: '{price} a month, renews automatically', lifetime: '{price}, paid once' },
  trialBadge: '{days} days free',
  trialLine: '{days} days free, then {price} a year, renews automatically.',
  timeline: {
    today: 'Today: Plus starts.',
    reminder: 'Day {day}: we remind you, if notifications are on.',
    charge: 'Day {days}: {price} is charged unless you cancel before then.',
  },
  start: 'Start {days} days free',
  buy: { yearly: 'Buy yearly', monthly: 'Buy monthly', lifetime: 'Buy lifetime' },
  notNow: 'Not now',
  done: 'Done',
  renews: 'Subscriptions renew automatically until you cancel. Cancel any time in Google Play, under Payments and subscriptions.',
  lifetimeNote: 'Lifetime is one payment, not a subscription.',
  restore: 'Restore purchases',
  /** Premium pass B5, B7: while Restore asks, and when it couldn't. */
  restoring: 'Checking Google Play…',
  restoreFailed: "Couldn't check with Google Play, so nothing changed. Try again in a moment.",
  terms: 'Terms of use',
  privacy: 'Privacy policy',
  notSetUp: "Plus isn't on sale yet. Everything else works as it is.",
  unavailable: "Plus can't be bought right now. Check your connection and try again.",
  retry: 'Try again',
  checking: 'Checking with Google Play.',
  thanks: 'Plus is on. Thank you for supporting LevelMeUp.',
  pending: "Google Play is still processing the payment. Plus starts once it's done.",
  restored: 'Plus is back on.',
  nothingToRestore:
    'No Plus purchase was found for the Google account on this phone. Bought it with another account? Switch accounts ' +
    'in the Play Store, then restore again.',
  failed: "That didn't go through. Try again in a moment; if Google Play did charge you, Restore purchases brings Plus here.",
  owned: 'This Google account already has Plus. Tap Restore purchases to bring it to this character.',
  serverLate: 'Google Play took the payment, but the System has not heard yet. It checks again each time you open the app.',
  settings: {
    section: 'LevelMeUp Plus',
    free: 'Not on Plus',
    see: 'See Plus',
    manage: 'Manage subscription',
    look: 'Your look',
    status: {
      renews: 'Plus, {plan}: renews {date}',
      trial: 'Plus, free trial: ends {date}, then yearly unless you cancel',
      ends: 'Plus, {plan}: ends {date}, cancelled',
      lifetime: 'Plus, lifetime',
      founder: 'Plus for life, as a Founder of the beta',
      ended: 'Plus ended {date}',
    },
  },
  look: {
    title: 'Your look',
    themes: 'Colours',
    frames: 'Portrait frame',
    plus: 'Plus',
    inUse: 'In use',
    founderOnly: 'For the beta testers',
    lockedLine: 'Plus looks are kept for Plus. Moonlight and no frame are always free.',
  },
  themes: {
    moonlight: { name: 'Moonlight', line: 'Navy and soft periwinkle.' },
    systemBlue: { name: 'System Blue', line: 'Deep blue and sky.' },
    mintNight: { name: 'Mint Night', line: 'Dark teal and mint.' },
  },
  frames: {
    none: 'No frame',
    moon: 'Moon ring',
    rune: 'Runes',
    crest: 'Crest',
    founder: 'Founder',
  },
  chart: {
    title: 'All-time stats',
    lead: 'Every stat, week by week, since day 1.',
    locked: 'See each stat over all your weeks with Plus.',
    empty: 'Your first week shows here once it has some XP.',
    label: '{stat}: {from} to {to} over {weeks} weeks.',
    since: 'Since {date}',
  },
  day7: {
    title: 'A week in',
    line: 'The game stays free. If you would like more looks and the long view of your stats, Plus has them.',
    see: 'See Plus',
    later: 'Not now',
  },
  trialCard: {
    title: 'Your free trial ends {date}',
    line: 'It then renews as yearly Plus unless you cancel in Google Play. The game stays the same either way.',
    manage: 'Manage in Google Play',
    later: 'Got it',
  },
  deleteNote: "Deleting your character doesn't cancel a Plus subscription. Cancel it first in Google Play, under Payments and subscriptions.",
} as const;
