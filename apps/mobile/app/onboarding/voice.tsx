import { router } from 'expo-router';
import { VoiceStep } from '../../src/screens/onboarding/VoiceStep.tsx';

export default function VoiceRoute() {
  return <VoiceStep onNavigate={(path) => router.push(path)} />;
}
