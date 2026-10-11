// Achievements on Character (board D4; M6d decision 7): the earned ones as stamps with what each took, oldest first, and
// how many are still hidden.
import { ACHIEVEMENTS, CHARACTER_TEXT, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import { SectionTitle } from '../../ui/SectionTitle.tsx';
import { MarkStamp } from '../../ui/Stamp.tsx';
import { Caption, Small } from '../../ui/Text.tsx';

const T = CHARACTER_TEXT.achievements;

export function Achievements({ earned }: { earned: readonly string[] }) {
  // An id this version no longer knows is skipped, not shown as a blank stamp.
  const known = earned.flatMap((id) => ACHIEVEMENTS.filter((a) => a.id === id));
  const total = ACHIEVEMENTS.length;
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={T.title} count={fillText(T.count, { earned: known.length, total })} />
      {known.map((a) => (
        <View key={a.id} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <MarkStamp text={a.name} rotate={-4} />
          <Small style={{ flexShrink: 1 }}>{a.description}</Small>
        </View>
      ))}
      <Caption>{known.length === 0 ? T.none : fillText(T.hidden, { n: total - known.length })}</Caption>
    </View>
  );
}
