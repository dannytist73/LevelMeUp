// The Chronicle's month calendar (board D5; M6d decisions 3–4): real dates, each day of the chronicle marked cleared,
// hard day, rest, paused or today, and never as a miss. Earlier months while the chronicle reaches back to them.
import { CHRONICLE_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import type { ServerState } from '../../game/types.ts';
import { compareMonths, marksByDate, monthOf, monthWeeks, shiftMonth } from '../../lib/calendar.ts';
import type { CellMark, Month } from '../../lib/calendar.ts';
import { dateKeyLabel, monthLabel } from '../../lib/dates.ts';
import { colors, fonts, radius, space } from '../../theme/tokens.ts';
import { Icon } from '../../ui/icons.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Heading, Label } from '../../ui/Text.tsx';
import { useSize } from '../../ui/useSize.ts';

const C = CHRONICLE_TEXT;
// M12 (audit 20): sentence case, as Lantern's labels are.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const CELL = 44;

type Day = ServerState['calendar'][number];
type Look = { mark: CellMark; today: boolean };

/** The cell's drawing, `w` × `h`: paper for a cleared day (a corner for a hard one), dashed for rest, hatched for paused. */
function shapes({ mark, today }: Look, w: number, h: number, hatch: string) {
  const parts = [];
  if (mark === 'cleared' || mark === 'hard') parts.push(<Rect key="fill" x={0} y={0} width={w} height={h} fill={colors.paper} />);
  if (mark === 'hard') parts.push(<Path key="corner" d={`M${w - 14} 0H${w}V14Z`} fill={colors.ink} />);
  if (mark === 'rest') {
    parts.push(<Rect key="rest" x={1} y={1} width={w - 2} height={h - 2} fill="none" stroke={colors.ash} strokeWidth={2} strokeDasharray="5 4" />);
  }
  if (mark === 'paused') {
    parts.push(<Rect key="hatch" x={0} y={0} width={w} height={h} fill={`url(#${hatch})`} />);
    parts.push(<Rect key="paused" x={1} y={1} width={w - 2} height={h - 2} fill="none" stroke={colors.ash} strokeWidth={2} />);
  }
  if (today) parts.push(<Rect key="today" x={1.5} y={1.5} width={w - 3} height={h - 3} fill="none" stroke={colors.accent} strokeWidth={3} />);
  return parts;
}

function Drawing({ look, width, height, id }: { look: Look; width: number; height: number; id: string }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <Pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Line x1="0" y1="0" x2="0" y2="7" stroke={colors.chalk} strokeOpacity={0.3} strokeWidth={2} />
        </Pattern>
      </Defs>
      {shapes(look, width, height, id)}
    </Svg>
  );
}

function Cell({ date, look, inChronicle }: { date: string; look: Look; inChronicle: boolean }) {
  const [size, onLayout] = useSize();
  const label = [dateKeyLabel(date), look.today ? C.cell.today : null, look.mark === 'none' ? null : C.cell[look.mark]]
    .filter((part) => part !== null)
    .join(', ');
  const onPaper = look.mark === 'cleared' || look.mark === 'hard';
  return (
    <View accessible accessibilityLabel={label} onLayout={onLayout} style={{ flex: 1, height: CELL, alignItems: 'center', justifyContent: 'center' }}>
      {size !== null && <Drawing look={look} width={size.width} height={size.height} id={`cell-hatch-${date}`} />}
      <Text
        maxFontSizeMultiplier={1.4}
        style={{ fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: onPaper ? colors.ink : inChronicle ? colors.chalk : colors.ash }}
      >
        {String(Number(date.slice(8)))}
      </Text>
    </View>
  );
}

function MonthButton({ name, label, disabled, onPress }: { name: 'chevronLeft' | 'chevronRight'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      radius={radius.pill}
      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: space.border, borderColor: disabled ? colors.line : colors.lineStrong }}
    >
      <Icon name={name} size={20} color={disabled ? colors.line : colors.chalk} />
    </Tap>
  );
}

const LEGEND: readonly [Look, string][] = [
  [{ mark: 'cleared', today: false }, C.legend.cleared],
  [{ mark: 'hard', today: false }, C.legend.hard],
  [{ mark: 'paused', today: false }, C.legend.paused],
  [{ mark: 'rest', today: false }, C.legend.rest],
  [{ mark: 'none', today: true }, C.legend.today],
];

/**
 * `days` newest first (the state's calendar); `today` the open day's date, if any; `todayLook` how today would close
 * now (decision 4).
 */
export function Calendar({ days, today, todayLook }: { days: readonly Day[]; today: string | null; todayLook: CellMark }) {
  const newest = today ?? days[0]?.date ?? null;
  const oldest = days.at(-1)?.date ?? newest;
  const [month, setMonth] = useState<Month | null>(newest === null ? null : monthOf(newest));
  if (month === null || newest === null || oldest === null) return null;

  const byDate = marksByDate(days);
  const canGoBack = compareMonths(month, monthOf(oldest)) > 0;
  const canGoOn = compareMonths(month, monthOf(newest)) < 0;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <MonthButton name="chevronLeft" label={C.previous} disabled={!canGoBack} onPress={() => setMonth(shiftMonth(month, -1))} />
        <Heading style={{ flex: 1, textAlign: 'center' }}>{monthLabel(month)}</Heading>
        <MonthButton name="chevronRight" label={C.next} disabled={!canGoOn} onPress={() => setMonth(shiftMonth(month, 1))} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {WEEKDAYS.map((d) => (
          <Label key={d} style={{ flex: 1, textAlign: 'center' }}>{d}</Label>
        ))}
      </View>
      {monthWeeks(month).map((week, w) => (
        <View key={w} style={{ flexDirection: 'row', gap: 6 }}>
          {week.map((date, i) => {
            if (date === null) return <View key={`blank-${i}`} style={{ flex: 1, height: CELL }} />;
            const mark = byDate.get(date);
            const isToday = date === today;
            const look: Look = { mark: isToday ? todayLook : mark === undefined || mark === 'open' ? 'none' : mark, today: isToday };
            return <Cell key={date} date={date} look={look} inChronicle={mark !== undefined} />;
          })}
        </View>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {LEGEND.map(([look, text]) => (
          <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 14, height: 14 }}>
              <Drawing look={look} width={14} height={14} id={`legend-hatch-${look.mark}`} />
            </View>
            <Label>{text}</Label>
          </View>
        ))}
      </View>
    </View>
  );
}
