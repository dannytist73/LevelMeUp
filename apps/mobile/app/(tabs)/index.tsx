import { router } from 'expo-router';
import { Today } from '../../src/screens/Today.tsx';

export default function TodayRoute() {
  return <Today onSettings={() => router.push('/settings')} onDeveloper={__DEV__ ? () => router.push('/dev') : undefined} />;
}
