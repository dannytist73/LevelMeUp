// Character (spec §1.3, board D4; M6d): the portrait frame, name, level and title, the stats with progress to their next
// point, the class path, Scholar's Path for a Mage at level 10, the achievements, the vow, and the class change (M6b).
// M10c: the class change is a row. M12: the Codex moved to the Library tab (plan decision 1). Monster Week: Switch portrait
// went with the M9a paintings (no picture differs by figure now).
import { ADJUST_TEXT, CHARACTER_TEXT, CLASS_NAMES, MONSTER_TEXT, SHADOW_TEXT, TODAY_TEXT, fillText, latestTitle } from '@levelmeup/content';
import { MAX_SHIELDS } from '@levelmeup/rules';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scholarsPathOpen } from '../game/character.ts';
import { marked, shadowHold } from '../game/pact.ts';
import { streakNote } from '../game/checkin.ts';
import { shownStreak } from '../game/today.ts';
import { useGame } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { ScreenHeader } from '../ui/ScreenHeader.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { plusOf, shownFrame } from '../plus/plus.ts';
import { Portrait } from '../ui/Portrait.tsx';
import { LinkButton } from '../ui/LinkButton.tsx';
import { RowLink } from '../ui/RowLink.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Bone, Skeleton } from '../ui/Skeleton.tsx';
import { TabTop } from '../ui/TabTop.tsx';
import { Body, Caption, Label, Title } from '../ui/Text.tsx';
import { XpBar } from '../ui/XpBar.tsx';
import { Achievements } from './character/Achievements.tsx';
import { ClassPath } from './character/ClassPath.tsx';
import { ScholarsPath } from './character/ScholarsPath.tsx';
import { StatsPanel } from './character/StatsPanel.tsx';
import { classLock, lockLine } from './ClassChange.tsx';
import { usePullToSync } from './pull.ts';
import { lastSynced, staleSince } from './syncLine.ts';

const T = CHARACTER_TEXT;

/**
 * Monster Week: the streak as Today's header said it (M10c, M7a): its number, today counting or the check-in's note, and
 * the shields.
 */
export function streakLine(view: Parameters<typeof shownStreak>[0] & Parameters<typeof streakNote>[0]): string {
  const streak = shownStreak(view);
  const note = streakNote(view);
  return [`${streak.current} ${TODAY_TEXT.streak}`, ...(note !== null ? [note] : streak.counts ? [TODAY_TEXT.counts] : []),
    fillText(TODAY_TEXT.shields, { n: view.character.streak.shields, max: MAX_SHIELDS })].join(' · ');
}

/** Monster Week: Me, with `onChronicle` (the streak and the calendar, which left the tabs). */
export type CharacterProps = {
  onChangeClass: () => void; onOpenBook: () => void; onSettings?: () => void; onVow?: () => void; onChronicle?: () => void; now?: () => number;
};

export function Character({ onChangeClass, onOpenBook, onSettings, onVow, onChronicle, now = Date.now }: CharacterProps) {
  const insets = useSafeAreaInsets();
  const pull = usePullToSync();
  const view = useGame((s) => s.view);
  const vow = useGame((s) => s.vow);
  const lastSyncedAt = useGame(staleSince);
  // M13: a frame shows only while it is the player's to use (a lapsed Plus shows none).
  const frame = useGame((s) => shownFrame(s.frame, plusOf(s.view)));
  const stale = lastSyncedAt !== undefined;

  if (view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader style={{ paddingTop: insets.top + 12 }}>
          <TabTop onSettings={onSettings}><Label accessibilityRole="header">{T.label}</Label></TabTop>
        </ScreenHeader>
        <View style={{ paddingHorizontal: space.gutter, gap: 12 }}>
          {/* M12 (audit 11): loading looks like loading. */}
          <Skeleton>
            <Bone height={180} width={180} round={radius.card} />
            <Bone height={24} width="50%" />
            {[0, 1, 2, 3].map((i) => <Bone key={i} height={18} />)}
          </Skeleton>
          {stale && <Caption>{lastSynced(lastSyncedAt ?? null, 'UTC')}</Caption>}
        </View>
      </ScreenScroll>
    );
  }

  const { classId, timeZone } = view.profile;
  const { level } = view.character;
  const className = CLASS_NAMES[classId];
  const title = latestTitle(view.achievements);
  const lock = classLock(view, now());
  // M7c decision 9: the Shadow's mark while it holds the day.
  const mark = marked(shadowHold(view, now()));

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }} refresh={pull} tab="character">
      <ScreenHeader style={{ paddingTop: insets.top + 12 }}>
        {/* M17: the tab's title is the player's name, large like the other tabs' (it sat small under the portrait). */}
        <TabTop onSettings={onSettings}><Title accessibilityRole="header">{view.profile.name}</Title></TabTop>
        <Portrait classId={classId} marked={mark} frame={frame}
          label={`${fillText(T.portrait, { className, level })}${mark ? ` ${SHADOW_TEXT.markLabel}` : ''}`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <View style={{ paddingVertical: 3, paddingHorizontal: 12, backgroundColor: colors.paper, borderRadius: radius.pill }}>
            <Label tone="ink">{`Lv ${level} ${className}`}</Label>
          </View>
          {title !== null && <Body tone="accentText" weight="bold">{`“${title}”`}</Body>}
        </View>
        <View style={{ gap: 6 }}>
          <XpBar value={view.character.xpIntoLevel} max={view.character.xpForLevel} level={level} label={`Level ${level} progress`} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Caption>{fillText(T.totalXp, { total: view.character.totalXp, into: view.character.xpIntoLevel, span: view.character.xpForLevel })}</Caption>
            <Caption>{fillText(T.next, { xp: view.character.xpForLevel - view.character.xpIntoLevel, level: level + 1 })}</Caption>
          </View>
        </View>
      </ScreenHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        {/* Monster Week: the streak left Today's header; the Chronicle, its home, opens from here. */}
        {onChronicle !== undefined && (
          <RowLink label={MONSTER_TEXT.me.chronicle}
            line={streakLine(view)}
            onPress={onChronicle} />
        )}
        <StatsPanel character={view.character} />
        <ClassPath view={view} dayNumber={view.today?.dayNumber ?? null} />
        {scholarsPathOpen(classId, level) && <ScholarsPath view={view} onOpenBook={onOpenBook} />}
        <Achievements earned={view.achievements}
          progress={{ questsCleared: view.growth.questsCleared, level, bestStreak: view.character.streak.best }} />
        {vow !== null && (
          <NightCard>
            <Label tone="chalk">{T.vow.title}</Label>
            <Body>{`“${vow}”`}</Body>
            {onVow !== undefined && <LinkButton label={T.vow.change} tone="accentText" onPress={onVow} />}
          </NightCard>
        )}
        {vow === null && onVow !== undefined && <RowLink label={T.vow.write} onPress={onVow} />}
        <RowLink label={ADJUST_TEXT.classChange.open}
          line={lock === null ? `${ADJUST_TEXT.classChange.label}: ${className}` : `${ADJUST_TEXT.classChange.label}: ${className} · ${lockLine(lock, timeZone)}`}
          onPress={onChangeClass} />
        {stale && <Caption>{lastSynced(lastSyncedAt ?? null, timeZone)}</Caption>}
      </View>
    </ScreenScroll>
  );
}
