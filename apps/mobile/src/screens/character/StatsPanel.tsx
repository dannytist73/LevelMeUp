// The stats on Character (board D4; M6d decision 8): each stat's points and rank, a bar to its next point, and the line
// under it (the XP still needed, the rank one point away, how Discipline grows). M10c: the rank as a quiet word (Quest
// cleared stamps a new one; M17: it starts the line under the bar), and no lead line: each bar's own line says what it measures. M17 (UX audit
// 2026-10-20, O7): two columns, so the five stats take three rows, not five; at large text each stat takes the full width.
import { CHARACTER_TEXT, STAT_NAMES, fillText } from '@levelmeup/content';
import { STATS, pointProgress } from '@levelmeup/rules';
import { View } from 'react-native';
import { statLine } from '../../game/character.ts';
import type { CharacterView } from '../../game/types.ts';
import { NightCard } from '../../ui/NightCard.tsx';
import { Heading, Label, Meta } from '../../ui/Text.tsx';
import { XpBar } from '../../ui/XpBar.tsx';

const T = CHARACTER_TEXT.stats;

export function StatsPanel({ character }: { character: CharacterView }) {
  return (
    <NightCard style={{ gap: 14 }}>
      <Label tone="chalk">{T.title}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 18 }}>
      {STATS.map((stat) => {
        const s = character.stats[stat];
        const { into, span } = pointProgress(s.xp);
        return (
          <View key={stat} testID="stat" style={{ gap: 6, flexGrow: 1, flexBasis: 130 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <Label tone="chalk" style={{ flexGrow: 1 }}>{STAT_NAMES[stat]}</Label>
              <Heading>{String(s.points)}</Heading>
            </View>
            <XpBar value={into} max={span} label={fillText(T.bar, { stat: STAT_NAMES[stat] })} />
            {/* M17 (narrow-phone pass): the rank starts the line under the bar. Beside the points it fitted for some stats
                and wrapped for others, so on a 360 dp phone the two columns' bars no longer lined up. */}
            <Meta><Meta tone="ashLight" weight="bold">{fillText(T.rank, { rank: s.rank })}</Meta>{` · ${statLine(stat, s.points, s.xp)}`}</Meta>
          </View>
        );
      })}
      </View>
    </NightCard>
  );
}
