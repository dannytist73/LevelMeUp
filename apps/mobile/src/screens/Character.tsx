// Character (spec §1.3, board D4; M6d): the portrait frame, name, level and title, the stats with progress to their next
// point, the class path, Scholar's Path for a Mage at level 10, the achievements, the vow, and the class change (M6b).
import { ADJUST_TEXT, CHARACTER_TEXT, CLASS_NAMES, SHADOW_TEXT, fillText, latestTitle } from '@levelmeup/content';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scholarsPathOpen } from '../game/character.ts';
import { marked, shadowHold } from '../game/pact.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { HalftoneHeader } from '../ui/HalftoneHeader.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { Portrait } from '../ui/Portrait.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Caption, Heading, Label, Title } from '../ui/Text.tsx';
import { XpBar } from '../ui/XpBar.tsx';
import { Achievements } from './character/Achievements.tsx';
import { ClassPath } from './character/ClassPath.tsx';
import { ScholarsPath } from './character/ScholarsPath.tsx';
import { StatsPanel } from './character/StatsPanel.tsx';
import { classLock, lockLine } from './ClassChange.tsx';
import { lastSynced } from './syncLine.ts';

const T = CHARACTER_TEXT;

export type CharacterProps = { onChangeClass: () => void; onOpenBook: () => void; now?: () => number };

export function Character({ onChangeClass, onOpenBook, now = Date.now }: CharacterProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const vow = useGame((s) => s.vow);
  const status = useGame((s) => s.status);
  const lastSyncedAt = useGame((s) => s.lastSyncedAt);
  const stale = status === 'offline' || status === 'retrying';

  if (view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }}>
        <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
          <Label>{T.label}</Label>
        </HalftoneHeader>
        <View style={{ paddingHorizontal: space.gutter, gap: 12 }}>
          <NarrationBox>The System is preparing your trials.</NarrationBox>
          {stale && <Caption>{lastSynced(lastSyncedAt, 'UTC')}</Caption>}
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
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
        <Label>{T.label}</Label>
        <Portrait classId={classId} marked={mark}
          label={`${fillText(T.portrait, { className, level })}${mark ? ` ${SHADOW_TEXT.markLabel}` : ''}`} />
        <Title>{view.profile.name}</Title>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <View style={{ paddingVertical: 3, paddingHorizontal: 10, backgroundColor: colors.paper, transform: [{ skewX: '-10deg' }] }}>
            <Label tone="ink">{`LV ${level} ${className.toUpperCase()}`}</Label>
          </View>
          {title !== null && <Body tone="ember" weight="bold">{`“${title}”`}</Body>}
        </View>
        <View style={{ gap: 6 }}>
          <XpBar value={view.character.xpIntoLevel} max={view.character.xpForLevel} label={`Level ${level} progress`} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Caption>{fillText(T.totalXp, { total: view.character.totalXp, into: view.character.xpIntoLevel, span: view.character.xpForLevel })}</Caption>
            <Caption>{fillText(T.next, { level: level + 1 })}</Caption>
          </View>
        </View>
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        <StatsPanel character={view.character} />
        <ClassPath view={view} dayNumber={view.today?.dayNumber ?? null} />
        {scholarsPathOpen(classId, level) && <ScholarsPath view={view} onOpenBook={onOpenBook} />}
        <Achievements earned={view.achievements} />
        {vow !== null && (
          <NightCard>
            <Label tone="chalk">{T.vow.title}</Label>
            <Body>{`“${vow}”`}</Body>
          </NightCard>
        )}
        <NightCard>
          <View style={{ gap: 8 }}>
            <Label tone="chalk">{ADJUST_TEXT.classChange.label}</Label>
            <Heading>{className}</Heading>
            {lock !== null && <Caption>{lockLine(lock, timeZone)}</Caption>}
            <Button label={ADJUST_TEXT.classChange.open} variant="secondary" onPress={onChangeClass} />
          </View>
        </NightCard>
        {stale && <Caption>{lastSynced(lastSyncedAt, timeZone)}</Caption>}
      </View>
    </ScreenScroll>
  );
}
