// The onboarding (spec §1.1, boards O01–O10): a stack the tabs hand over to while there is no character.
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/tokens.ts';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night }, animation: 'fade' }} />;
}
