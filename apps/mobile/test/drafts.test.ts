// Premium pass A1: drafts outlive the app being closed.
import {
  DRAFTS_KEY, MAX_DRAFTS, flushDrafts, forgetDrafts, readDraft, restoredDraft, startDrafts, writeDraft,
} from '../src/state/drafts.ts';

function blobs(initial: Record<string, string> = {}) {
  const kv = new Map(Object.entries(initial));
  return {
    kv,
    store: {
      getItem: jest.fn(async (k: string) => kv.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => void kv.set(k, v)),
      removeItem: jest.fn(async (k: string) => void kv.delete(k)),
    },
  };
}

describe('drafts', () => {
  it('writes a draft to the phone and reads it back on the next start', async () => {
    const first = blobs();
    startDrafts(first.store, null);
    writeDraft('log:3:q-1', { sets: [10, 10], done: [true, false] });
    await flushDrafts();
    expect(JSON.parse(first.kv.get(DRAFTS_KEY)!)).toEqual({ 'log:3:q-1': { sets: [10, 10], done: [true, false] } });

    // The app closed; the next start finds it, marked as picked up from before.
    startDrafts(first.store, first.kv.get(DRAFTS_KEY)!);
    expect(readDraft('log:3:q-1')).toEqual({ sets: [10, 10], done: [true, false] });
    expect(restoredDraft('log:3:q-1')).toBe(true);
  });

  it('is no longer "picked up" once the player changes it', () => {
    const { store } = blobs();
    startDrafts(store, JSON.stringify({ 'takeaway:a-1': 'A line.' }));
    expect(restoredDraft('takeaway:a-1')).toBe(true);
    writeDraft('takeaway:a-1', 'A line, longer.');
    expect(restoredDraft('takeaway:a-1')).toBe(false);
  });

  it('forgets a draft written empty', async () => {
    const { store, kv } = blobs();
    startDrafts(store, null);
    writeDraft('takeaway:a-1', 'A line.');
    writeDraft('takeaway:a-1', '');
    await flushDrafts();
    expect(readDraft('takeaway:a-1')).toBeUndefined();
    expect(JSON.parse(kv.get(DRAFTS_KEY)!)).toEqual({});
  });

  it('coalesces quick changes into one write', async () => {
    jest.useFakeTimers();
    try {
      const { store } = blobs();
      startDrafts(store, null);
      writeDraft('line:1', 'T');
      writeDraft('line:1', 'Th');
      writeDraft('line:1', 'The');
      expect(store.setItem).not.toHaveBeenCalled();
      jest.runOnlyPendingTimers();
      await flushDrafts();
      expect(store.setItem).toHaveBeenCalledTimes(1);
      expect(store.setItem).toHaveBeenCalledWith(DRAFTS_KEY, JSON.stringify({ 'line:1': 'The' }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps the newest drafts when there are too many', () => {
    const { store } = blobs();
    startDrafts(store, null);
    for (let i = 0; i <= MAX_DRAFTS; i++) writeDraft(`line:${i}`, `Line ${i}`);
    expect(readDraft('line:0')).toBeUndefined();
    expect(readDraft(`line:${MAX_DRAFTS}`)).toBe(`Line ${MAX_DRAFTS}`);
  });

  it('starts empty from anything it cannot read', () => {
    const { store } = blobs();
    for (const raw of ['not json', '[1,2]', 'null', '"text"']) {
      startDrafts(store, raw);
      expect(readDraft('line:1')).toBeUndefined();
    }
  });

  it('forgets every draft with the character', async () => {
    const { store, kv } = blobs();
    startDrafts(store, null);
    writeDraft('shadow:c-1', 'Work ran late.');
    await forgetDrafts();
    await flushDrafts();
    expect(readDraft('shadow:c-1')).toBeUndefined();
    expect(kv.has(DRAFTS_KEY)).toBe(false);
  });
});
