// Monster Week (docs/2026-10-25-monster-week.md, board p3-camp): the Camp tab. The campfire with every Grumble you have
// befriended, the one at the edge of camp now with its battle time, and the Grumble book: all 24, the befriended ones with
// how many times they joined, the one here now, and the rest as dark silhouettes until they arrive.
import { GRUMBLES, MONSTER_TEXT, STAT_NAMES, fillText } from '@levelmeup/content';
import type { Grumble } from '@levelmeup/content';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { battleShown } from '../game/battle.ts';
import { useGame } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { GrumbleArt } from '../ui/GrumbleArt.tsx';
import { ScreenHeader } from '../ui/ScreenHeader.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Bone, Skeleton } from '../ui/Skeleton.tsx';
import { TabTop } from '../ui/TabTop.tsx';
import { Body, Caption, Heading, Label, Small, Title } from '../ui/Text.tsx';
import { clockLine } from './today/Arena.tsx';
import { usePullToSync } from './pull.ts';

const C = MONSTER_TEXT.camp;
/** Friends drawn alive around the fire; the rest sit still beside them. */
const LIVING_AT_FIRE = 6;

function Fire() {
  return (
    <Svg width={120} height={92} viewBox="0 0 120 92" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id="camp-glow" cx="60" cy="58" r="56" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.45} />
          <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="60" cy="58" r="56" fill="url(#camp-glow)" />
      <Path d="M60 18 C72 36 80 46 72 62 C68 70 52 70 48 62 C42 50 52 40 60 18 Z" fill={colors.accent} />
      <Path d="M60 40 C66 50 68 56 64 63 C62 67 58 67 56 63 C53 57 56 50 60 40 Z" fill={colors.paper} />
      <Ellipse cx="60" cy="76" rx="30" ry="6" fill={colors.lip} />
      <Path d="M34 78 L86 70 M34 70 L86 78" stroke={colors.lineStrong} strokeWidth="7" strokeLinecap="round" />
    </Svg>
  );
}

function BookCell({ g, wins, here }: { g: Grumble; wins: number; here: boolean }) {
  const met = wins > 0;
  const line = met ? (wins === 1 ? C.joinedOnce : fillText(C.joinedTimes, { n: wins })) : here ? C.hereNow : C.unknown;
  const label = met || here ? `${g.name}, ${g.standsFor}. ${line}` : `${C.unknown}. ${g.hint}`;
  return (
    <View accessible accessibilityLabel={label} testID={`book-${g.id}`}
      style={{ width: '31%', flexGrow: 1, alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 6, borderRadius: radius.control,
        backgroundColor: here ? colors.halftone : colors.panel, borderWidth: here ? space.heroBorder : space.border, borderColor: here ? colors.candy : colors.divider }}>
      <GrumbleArt id={g.id} weakness={g.weakness} size={64} living={false} silhouette={!met && !here} accessibilityLabel={label} />
      <Label tone={met || here ? 'chalk' : 'ash'} style={{ textAlign: 'center' }}>{met || here ? g.name : '?'}</Label>
      <Caption style={{ textAlign: 'center' }}>{line}</Caption>
    </View>
  );
}

export function Camp({ onSettings, now = Date.now }: { onSettings?: () => void; now?: () => number }) {
  const insets = useSafeAreaInsets();
  const pull = usePullToSync();
  const view = useGame((s) => s.view);
  const battle = view === null ? null : battleShown(view);
  const camp = view?.camp;

  if (view === null || battle === null || camp === undefined) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }} refresh={pull} tab="camp">
        <ScreenHeader style={{ paddingTop: insets.top + 12 }}>
          <TabTop onSettings={onSettings}><Title accessibilityRole="header">{C.title}</Title></TabTop>
        </ScreenHeader>
        <View style={{ paddingHorizontal: space.gutter }}>
          <Skeleton>
            <Bone height={180} round={radius.card} />
            <Bone height={24} width="50%" />
          </Skeleton>
        </View>
      </ScreenScroll>
    );
  }

  const friends = GRUMBLES.filter((g) => (camp.wins[g.id] ?? 0) > 0);
  const here = GRUMBLES.find((g) => g.id === battle.grumble);
  const count = friends.length === 0 ? C.friendsNone : friends.length === 1 ? C.friendsOne : fillText(C.friends, { n: friends.length });
  const metCount = friends.length;
  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32 }} refresh={pull} tab="camp">
      <ScreenHeader style={{ paddingTop: insets.top + 12, gap: 6 }}>
        <TabTop onSettings={onSettings}><Title accessibilityRole="header">{C.title}</Title></TabTop>
        <Small>{count}</Small>
      </ScreenHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        <View testID="camp-scene" style={{ alignItems: 'center', gap: 12, paddingVertical: 18, paddingHorizontal: 12, borderRadius: radius.card, backgroundColor: colors.halftone }}>
          <Fire />
          {friends.length === 0 ? (
            <Body style={{ textAlign: 'center' }}>{C.empty}</Body>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {friends.map((g, i) => (
                <View key={g.id} style={{ alignItems: 'center', width: 84 }}>
                  <GrumbleArt id={g.id} weakness={g.weakness} size={72} pose="happy" living={i < LIVING_AT_FIRE} accessibilityLabel={g.name} />
                  <Caption tone="ashLight" style={{ textAlign: 'center' }}>{g.name}</Caption>
                </View>
              ))}
            </View>
          )}
        </View>
        {here !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.card, backgroundColor: colors.panel, borderWidth: space.border, borderColor: colors.line }}>
            <GrumbleArt id={here.id} weakness={here.weakness} size={72} accessibilityLabel={`${here.name}, ${here.standsFor}`} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Body weight="bold">{fillText(C.here, { name: here.name })}</Body>
              {battle.endsAt !== null && !battle.decided && <Small>{fillText(C.battle, { when: clockLine(battle.endsAt, view.today?.timeZone ?? view.profile.timeZone, now()) })}</Small>}
              <Small tone="candy">{fillText(MONSTER_TEXT.arena.weakTo, { stat: STAT_NAMES[here.weakness] })}</Small>
            </View>
          </View>
        )}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <Heading accessibilityRole="header">{C.book}</Heading>
            <Label>{fillText(C.bookCount, { n: metCount, total: GRUMBLES.length })}</Label>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {GRUMBLES.map((g) => <BookCell key={g.id} g={g} wins={camp.wins[g.id] ?? 0} here={g.id === battle.grumble} />)}
          </View>
        </View>
      </View>
    </ScreenScroll>
  );
}
