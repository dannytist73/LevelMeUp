// M17 (UX audit 2026-10-20, O4): a group of settings as one rounded card, its rows divided by a quiet line, under a
// section title (Android's own settings, and iOS's grouped lists). Settings mixed four looks before: bordered rows, bare
// switches, cards holding buttons and loose lines of text.
import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { colors, radius, space } from '../theme/tokens.ts';
import { SectionTitle } from './SectionTitle.tsx';

/** The rows go in as children; a row left out (`false`, `null`) leaves no line behind. */
export function Group({ title, children, note }: { title?: string; children: ReactNode; note?: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      {title !== undefined && <SectionTitle title={title} />}
      <View testID="group" style={{ borderRadius: radius.card, borderWidth: space.border, borderColor: colors.divider, backgroundColor: colors.panel, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <View key={row.key ?? i}>
            {i > 0 && <View style={{ height: 1, marginHorizontal: 16, backgroundColor: colors.divider }} />}
            {row}
          </View>
        ))}
      </View>
      {note}
    </View>
  );
}

/** Words and buttons inside a group, padded as its rows are. */
export function GroupBody({ children }: { children: ReactNode }) {
  return <View style={{ padding: 16, gap: 10 }}>{children}</View>;
}
