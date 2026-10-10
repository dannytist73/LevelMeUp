// Developer screens exist only in development builds (M4 plan, decision 11); a release build goes back to Today.
import { Redirect, Stack } from 'expo-router';

export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
