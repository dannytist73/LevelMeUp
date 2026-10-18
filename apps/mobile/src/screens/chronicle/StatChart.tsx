// M13: All-time stats (Plus): one stat at a time, its points at the end of each week since day 1, from the server's
// statWeeks (sent only to a Plus player). A free player sees what it is and a way to Plus, never a blurred tease.
import { PLUS_TEXT, STAT_NAMES, fillText } from '@levelmeup/content';
import { STATS } from '@levelmeup/rules';
import type { Stat } from '@levelmeup/rules';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import type { StatWeek } from '../../../../../supabase/functions/_shared/plus.ts';
import { dateKeyLabel } from '../../lib/dates.ts';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Caption, Heading, Label, Small } from '../../ui/Text.tsx';

const HEIGHT = 140;
const PAD = 10;

/** The chart's points: x spread evenly over the weeks, y from the lowest to the highest value (a flat line sits mid-way). */
export function chartPoints(values: readonly number[], width: number, height: number): [number, number][] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = values.length > 1 ? (width - 2 * PAD) / (values.length - 1) : 0;
  return values.map((v, i) => [
    values.length > 1 ? PAD + i * step : width / 2,
    hi === lo ? height / 2 : height - PAD - ((v - lo) / (hi - lo)) * (height - 2 * PAD),
  ]);
}

export type StatChartProps = {
  /** Null: the player isn't Plus. */
  weeks: readonly StatWeek[] | null;
  onPlus: () => void;
};

export function StatChart({ weeks, onPlus }: StatChartProps) {
  const [stat, setStat] = useState<Stat>('strength');
  const { width: screen } = useWindowDimensions();
  const width = screen - 2 * space.gutter - 32;

  if (weeks === null) {
    return (
      <NightCard>
        <Heading>{PLUS_TEXT.chart.title}</Heading>
        <Small>{PLUS_TEXT.chart.locked}</Small>
        <Button variant="secondary" label={PLUS_TEXT.settings.see} onPress={onPlus} />
      </NightCard>
    );
  }

  const values = weeks.map((w) => w.points[stat]);
  const points = chartPoints(values, width, HEIGHT);
  const last = points.at(-1);
  return (
    <NightCard>
      <Heading>{PLUS_TEXT.chart.title}</Heading>
      <Small>{PLUS_TEXT.chart.lead}</Small>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
        {STATS.map((s) => (
          <Tap
            key={s}
            accessibilityRole="radio"
            accessibilityLabel={STAT_NAMES[s]}
            accessibilityState={{ checked: s === stat }}
            onPress={() => setStat(s)}
            on={s === stat ? 'accent' : 'night'}
            radius={radius.pill}
          >
            <View style={{ minHeight: 40, minWidth: 48, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderRadius: radius.pill,
              borderWidth: space.border, borderColor: s === stat ? colors.accent : colors.lineStrong, backgroundColor: s === stat ? colors.accent : 'transparent' }}>
              <Label tone={s === stat ? 'onAccent' : 'chalk'}>{STAT_NAMES[s]}</Label>
            </View>
          </Tap>
        ))}
      </View>
      {weeks.length === 0 ? (
        <Small>{PLUS_TEXT.chart.empty}</Small>
      ) : (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={fillText(PLUS_TEXT.chart.label, { stat: STAT_NAMES[stat], from: values[0]!, to: values.at(-1)!, weeks: weeks.length })}
          style={{ gap: 4 }}
        >
          <Svg width={width} height={HEIGHT} testID="stat-chart">
            <Line x1={0} y1={HEIGHT - 1} x2={width} y2={HEIGHT - 1} stroke={colors.line} strokeWidth={1} />
            {points.length > 1 && (
              <Polyline points={points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke={colors.accent} strokeWidth={3}
                strokeLinejoin="round" strokeLinecap="round" />
            )}
            {last !== undefined && <Circle cx={last[0]} cy={last[1]} r={5} fill={colors.accentText} />}
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Caption>{fillText(PLUS_TEXT.chart.since, { date: dateKeyLabel(weeks[0]!.week) })}</Caption>
            <Caption>{`${STAT_NAMES[stat]} ${values.at(-1)}`}</Caption>
          </View>
        </View>
      )}
    </NightCard>
  );
}
