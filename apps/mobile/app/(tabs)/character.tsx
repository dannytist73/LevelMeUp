import { router } from 'expo-router';
import { Character } from '../../src/screens/Character.tsx';
export { ScreenCrashed as ErrorBoundary } from '../../src/screens/Crashed.tsx'; // premium pass A5: a failing screen keeps the app around it

export default function CharacterRoute() {
  return <Character onChangeClass={() => router.push('/class')} onOpenBook={() => router.push('/book')} onSettings={() => router.push('/settings')} onVow={() => router.push('/vow')} />;
}
