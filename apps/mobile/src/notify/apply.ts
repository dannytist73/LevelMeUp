// Hands a plan to the phone (M7d decision 3): only when it differs from the last one the phone got, one at a time, so
// a completion that changes nothing costs no native call and two quick changes can't interleave.
import type { NoteOs, PlannedNote } from './types.ts';

export function makeApplier(os: Pick<NoteOs, 'replace'>) {
  let last: string | null = null;
  let chain: Promise<void> = Promise.resolve();
  return {
    apply(notes: readonly PlannedNote[]): Promise<void> {
      const run = async (): Promise<void> => {
        const key = JSON.stringify(notes);
        if (key === last) return;
        last = null; // unknown until the phone confirms: a failure makes the next plan go through
        await os.replace(notes);
        last = key;
      };
      const done = chain.then(run);
      chain = done.catch(() => {});
      return done;
    },
    /** The phone's schedule was cleared another way (forgetting the character): the next plan goes through. */
    forget(): void {
      last = null;
    },
  };
}
