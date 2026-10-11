// The stats on Character (board D4; M6d decision 8): each stat's points and rank, a bar to its next point, and the line
// under it (the XP still needed, the rank one point away, how Discipline grows).
import { CHARACTER_TEXT, STAT_NAMES, fillText } from '@levelmeup/content';
import { STATS, pointProgress } from '@levelmeup/rules';
import { View } from 'react-native';
import { statLine } from '../../game/character.ts';
import type { CharacterView } from '../../game/types.ts';
import { NightCard } from '../../ui/NightCard.tsx';
import { MarkStamp } from '../../ui/Stamp.tsx';
import { Heading, Label, Meta, Small } from '../../ui/Text.tsx';
import { XpBar } from '../../ui/XpBar.tsx';

const T = CHARACTER_TEXT.stats;

export function StatsPanel({ character }: { character: CharacterView }) {
  return (
    <NightCard>
      <View style={{ gap: 4 }}>
        <Label tone="chalk">{T.title}</Label>
        <Small>{T.lead}</Small>
      </View>
      {STATS.map((stat) => {
        const s = character.stats[stat];
        const { into, span } = pointProgress(s.xp);
        return (
          <View key={stat} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <Label tone="chalk" style={{ flexGrow: 1 }}>{STAT_NAMES[stat]}</Label>
              <Heading>{String(s.points)}</Heading>
              <MarkStamp text={`Rank ${s.rank}`} />
            </View>
            <XpBar value={into} max={span} label={fillText(T.bar, { stat: STAT_NAMES[stat] })} />
            <Meta>{statLine(stat, s.points, s.xp)}</Meta>
          </View>
        );
      })}
    </NightCard>
  );
}
