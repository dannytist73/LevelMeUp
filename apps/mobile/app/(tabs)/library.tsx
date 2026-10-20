import { router } from 'expo-router';
import { Library } from '../../src/screens/Library.tsx';

export default function LibraryRoute() {
  return (
    <Library
      onOpenQuest={(id) => router.push(`/quest/${id}`)}
      onOpenReading={(id, day) => router.push(day === null ? `/reading/${id}` : `/reading/${id}?day=${day}`)}
      onOpenCodex={() => router.push('/codex')}
      onSettings={() => router.push('/settings')}
    />
  );
}
