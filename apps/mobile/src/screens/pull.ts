// M17: pull down to sync, on every tab (Today had it alone, and a pull is what people try first on any list): the
// spinner stays until that sync is done.
import { useState } from 'react';
import { useGame } from '../state/store.ts';
import type { Refresh } from '../ui/ScreenScroll.tsx';

export function usePullToSync(): Refresh {
  const syncNow = useGame((s) => s.syncNow);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    // A failed sync shows on the screen's own sync line; here it only ends the spinner (`finally` would rethrow it).
    const done = () => setRefreshing(false);
    void syncNow().then(done, done);
  };
  return { refreshing, onRefresh };
}
