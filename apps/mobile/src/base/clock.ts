// The time screens show: read again when the app comes back to the front and at local midnight, so a screen left open
// overnight never shows (or logs into) yesterday (review 2026-10-28). Tests pass a fixed time.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useClock(fixed?: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (fixed !== undefined) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    let timer: ReturnType<typeof setTimeout>;
    const arm = (): void => {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 50);
      timer = setTimeout(() => {
        setNow(Date.now());
        arm();
      }, midnight.getTime() - Date.now());
    };
    arm();
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [fixed]);
  return fixed ?? now;
}
