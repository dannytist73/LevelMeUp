// The Grumble book (Monster Week, board p3-camp), under the camp scene since the simpler day (it was on the Camp tab):
// all 24, the befriended ones with how many times they joined, the one here now, and the rest as dark silhouettes until
// they arrive.
import { GRUMBLES, MONSTER_TEXT, fillText } from '@levelmeup/content';
import type { Grumble } from '@levelmeup/content';
import { View } from 'react-native';
import { colors, radius, space } from '../../theme/tokens.ts';
import { GrumbleArt } from '../../ui/GrumbleArt.tsx';
import { Caption, Heading, Label } from '../../ui/Text.tsx';

const C = MONSTER_TEXT.camp;

function BookCell({ g, wins, here }: { g: Grumble; wins: number; here: boolean }) {
  const met = wins > 0;
  const line = met ? (wins === 1 ? C.joinedOnce : fillText(C.joinedTimes, { n: wins })) : here ? C.hereNow : C.unknown;
  const label = met || here ? `${g.name}, ${g.standsFor}. ${line}` : `${C.unknown}. ${g.hint}`;
  return (
    <View accessible accessibilityLabel={label} testID={`book-${g.id}`}
      style={{ width: '31%', flexGrow: 1, alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 6, borderRadius: radius.control,
        backgroundColor: here ? colors.halftone : colors.panel, borderWidth: here ? space.heroBorder : space.border, borderColor: here ? colors.candy : colors.divider }}>
      <GrumbleArt id={g.id} weakness={g.weakness} size={64} living={false} silhouette={!met && !here} />
      <Label tone={met || here ? 'chalk' : 'ash'} style={{ textAlign: 'center' }}>{met || here ? g.name : '?'}</Label>
      <Caption style={{ textAlign: 'center' }}>{line}</Caption>
    </View>
  );
}

export function GrumbleBook({ wins, here }: { wins: Readonly<Record<string, number>>; here: string | null }) {
  const met = GRUMBLES.filter((g) => (wins[g.id] ?? 0) > 0).length;
  return (
    <View testID="grumble-book" style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <Heading accessibilityRole="header">{C.book}</Heading>
        <Label>{fillText(C.bookCount, { n: met, total: GRUMBLES.length })}</Label>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {GRUMBLES.map((g) => <BookCell key={g.id} g={g} wins={wins[g.id] ?? 0} here={g.id === here} />)}
      </View>
    </View>
  );
}
