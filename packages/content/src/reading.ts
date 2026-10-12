// The words of reading (M8b): Today's reading card (board D1), the reader (board D3), the past readings in the
// Chronicle (board D5) and the Mage's Insight. Player-facing, so the lint and the app's font-subset test cover every line.

export const READING_TEXT = {
  label: "Today's reading",
  meta: '{minutes} min · Wisdom +{xp} XP',
  cardMeta: '{minutes} min · Wisdom +{xp} XP · one takeaway',
  read: 'Read',
  readAgain: 'Read again',
  cleared: 'Cleared +{xp}',
  takeaways: 'Takeaways',
  question: 'To think about',
  takeawayLabel: 'Your takeaway, one sentence',
  takeawayNote: 'The one idea you want to keep, in your own words.',
  claim: 'Claim +{xp} XP',
  sources: 'Sources',
  sourceLine: '{n}. {title} · {host}',
  sourceHint: 'Opens {host} in your browser',
  sourceMarks: 'Sources {list}',
  yourTakeaway: 'Your takeaway',
  noTakeaway: 'No takeaway was written that day.',
  waiting: "Today's reading is on its way to this phone. It comes with the next sync.",
  missing: "This reading isn't on this phone yet. It comes with the next sync.",
  gone: "This reading isn't in the library any more.",
  past: {
    title: 'Past readings',
    label: 'Past reading · {date}',
    empty: 'Your readings gather here, one a day.',
  },
  insight: {
    title: 'Insight',
    line: "Choose tomorrow's reading.",
    chosen: "Tomorrow's reading: {topic}.",
    change: 'Change',
    none: "No new topic is waiting yet. Tomorrow's reading is chosen as usual.",
  },
} as const;
