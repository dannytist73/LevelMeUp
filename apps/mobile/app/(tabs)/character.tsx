import { router } from 'expo-router';
import { Character } from '../../src/screens/Character.tsx';

export default function CharacterRoute() {
  return <Character onChangeClass={() => router.push('/class')} />;
}
