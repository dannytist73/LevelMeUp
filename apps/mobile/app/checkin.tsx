import { goBack } from '../src/lib/navigation.ts';
import { Checkin } from '../src/screens/Checkin.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function CheckinRoute() {
  return <Checkin onDone={goBack} />;
}
