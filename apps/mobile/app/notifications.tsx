import { router } from 'expo-router';
import { expoNotes } from '../src/notify/os.ts';
import { Notifications } from '../src/screens/Notifications.tsx';
export { ScreenCrashed as ErrorBoundary } from '../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function NotificationsRoute() {
  return <Notifications onBack={() => router.back()} onOpenSettings={() => void expoNotes.openSettings()} />;
}
