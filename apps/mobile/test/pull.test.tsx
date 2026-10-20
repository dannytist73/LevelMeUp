// M17: pull down to sync on every tab (screens/pull.ts): the spinner shows until that sync is done.
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { usePullToSync } from '../src/screens/pull.ts';
import { testStore, withStore } from './support/store.ts';

describe('usePullToSync', () => {
  it('syncs on a pull and spins until the sync is done', async () => {
    let finish = () => {};
    const syncNow = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const store = testStore({ syncNow });
    const { result } = await renderHook(() => usePullToSync(), { wrapper: ({ children }: { children: ReactNode }) => withStore(store, children) });
    expect(result.current.refreshing).toBe(false);
    await act(async () => { result.current.onRefresh(); });
    expect(syncNow).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(true);
    await act(async () => { finish(); });
    expect(result.current.refreshing).toBe(false);
  });

  it('stops spinning when the sync fails', async () => {
    const store = testStore({ syncNow: jest.fn(async () => { throw new Error('offline'); }) });
    const { result } = await renderHook(() => usePullToSync(), { wrapper: ({ children }: { children: ReactNode }) => withStore(store, children) });
    await act(async () => { result.current.onRefresh(); });
    expect(result.current.refreshing).toBe(false);
  });
});
