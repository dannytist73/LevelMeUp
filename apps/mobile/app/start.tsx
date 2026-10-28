import kvStore from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import { Setup } from '../src/base/screens/Setup.tsx';
import { WIDGET_KEY } from '../src/widget/snapshot.ts';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx';

export default function StartRoute() {
  // A phone that ran Grumble Camp kept its widget snapshot: its welcome says the camp is paused, not deleted.
  const [tester, setTester] = useState(false);
  useEffect(() => {
    kvStore.getItem(WIDGET_KEY).then((v) => setTester(v !== null)).catch(() => undefined);
  }, []);
  return <Setup tester={tester} />;
}
