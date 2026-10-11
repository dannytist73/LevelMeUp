// Google's redirect (levelmeup://auth-callback) also reaches the router while the browser session that opened it reads
// the code; this route only steps back to where the player was (M5 plan, decision 12).
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { colors } from '../src/theme/tokens.ts';

export default function AuthCallback() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  return <View style={{ flex: 1, backgroundColor: colors.night }} />;
}
