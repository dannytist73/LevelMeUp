/** @jest-environment node */
import { makeApplier } from '../src/notify/apply.ts';
import type { PlannedNote } from '../src/notify/types.ts';

const note = (id: string, at = 1): PlannedNote => ({ id, kind: 'briefing', at, title: 't', body: 'b', url: '/', channel: 'reminders' });

describe('handing the plan to the phone (M7d decision 3)', () => {
  it('tells the phone only when the plan changed', async () => {
    const replace = jest.fn(async () => {});
    const applier = makeApplier({ replace });
    await applier.apply([note('a')]);
    await applier.apply([note('a')]);
    await applier.apply([note('a', 2)]);
    expect(replace.mock.calls).toEqual([[[note('a')]], [[note('a', 2)]]]);
  });

  it('runs one plan at a time, in order', async () => {
    const order: string[] = [];
    let release: () => void = () => {};
    const replace = jest.fn((notes: readonly PlannedNote[]) => {
      order.push(`start ${notes[0]?.id ?? 'none'}`);
      return notes[0]?.id === 'a' ? new Promise<void>((r) => { release = () => { order.push('end a'); r(); }; }) : Promise.resolve();
    });
    const applier = makeApplier({ replace });
    const first = applier.apply([note('a')]);
    const second = applier.apply([note('b')]);
    await Promise.resolve();
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['start a', 'end a', 'start b']);
  });

  it('tries again after the phone failed, and after forget()', async () => {
    const replace = jest.fn().mockRejectedValueOnce(new Error('busy')).mockResolvedValue(undefined);
    const applier = makeApplier({ replace });
    await expect(applier.apply([note('a')])).rejects.toThrow('busy');
    await applier.apply([note('a')]);
    applier.forget();
    await applier.apply([note('a')]);
    expect(replace).toHaveBeenCalledTimes(3);
  });
});
