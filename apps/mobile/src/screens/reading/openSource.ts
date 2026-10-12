// A source opens in the phone's browser (M8b decision 5): only a web address, never another scheme.
import { Linking } from 'react-native';

export function openSource(url: string): void {
  if (!/^https?:\/\//i.test(url)) return;
  void Linking.openURL(url).catch(() => {});
}
