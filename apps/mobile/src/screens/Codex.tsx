// The Codex (M11 decision 7): the lessons a player kept from their Story Decks, newest first, each with the reading it
// came from. On this phone only; a lesson can be taken out here or on its deck's lesson card. M12: opened from the
// Library; each lesson opens its reading; Take out shows Undo for a few seconds (audit 24).
import { READING_TEXT, fillText } from '@levelmeup/content';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CodexEntry } from '../reading/codex.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { LinkButton } from '../ui/LinkButton.tsx';
import { ScreenList } from '../ui/ScreenScroll.tsx';
import { toast, useToast } from '../ui/toast.ts';
import { StateNote } from '../ui/StateNote.tsx';
import { Small } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { LessonCard } from './Library.tsx';

const C = READING_TEXT.codex;

export function Codex({ onBack, onOpenReading = () => {} }: { onBack: () => void; onOpenReading?: (articleId: string) => void }) {
  const insets = useSafeAreaInsets();
  const codex = useGame((s) => s.codex);
  const toggleKeep = useGame((s) => s.toggleKeep);
  // Premium pass (review): the Undo note is the app's own, so no two notes stack in one place.
  const noting = useToast() !== null;
  // M17 (review): one function across redraws, so the snackbar coming and going doesn't redraw every drawn lesson.
  const renderRow = useCallback((entry: CodexEntry) => (
    // M17 (design critique): Take out hugs its own card (its 48 dp touch area is its gap) and the next lesson starts 28 dp
    // below it; at 4 and 16 the link sat halfway between two cards.
    <View>
      <LessonCard entry={entry} onOpen={() => onOpenReading(entry.articleId)} />
      <LinkButton label={C.remove} accessibilityLabel={fillText(C.removeLabel, { lesson: entry.lesson })}
        onPress={() => { toast(C.removed, { label: C.undo, onPress: () => void toggleKeep(entry) }); void toggleKeep(entry); }} />
    </View>
  ), [onOpenReading, toggleKeep]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      {/* M17: a list drawn as it scrolls (up to 200 lessons; all of them were drawn on opening). */}
      <ScreenList
        data={codex}
        keyOf={(entry) => entry.articleId}
        space={28}
        contentContainerStyle={{ paddingBottom: insets.bottom + (noting ? 96 : 32), paddingHorizontal: space.gutter }}
        header={<>
          <TopBar title={C.title} onBack={onBack} />
          {/* M17: an empty Codex says so as the Library does, not as one small line on a blank screen. */}
          {codex.length === 0
            ? <StateNote kind="empty" title={READING_TEXT.library.noKept} line={C.empty} />
            : <Small>{`${C.line} ${fillText(C.count, { n: codex.length })}`}</Small>}
        </>}
        renderRow={renderRow}
      />
    </View>
  );
}
