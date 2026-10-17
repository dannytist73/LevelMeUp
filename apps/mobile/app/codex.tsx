import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { Codex } from '../src/screens/Codex.tsx';

export default function CodexRoute() {
  return <Codex onBack={goBack} onOpenReading={(id) => router.push(`/reading/${id}`)} />;
}
