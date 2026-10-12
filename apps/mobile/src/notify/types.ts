// Notifications' shared shapes (M7d). Dependency-free: the store, the planner, the seam and the screens import it.

/** Settings → Notifications, kept on this phone (decision 2). Minutes after local midnight. */
export type NotifySettings = {
  briefing: { on: boolean; minutes: number };
  evening: { on: boolean; minutes: number };
  /** Timer alerts. */
  timers: boolean;
};

export type NoteKind = 'briefing' | 'evening' | 'shadow' | 'timer';

/** One notification the phone should hold: `id` names its slot and day (`briefing:12`, `timer:201`). */
export type PlannedNote = {
  id: string;
  kind: NoteKind;
  /** When it should show, in ms since the epoch. */
  at: number;
  title: string;
  body: string;
  /** The screen a tap opens: `/` (Today) or `/quest/<id>` (decision 7). */
  url: string;
  channel: 'reminders' | 'timers';
};

/** `ask`: the phone may still ask; `denied`: only the phone's settings can allow them now; `unknown`: not read yet. */
export type Permission = 'unknown' | 'granted' | 'ask' | 'denied';

/** What the store needs from the phone (`os.ts`); tests pass their own. */
export type NoteOs = {
  permission: () => Promise<Permission>;
  /** The phone's own prompt. Only Settings → Notifications calls it, after the player turns one on. */
  ask: () => Promise<Permission>;
  /** Cancels what this app planned and plans these instead. */
  replace: (notes: readonly PlannedNote[]) => Promise<void>;
  cancelAll: () => Promise<void>;
  openSettings: () => Promise<void>;
};
