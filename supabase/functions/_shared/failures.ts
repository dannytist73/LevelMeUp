// Whether a failure of one phone event is worth the phone trying again (audit 2026-10-15). A failed sync keeps every
// event on the phone, and the phone sends them again in order, so an event that fails the same way every time would
// hold back every event behind it for good. Only a failure that can pass on its own fails the sync; anything else
// refuses that one event (lmu-sync).

/** SQLSTATE classes that can pass on their own: connection (08), rollback (40), resources (53), operator intervention
 * (57: a cancelled statement, a shutdown), system (58) and internal (XX) errors. */
const RETRY_CLASSES = new Set(['08', '40', '53', '57', '58', 'XX']);
/** Deno's own network errors. */
const NETWORK_NAMES = new Set([
  'ConnectionRefused', 'ConnectionReset', 'ConnectionAborted', 'NotConnected', 'BrokenPipe', 'TimedOut', 'Interrupted', 'UnexpectedEof',
]);
/** Postgres's classes start with a digit, or are F0, HV, P0 or XX; EPIPE and its like are the network's. */
const SQLSTATE = /^([0-9][0-9A-Z]|F0|HV|P0|XX)[0-9A-Z]{3}$/;

export function retryable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if (error instanceof Error && NETWORK_NAMES.has(error.name)) return true;
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string') return false;
  // The driver's and the network's own codes (CONNECTION_CLOSED, ECONNRESET, …) are about the connection, not the event.
  return SQLSTATE.test(code) ? RETRY_CLASSES.has(code.slice(0, 2)) : true;
}
