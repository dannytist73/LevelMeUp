import { router } from 'expo-router';
import { expoNotes } from '../src/notify/os.ts';
import { Notifications } from '../src/screens/Notifications.tsx';

export default function NotificationsRoute() {
  return <Notifications onBack={() => router.back()} onOpenSettings={() => void expoNotes.openSettings()} />;
}
