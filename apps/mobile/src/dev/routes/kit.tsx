// The component kit, mirroring the System board (docs/design/ink-panel/System.dc.html), for the device check.
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Chip } from '../../ui/Chip.tsx';
import { ScreenHeader } from '../../ui/ScreenHeader.tsx';
import { Icon } from '../../ui/icons.tsx';
import type { IconName } from '../../ui/icons.tsx';
import { InkTabBar } from '../../ui/InkTabBar.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { OutlinedTitle } from '../../ui/OutlinedTitle.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SectionTitle } from '../../ui/SectionTitle.tsx';
import { SlamIn } from '../../ui/SlamIn.tsx';
import { Panel } from '../../ui/Panel.tsx';
import { MarkStamp, XpStamp } from '../../ui/Stamp.tsx';
import { Body, Caption, Display, Heading, Label, Meta, Small, Title } from '../../ui/Text.tsx';
import { XpBar } from '../../ui/XpBar.tsx';

const ICONS: IconName[] = ['settings', 'flame', 'shield', 'sun', 'user', 'calendar'];
const TABS = [
  { key: 'today', label: 'Today', icon: 'sun' },
  { key: 'character', label: 'Character', icon: 'user' },
  { key: 'chronicle', label: 'Chronicle', icon: 'calendar' },
] as const;

export default function Kit() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('today');
  const [replay, setReplay] = useState(0);
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32, gap: 28 }}>
        <ScreenHeader>
          <Label>LevelMeUp · design system · dark only</Label>
          <OutlinedTitle text="INK PANEL" />
        </ScreenHeader>

        <View style={{ paddingHorizontal: space.gutter, gap: 12 }}>
          <SectionTitle title="Type" />
          <Display>DAY 12</Display>
          <Title>Knee push-ups</Title>
          <Heading>Name tomorrow's hardest task</Heading>
          <Label>Core quest</Label>
          <Body>Your trials are set. Clear the core quest and today counts, whatever else happens.</Body>
          <Body weight="medium">Gothic A1 medium: 3 sets of 8 · about 12 min</Body>
          <Body weight="bold">Gothic A1 bold: Walk 20 minutes</Body>
          <Small>Small: Unlocked: you cleared incline push-ups 3 times this week.</Small>
          <Meta>Meta: Vitality · cleared 07:40</Meta>
          <Caption>Caption: 62 / 130 XP — “quotes”, ellipsis…, × and →</Caption>
        </View>

        <View style={{ paddingHorizontal: space.gutter, gap: 18 }}>
          <SectionTitle title="Pieces" count="kit" />
          <NarrationBox>Narration box: the System's voice.</NarrationBox>
          <SlamIn key={replay}>
            <View>
              <Panel outlined contentStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 4 }}>
                <Label tone="accentInk">Quest panel</Label>
                <Title tone="ink">Cut corner, red offset</Title>
                <Small tone="inkMuted">Stop if you feel sharp pain, dizziness or chest pain.</Small>
                <Button label="Log reps" on="paper" onPress={() => setReplay((n) => n + 1)} />
              </Panel>
              <XpStamp xp={20} style={{ position: 'absolute', top: -20, right: -8 }} />
            </View>
          </SlamIn>
          <Button label="Continue" onPress={() => {}} />
          <Button label="Accept class" variant="commitment" onPress={() => {}} />
          <Button label="Secondary action" variant="secondary" onPress={() => {}} />
          <Button label="Disabled" disabled onPress={() => {}} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <Chip label="Strength" />
            <Chip label="Timer" kind="outline" />
            <MarkStamp text="Cleared +20" />
            <XpStamp xp={10} size={54} rotate={8} />
          </View>
          <NightCard>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Chip label="Focus" />
              <Chip label="One sentence" kind="outline" />
            </View>
            <Heading>Name tomorrow's hardest task</Heading>
            <Meta>Balance quest: Focus is your lowest stat.</Meta>
          </NightCard>
          <NightCard quiet>
            <Body weight="bold" tone="ashLight">Walk 20 minutes</Body>
            <Meta>Vitality · cleared 07:40</Meta>
          </NightCard>
          <View style={{ gap: 6 }}>
            <XpBar value={62} max={130} label="Level 6 progress" />
            <Caption>62 / 130 XP · Next: Lv 7</Caption>
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {ICONS.map((name) => (
              <Icon key={name} name={name} />
            ))}
          </View>
        </View>

        <InkTabBar tabs={TABS} active={tab} onSelect={setTab} />
      </ScreenScroll>
    </View>
  );
}
