import { router } from 'expo-router';
import { Character } from '../../src/screens/Character.tsx';

export default function CharacterRoute() {
  return <Character onChangeClass={() => router.push('/class')} onOpenBook={() => router.push('/book')} onSettings={() => router.push('/settings')} onVow={() => router.push('/vow')} />;
}
