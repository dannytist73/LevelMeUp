import { router } from 'expo-router';
import { Chronicle } from '../../src/screens/Chronicle.tsx';

export default function ChronicleRoute() {
  return <Chronicle onOpenReading={(id) => router.push(`/reading/${id}`)} />;
}
