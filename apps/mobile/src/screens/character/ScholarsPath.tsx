// Scholar's Path on Character (spec §2.5, a Mage at level 10; M6d decision 12): the book the reading quests track, the
// sessions and minutes read since it was set, and the latest books finished.
import { ABILITY_LINES, CHARACTER_TEXT, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import type { Shown } from '../../game/project.ts';
import { dateLine } from '../../lib/dates.ts';
import { Button } from '../../ui/Button.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { Caption, Heading, Label, Meta, Small } from '../../ui/Text.tsx';

const T = CHARACTER_TEXT.scholar;

export function ScholarsPath({ view, onOpenBook }: { view: Shown; onOpenBook: () => void }) {
  const { book, bookStartedAt, booksFinished, timeZone } = view.profile;
  const latest = [...booksFinished].reverse().slice(0, 3);
  return (
    <NightCard>
      <Label tone="chalk">{T.title}</Label>
      {book !== null ? (
        <View style={{ gap: 4 }}>
          <Small>{T.reading}</Small>
          <Heading>{book}</Heading>
          {view.reading !== null && <Meta>{progressLine(view.reading, bookStartedAt, timeZone)}</Meta>}
        </View>
      ) : (
        <Small>{ABILITY_LINES.scholars_path}</Small>
      )}
      {view.changingBook && <Caption>{T.willSync}</Caption>}
      <Button label={book === null ? T.set : T.change} variant="secondary" onPress={onOpenBook} />
      {latest.length > 0 && (
        <View style={{ gap: 4 }}>
          <Label>{T.finished}</Label>
          {latest.map((b, i) => (
            <Small key={`${b.finishedAt}-${i}`}>{`${b.title} · ${dateLine(Date.parse(b.finishedAt), timeZone)}`}</Small>
          ))}
        </View>
      )}
    </NightCard>
  );
}

/** "3 sessions · 45 min since Mon 5 Oct"; without the date until the server says when the book was set. */
function progressLine(reading: { sessions: number; minutes: number }, startedAt: string | null, timeZone: string): string {
  const sessions = reading.sessions === 1 ? T.sessionOne : fillText(T.sessions, { n: reading.sessions });
  return startedAt === null
    ? fillText(T.progressNoDate, { sessions, minutes: reading.minutes })
    : fillText(T.progress, { sessions, minutes: reading.minutes, date: dateLine(Date.parse(startedAt), timeZone) });
}
