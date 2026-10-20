// The Codex (M11 decision 7): the lessons a player kept from their Story Decks, newest first, each with the reading it
// came from. On this phone only; a lesson can be taken out here or on its deck's lesson card. M12: opened from the
// Library; each lesson opens its reading; Take out shows Undo for a few seconds (audit 24).
import { READING_TEXT, fillText } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CodexEntry } from '../reading/codex.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { LinkButton } from '../ui/LinkButton.tsx';
import { ScreenList } from '../ui/ScreenScroll.tsx';
import { Snackbar } from '../ui/Snackbar.tsx';
import { StateNote } from '../ui/StateNote.tsx';
import { Small } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { LessonCard } from './Library.tsx';

const C = READING_TEXT.codex;

export function Codex({ onBack, onOpenReading = () => {} }: { onBack: () => void; onOpenReading?: (articleId: string) => void }) {
  const insets = useSafeAreaInsets();
  const codex = useGame((s) => s.codex);
  const toggleKeep = useGame((s) => s.toggleKeep);
  const [removed, setRemoved] = useState<CodexEntry | null>(null);
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      {/* M17: a list drawn as it scrolls (up to 200 lessons; all of them were drawn on opening). */}
      <ScreenList
        data={codex}
        keyOf={(entry) => entry.articleId}
        space={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + (removed === null ? 32 : 96), paddingHorizontal: space.gutter }}
        header={<>
          <TopBar title={C.title} onBack={onBack} />
          {/* M17: an empty Codex says so as the Library does, not as one small line on a blank screen. */}
          {codex.length === 0
            ? <StateNote kind="empty" title={READING_TEXT.library.noKept} line={C.empty} />
            : <Small>{`${C.line} ${fillText(C.count, { n: codex.length })}`}</Small>}
        </>}
        renderRow={(entry) => (
          <View style={{ gap: 4 }}>
            <LessonCard entry={entry} onOpen={() => onOpenReading(entry.articleId)} />
            <LinkButton label={C.remove} accessibilityLabel={fillText(C.removeLabel, { lesson: entry.lesson })}
              onPress={() => { setRemoved(entry); void toggleKeep(entry); }} />
          </View>
        )}
      />
      {removed !== null && (
        <View style={{ position: 'absolute', left: space.gutter, right: space.gutter, bottom: insets.bottom + 12 }}>
          <Snackbar key={removed.articleId} message={C.removed} actionLabel={C.undo} onAction={() => void toggleKeep(removed)} onHide={() => setRemoved(null)} />
        </View>
      )}
    </View>
  );
}
