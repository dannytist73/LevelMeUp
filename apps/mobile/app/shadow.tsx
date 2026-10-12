import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';

export default function ShadowRoute() {
  return (
    <ShadowScene
      onDone={goBack}
      onRecovery={(id) => router.replace(`/quest/${id}`)}
      onTrial={() => router.replace('/trial')}
      onPact={() => router.replace('/pact')}
    />
  );
}
