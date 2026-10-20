// Premium pass A1: what the player is in the middle of writing or logging (a workout's sets, a reading's takeaway, a
// one-sentence quest, the Shadow's note). Read from memory, so a screen starts from it at once; written through to the
// phone's key-value store, so Android closing the app mid-workout loses nothing. A draft is the player's own words or
// numbers, so the next character on this phone never sees it (`forgetDrafts`).
import type { Blobs } from '../auth/sessionStorage.ts';

export const DRAFTS_KEY = 'lmu.drafts';
/** Enough for every quest of a few days; the oldest goes first. */
export const MAX_DRAFTS = 40;
/** Typing and ticking coalesce into one write. */
export const DRAFT_WRITE_MS = 250;

const memory = new Map<string, unknown>();
/** Drafts that came back from the phone and haven't changed since: "Picked up where you left off". */
const restored = new Set<string>();
let sink: Blobs | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let writing: Promise<void> = Promise.resolve();

export function readDraft<T>(key: string): T | undefined {
  return memory.get(key) as T | undefined;
}

/** True while the draft is the one this phone kept from before the app last closed. */
export function restoredDraft(key: string): boolean {
  return restored.has(key);
}

/** `undefined` or an empty line forgets it. */
export function writeDraft(key: string, value: unknown): void {
  restored.delete(key);
  memory.delete(key); // re-added below at the end: the newest is the last to go
  if (value !== undefined && value !== '') memory.set(key, value);
  while (memory.size > MAX_DRAFTS) memory.delete(memory.keys().next().value!);
  schedule();
}

/** Boot: the drafts the phone kept. Whatever can't be read is an empty start (a draft is a convenience, not a record). */
export function startDrafts(kv: Blobs, raw: string | null): void {
  sink = kv;
  memory.clear();
  restored.clear();
  let kept: unknown = null;
  try {
    kept = raw === null ? null : JSON.parse(raw);
  } catch {
    kept = null;
  }
  if (kept === null || typeof kept !== 'object' || Array.isArray(kept)) return;
  for (const [key, value] of Object.entries(kept as Record<string, unknown>).slice(-MAX_DRAFTS)) {
    if (value === undefined || value === null || value === '') continue;
    memory.set(key, value);
    restored.add(key);
  }
}

/** Writes now what is waiting to be written (tests; nothing else needs to wait). */
export function flushDrafts(): Promise<void> {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
    save();
  }
  return writing;
}

/** The character is gone from this phone: so are its drafts. */
export async function forgetDrafts(): Promise<void> {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  memory.clear();
  restored.clear();
  const kv = sink;
  writing = writing.then(() => kv?.removeItem(DRAFTS_KEY)).catch(() => {});
  await writing;
}

function schedule(): void {
  if (sink === null) return; // before boot (tests of a single screen): memory only
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    save();
  }, DRAFT_WRITE_MS);
}

function save(): void {
  const kv = sink;
  const text = JSON.stringify(Object.fromEntries(memory));
  // One write at a time, in order; a failed write is tried again with the next change.
  writing = writing.then(() => kv?.setItem(DRAFTS_KEY, text)).catch(() => {});
}
