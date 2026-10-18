import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from '../src/screens/Plus.tsx';

export default function PlusRoute() {
  // M13: shown once after the reveal (from=reveal): closing it goes on to Today; anywhere else it goes back.
  const { from } = useLocalSearchParams<{ from?: string }>();
  return <Plus onClose={() => (from === 'reveal' || !router.canGoBack() ? router.replace('/') : router.back())} />;
}
