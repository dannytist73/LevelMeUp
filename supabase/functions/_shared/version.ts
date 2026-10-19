// The oldest app the functions serve (M9b decision 5). Raise MIN_APP_VERSION, and deploy the functions, when a server
// change would break older apps: they then answer 426 `update_required`, and the phone keeps everything unsent until
// it is updated. Apps from before M9b send no version and count as 0.1.0. lmu-account-delete never checks: deleting a
// character always works.
import { problem } from './http.ts';
import type { Problem } from './http.ts';

export const MIN_APP_VERSION = '0.1.0';
/**
 * M16: the oldest app that knows the weekly program's quests. A character on the weekly program syncs only from it: an
 * older app (another phone with the same saved character) updates first instead of meeting quests it can't show.
 */
export const WEEKLY_MIN_APP_VERSION = '0.8.0';
/** The header every call from the app carries (apps/mobile/src/net/api.ts). */
export const APP_HEADER = 'x-lmu-app';
const UNVERSIONED = '0.1.0';
const VERSION = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/;

function parts(version: string): number[] | null {
  const match = VERSION.exec(version);
  return match === null ? null : match.slice(1, 4).map(Number);
}

/** True when the app that sent `header` is at least `min`; a missing or malformed version counts as 0.1.0. */
export function appVersionOk(header: string | null, min: string = MIN_APP_VERSION): boolean {
  const floor = parts(min);
  if (floor === null) throw new Error(`bad minimum app version ${min}`);
  const app = parts(header?.trim() ?? '') ?? parts(UNVERSIONED)!;
  for (let i = 0; i < 3; i++) if (app[i] !== floor[i]) return app[i]! > floor[i]!;
  return true;
}

/** The problem an app below the minimum gets, or null. */
export function tooOld(req: Request, min: string = MIN_APP_VERSION): Problem | null {
  return appVersionOk(req.headers.get(APP_HEADER), min) ? null : problem(426, 'update_required');
}
