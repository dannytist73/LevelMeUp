// Character (spec §1.3, board D4; M6d): the portrait frame, name, level and title, the stats with progress to their next
// point, the class path, Scholar's Path for a Mage at level 10, the achievements, the vow, and the class change (M6b).
// M10c: Switch portrait is a round button on the portrait's corner; the class change is a row.
import { ADJUST_TEXT, CHARACTER_TEXT, CLASS_NAMES, SHADOW_TEXT, fillText, latestTitle } from '@levelmeup/content';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { figureFor, otherFigure } from '../art/portraits.ts';
import { scholarsPathOpen } from '../game/character.ts';
import { marked, shadowHold } from '../game/pact.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { HalftoneHeader } from '../ui/HalftoneHeader.tsx';
import { Icon } from '../ui/icons.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { Portrait } from '../ui/Portrait.tsx';
import { RowLink } from '../ui/RowLink.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Caption, Label, Title } from '../ui/Text.tsx';
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
  const chosen = useGame((s) => s.portrait);
  const setPortrait = useGame((s) => s.setPortrait);
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
  const figure = figureFor(chosen, view.profile.programStyle);

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
        <Label>{T.label}</Label>
        <View style={{ alignSelf: 'center' }}>
          <Portrait classId={classId} level={level} figure={figure} marked={mark}
            label={`${fillText(T.portrait, { className, level })}${mark ? ` ${SHADOW_TEXT.markLabel}` : ''}`} />
          <Pressable accessibilityRole="button" accessibilityLabel={T.switchPortrait} onPress={() => void setPortrait(otherFigure(figure))}
            style={({ pressed }) => ({
              position: 'absolute', right: -10, bottom: -10, width: 52, height: 52, borderRadius: 26, alignItems: 'center',
              justifyContent: 'center', backgroundColor: pressed ? colors.ashLight : colors.paper, borderWidth: 3, borderColor: colors.ink,
            })}>
            <Icon name="switch" size={24} color={colors.ink} />
          </Pressable>
        </View>
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
        <RowLink label={ADJUST_TEXT.classChange.open}
          line={lock === null ? `${ADJUST_TEXT.classChange.label}: ${className}` : `${ADJUST_TEXT.classChange.label}: ${className} · ${lockLine(lock, timeZone)}`}
          onPress={onChangeClass} />
        {stale && <Caption>{lastSynced(lastSyncedAt, timeZone)}</Caption>}
      </View>
    </ScreenScroll>
  );
}
