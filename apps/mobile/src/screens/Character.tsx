// Character (spec §1.3, D4 board), M4's version: level, XP and the five stats with their ranks. Portraits, class path,
// achievements and class change arrive in M6.
import { CLASS_NAMES, STAT_NAMES } from '@levelmeup/content';
import { STATS } from '@levelmeup/rules';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { HalftoneHeader } from '../ui/HalftoneHeader.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { MarkStamp } from '../ui/Stamp.tsx';
import { Caption, Heading, Label, Meta, Title } from '../ui/Text.tsx';
import { XpBar } from '../ui/XpBar.tsx';
import { lastSynced } from './syncLine.ts';

export function Character() {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const status = useGame((s) => s.status);
  const lastSyncedAt = useGame((s) => s.lastSyncedAt);
  const stale = status === 'offline' || status === 'retrying';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.night }} contentContainerStyle={{ paddingBottom: 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
        <Label>Character</Label>
        {view !== null && (
          <>
            <Title>{view.profile.name}</Title>
            <Label tone="chalk">{`Level ${view.character.level} · ${CLASS_NAMES[view.profile.classId]}`}</Label>
            <XpBar value={view.character.xpIntoLevel} max={view.character.xpForLevel} label={`Level ${view.character.level} progress`} />
            <Caption>{`${view.character.xpIntoLevel} / ${view.character.xpForLevel} XP to level ${view.character.level + 1}`}</Caption>
          </>
        )}
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 12 }}>
        {view === null ? (
          <NarrationBox>The System is preparing your trials.</NarrationBox>
        ) : (
          STATS.map((stat) => {
            const s = view.character.stats[stat];
            return (
              <NightCard key={stat} quiet>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Label tone="chalk">{STAT_NAMES[stat]}</Label>
                    <Heading>{`${s.points} points`}</Heading>
                    <Meta>{`${s.toNext} XP to the next point`}</Meta>
                  </View>
                  <MarkStamp text={`Rank ${s.rank}`} />
                </View>
              </NightCard>
            );
          })
        )}
        {stale && <Caption>{lastSynced(lastSyncedAt, view?.profile.timeZone ?? 'UTC')}</Caption>}
      </View>
    </ScrollView>
  );
}
