// Spike (Task 1): proves Metro and Hermes load the shared packages. Replaced by the tabs in Task 12.
import { LIBRARY } from '@levelmeup/content';
import { levelForXp } from '@levelmeup/rules';
import { Text, View } from 'react-native';

export default function Spike() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E0E10' }}>
      <Text style={{ color: '#F1ECE1' }}>Level for 500 XP: {levelForXp(500)}</Text>
      <Text style={{ color: '#F1ECE1' }}>Quest templates: {LIBRARY.templates.length}</Text>
    </View>
  );
}
