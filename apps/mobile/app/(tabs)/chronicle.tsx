import { router } from 'expo-router';
import { Chronicle } from '../../src/screens/Chronicle.tsx';

export default function ChronicleRoute() {
  return <Chronicle onOpenReading={(id, day) => router.push(`/reading/${id}?day=${day}`)} />;
}
