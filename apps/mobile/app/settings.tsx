import { router } from 'expo-router';
import { APP_VERSION } from '../src/appVersion.ts';
import { Settings } from '../src/screens/Settings.tsx';
import { deviceZone } from '../src/state/appStore.ts';

export default function SettingsRoute() {
  return (
    <Settings
      onBack={() => router.back()}
      onDeveloper={__DEV__ ? () => router.push('/dev') : undefined}
      onTraining={() => router.push('/training')}
      onGame={() => router.push('/game')}
      onDelete={() => router.push('/delete')}
      onPact={() => router.push('/pact')}
      onNotifications={() => router.push('/notifications')}
      version={APP_VERSION}
      deviceZone={deviceZone()}
    />
  );
}
