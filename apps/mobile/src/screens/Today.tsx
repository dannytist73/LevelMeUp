// Today (spec §1.2–1.4, D1 board), M4's read-only version: the day's header and every quest of the day, with the §1.4
// loading, empty and offline states. Quest actions, swap, hard day and the article reader arrive in M6–M8.
import { CLASS_NAMES } from '@levelmeup/content';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { noticeText } from '../game/notices.ts';
import type { QuestView } from '../game/types.ts';
import { dayLabel } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { HalftoneHeader } from '../ui/HalftoneHeader.tsx';
import { Icon } from '../ui/icons.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Caption, Display, Heading, Label, Small } from '../ui/Text.tsx';
import { XpBar } from '../ui/XpBar.tsx';
import { QuestCard } from './QuestCard.tsx';
import { syncMark } from './syncLine.ts';

export type TodayProps = {
  onSettings: () => void;
  /** Development builds only (M4's way to make a test character until onboarding exists). */
  onDeveloper?: () => void;
  now?: () => number;
};

const SECTION: Record<QuestView['slot'], string> = {
  core: 'Core quest', side1: 'Side quests', side2: 'Side quests', article: "Today's reading", recovery: 'Recovery',
};

export function Today({ onSettings, onDeveloper, now = Date.now }: TodayProps) {
  const insets = useSafeAreaInsets();
  const phase = useGame((s) => s.phase);
  const view = useGame((s) => s.view);
  const status = useGame((s) => s.status);
  const notices = useGame((s) => s.notices);
  const syncNow = useGame((s) => s.syncNow);
  const dismissNotice = useGame((s) => s.dismissNotice);

  const today = view?.today ?? null;
  const usable = today !== null && today.quests.length > 0 && Date.parse(today.endsAt!) > now();
  // Spec §1.4: the empty state always offers a retry, except while a sync is already running.
  const canRetry = status !== 'syncing';
  const mark = syncMark(status);

  const noticeBoxes = notices.map((n) => (
    <View key={n.eventId} style={{ gap: 8 }}>
      <NarrationBox>{noticeText(n.code)}</NarrationBox>
      <Button label="Got it" variant="secondary" onPress={() => dismissNotice(n.eventId)} />
    </View>
  ));

  let body;
  if (phase === 'not_started') {
    body = (
      <View style={{ gap: 16 }}>
        <NarrationBox>The System is waiting for you.</NarrationBox>
        {onDeveloper !== undefined && <Button label="Developer screen" variant="secondary" onPress={onDeveloper} />}
      </View>
    );
  } else if (!usable) {
    body = (
      <View style={{ gap: 16 }}>
        <NarrationBox>The System is preparing your trials.</NarrationBox>
        {canRetry && <Button label="Try again" variant="secondary" onPress={() => void syncNow()} />}
        {mark !== null && <Caption>{mark}</Caption>}
      </View>
    );
  } else {
    const quests = today!.quests;
    const slots = [...new Set(quests.map((q) => SECTION[q.slot]))];
    const sides = quests.filter((q) => q.slot === 'side1' || q.slot === 'side2');
    body = (
      <View style={{ gap: 30 }}>
        {slots.map((title) => {
          const inSection = quests.filter((q) => SECTION[q.slot] === title);
          const count = title === 'Side quests' ? `${sides.filter((q) => q.completedAt !== null).length} / ${sides.length}` : undefined;
          return (
            <View key={title} style={{ gap: 14 }}>
              <SectionTitle title={title} count={count} />
              {inSection.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  voice={view!.profile.voice}
                  classId={view!.profile.classId}
                  timeZone={today!.timeZone}
                  waiting={view!.waiting.has(q.id)}
                />
              ))}
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.night }} contentContainerStyle={{ paddingBottom: 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            {today !== null && <Label>{dayLabel(today.startsAt!, today.timeZone)}</Label>}
            <Display>{today !== null ? `DAY ${today.dayNumber}` : 'TODAY'}</Display>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={onSettings}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.chalk }}
          >
            <Icon name="settings" size={20} />
          </Pressable>
        </View>
        {view !== null && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <Heading>{view.profile.name.toUpperCase()}</Heading>
              <View style={{ paddingVertical: 3, paddingHorizontal: 10, backgroundColor: colors.paper, transform: [{ skewX: '-10deg' }] }}>
                <Label tone="ink">{`LV ${view.character.level} ${CLASS_NAMES[view.profile.classId]}`}</Label>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <XpBar value={view.character.xpIntoLevel} max={view.character.xpForLevel} label={`Level ${view.character.level} progress`} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Caption>{`${view.character.xpIntoLevel} / ${view.character.xpForLevel} XP`}</Caption>
                <Caption>{`Next: Lv ${view.character.level + 1}`}</Caption>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="flame" size={18} color={colors.ember} />
                <Heading tone="ember">{String(view.character.streak.current)}</Heading>
                <Small tone="chalk">day streak</Small>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="shield" size={18} />
                <Heading>{String(view.character.streak.shields)}</Heading>
                <Small tone="chalk">of 2 shields</Small>
              </View>
            </View>
            {mark !== null && usable && <Body tone="ash">{mark}</Body>}
          </>
        )}
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        {noticeBoxes}
        {body}
      </View>
    </ScrollView>
  );
}
