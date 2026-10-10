// What the player reads when the server refuses one of their actions (roadmap, "Carried forward from M3": show the
// notice, then drop the event). Plain words, never blame, never red.

const TEXT = {
  not_found: "That quest isn't part of your current days any more, so the change wasn't saved.",
  already_completed: 'That quest was already cleared.',
  day_closed: 'That day had already closed, so the change was not saved.',
  outside_day: "That completion was timed outside its quest day, so it wasn't counted.",
  too_late: "That completion arrived more than 48 hours after its day closed, so it wasn't counted.",
  future: "That completion was stamped ahead of the server's clock. Check the phone's time, then try again.",
  not_completed: "That quest isn't cleared, so there was nothing to undo or rate.",
  bad_rating: "That rating wasn't one the System knows, so it was skipped.",
  bad_payload: "The details of that completion couldn't be read, so it wasn't saved.",
  timer_short: 'The timer stopped before 80% of the time, so the quest stays open.',
  event_reused: 'That action had already been sent for something else, so it was skipped.',
  unsupported_event: "This version of the app sent an action the server doesn't take yet, so it was skipped.",
  bad_event: "An action from this phone couldn't be read, so it was skipped.",
  bad_event_id: "An action from this phone couldn't be read, so it was skipped.",
} as const;

export type NoticeCode = keyof typeof TEXT;
export const NOTICE_CODES = Object.keys(TEXT) as NoticeCode[];

export function noticeText(code: string): string {
  return Object.hasOwn(TEXT, code) ? TEXT[code as NoticeCode] : "One change couldn't be saved.";
}
