// The Chronicle's past readings (board D5; M8b decision 7): date and title, newest first; each opens the reading again.
import { READING_TEXT } from '@levelmeup/content';
import { Pressable, View } from 'react-native';
import type { ReadingView } from '../../game/types.ts';
import { dateKeyLabel } from '../../lib/dates.ts';
import { colors } from '../../theme/tokens.ts';
import { SectionTitle } from '../../ui/SectionTitle.tsx';
import { Body, Label, Small } from '../../ui/Text.tsx';

export function PastReadings({ readings, onOpen }: { readings: readonly ReadingView[]; onOpen: (id: string, dayNumber: number) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={READING_TEXT.past.title} />
      {readings.length === 0 ? (
        <Small>{READING_TEXT.past.empty}</Small>
      ) : (
        readings.map((r) => {
          const date = dateKeyLabel(r.date);
          return (
            <Pressable
              key={`${r.dayNumber}-${r.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${date}. ${r.title}`}
              onPress={() => onOpen(r.id, r.dayNumber)}
              style={{ minHeight: 44, paddingVertical: 8, gap: 2, borderBottomWidth: 1, borderColor: colors.line }}
            >
              <Label>{date}</Label>
              <Body>{r.title}</Body>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
