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
  not_swappable: "That quest can't be swapped, so it stayed as it was.",
  no_swaps_left: 'No swaps were left today, so that swap was skipped.',
  not_an_option: "That swap wasn't possible any more, so the quest stayed as it was.",
  already_hard_day: 'Today was already a hard day.',
  already_protected: 'Today was already a rest day.',
  rest_limit: "You've rested twice in the last 7 days, so today stays a normal day. If the days feel heavy, fewer minutes a day may help.",
  not_exercise: 'That quest has no exercise to rest.',
  not_paused: 'That exercise was already back in your quests.',
  not_too_hard: "That quest wasn't rated too hard, so its rung stayed the same.",
  not_current: 'That exercise had already changed rung, so nothing more was eased.',
  same_class: 'That is already your class.',
  class_locked: 'Class changes open once every 14 days, so your class stayed the same.',
  ability_not_ready: "That ability wasn't ready, so today's core quest stayed the same.",
  already_applied: 'That ability was already in use today.',
  bad_change: "That change couldn't be applied, so nothing changed.",
} as const;

export type NoticeCode = keyof typeof TEXT;
export const NOTICE_CODES = Object.keys(TEXT) as NoticeCode[];

export function noticeText(code: string): string {
  return Object.hasOwn(TEXT, code) ? TEXT[code as NoticeCode] : "One change couldn't be saved.";
}
