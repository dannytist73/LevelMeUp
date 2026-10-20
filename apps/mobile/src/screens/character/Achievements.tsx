// Achievements on Character (board D4; M6d decision 7): the earned ones as stamps with what each took, and how many are
// still hidden. M12 (board R3-6): how many are earned, the latest three (See all opens the rest in place), and the next
// ones within reach with how far along they are: quests cleared, the level, the best streak.
import { ACHIEVEMENTS, CHARACTER_TEXT, fillText } from '@levelmeup/content';
import type { Achievement } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { colors, radius } from '../../theme/tokens.ts';
import { LinkButton } from '../../ui/LinkButton.tsx';
import { SectionTitle } from '../../ui/SectionTitle.tsx';
import { MarkStamp } from '../../ui/Stamp.tsx';
import { Body, Caption, Label, Small } from '../../ui/Text.tsx';
import { XpBar } from '../../ui/XpBar.tsx';

const T = CHARACTER_TEXT.achievements;
/** The earned stamps shown before See all. */
export const SHOWN_EARNED = 3;

export type Progress = { questsCleared: number; level: number; bestStreak: number };

/** The next unearned achievement of each kind the phone can measure, with how far along it is. */
export function withinReach(earned: readonly string[], p: Progress): { achievement: Achievement; line: string; value: number; max: number }[] {
  const open = (kind: Achievement['criterion']['kind']) => ACHIEVEMENTS.find((a) => a.criterion.kind === kind && !earned.includes(a.id));
  const out: { achievement: Achievement; line: string; value: number; max: number }[] = [];
  const quests = open('quests');
  if (quests !== undefined && quests.criterion.kind === 'quests') {
    out.push({ achievement: quests, line: fillText(T.quests, { have: p.questsCleared, need: quests.criterion.count }), value: p.questsCleared, max: quests.criterion.count });
  }
  const level = open('level');
  if (level !== undefined && level.criterion.kind === 'level') {
    out.push({ achievement: level, line: fillText(T.level, { level: level.criterion.level }), value: p.level, max: level.criterion.level });
  }
  const streak = open('streak');
  if (streak !== undefined && streak.criterion.kind === 'streak') {
    out.push({ achievement: streak, line: fillText(T.streak, { have: p.bestStreak, need: streak.criterion.days }), value: p.bestStreak, max: streak.criterion.days });
  }
  return out;
}

export function Achievements({ earned, progress }: { earned: readonly string[]; progress?: Progress }) {
  const [all, setAll] = useState(false);
  // An id this version no longer knows is skipped, not shown as a blank stamp. Newest first.
  const known = earned.flatMap((id) => ACHIEVEMENTS.filter((a) => a.id === id)).reverse();
  const shown = all ? known : known.slice(0, SHOWN_EARNED);
  const total = ACHIEVEMENTS.length;
  const reach = progress === undefined ? [] : withinReach(earned, progress);
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={`${T.title} · ${fillText(T.earned, { n: known.length })}`} />
      {shown.map((a) => (
        <View key={a.id} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <MarkStamp text={a.name} rotate={-4} />
          {/* M17: the words keep beside their stamp (one wrapped under it while the next stayed beside, emulator). */}
          <Small style={{ flexGrow: 1, flexShrink: 1, flexBasis: 150 }}>{a.description}</Small>
        </View>
      ))}
      {known.length > SHOWN_EARNED && (
        <LinkButton label={all ? T.fewer : fillText(T.seeAll, { n: known.length })} tone="accentText" onPress={() => setAll((a) => !a)} />
      )}
      {reach.length > 0 && (
        // M17 (design critique): "Within reach" as a small heading with room above it; as a caption it read as a footnote
        // to the stamps above.
        <View style={{ gap: 10, marginTop: 8 }}>
          <Label accessibilityRole="header">{T.next}</Label>
          {reach.map((r) => (
            <View key={r.achievement.id} accessible accessibilityLabel={`${r.achievement.name}. ${r.achievement.description} ${r.line}`}
              style={{ gap: 6, padding: 14, borderRadius: radius.control, backgroundColor: colors.panel }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 12 }}>
                <Body weight="bold">{r.achievement.name}</Body>
                <Small>{r.line}</Small>
              </View>
              <XpBar value={Math.min(r.value, r.max)} max={r.max} label={r.line} />
            </View>
          ))}
        </View>
      )}
      <Caption>{known.length === 0 ? T.none : fillText(T.hidden, { n: total - known.length - reach.length })}</Caption>
    </View>
  );
}
