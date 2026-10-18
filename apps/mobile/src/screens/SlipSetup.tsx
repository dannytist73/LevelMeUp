// When you slip (spec §1.1 beat 7; M12 plan decision 8): the onboarding's slip question, now day 2's card. The answer
// only shapes the System's suggestion, and "real stakes" offers the Pact to read; nothing turns on until the player signs
// it. "What gets in the way?" (optional, the monetization research's ask) shows the tip for what the game already has.
import { OBSTACLES, ONBOARDING_TEXT, SETUP_TEXT, SLIP_CHOICES, SLIP_SUGGESTIONS } from '@levelmeup/content';
import type { ObstacleId } from '@levelmeup/content';
import { SLIPS } from '@levelmeup/rules';
import type { Slip } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Label, Small } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';

const T = SETUP_TEXT.slip;

export type SlipSetupProps = { onDone: () => void; onPact: () => void; onNotifications: () => void; onGame: () => void };

export function SlipSetup({ onDone, onPact, onNotifications, onGame }: SlipSetupProps) {
  const insets = useSafeAreaInsets();
  const [slip, setSlip] = useState<Slip | null>(null);
  const [obstacle, setObstacle] = useState<ObstacleId | null>(null);
  const tip = OBSTACLES.find((o) => o.id === obstacle) ?? null;
  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 22 }}>
      <TopBar title={T.title} onBack={onDone} />
      <NarrationBox>{ONBOARDING_TEXT.slip.line}</NarrationBox>
      <View style={{ gap: 12 }}>
        {SLIPS.map((s) => (
          <OptionCard key={s} label={SLIP_CHOICES[s].name} detail={SLIP_CHOICES[s].line} selected={slip === s} onPress={() => setSlip(s)} />
        ))}
        <Small>{ONBOARDING_TEXT.slip.note}</Small>
      </View>
      {slip !== null && (
        <NightCard>
          <Small tone="chalk">{SLIP_SUGGESTIONS[slip]}</Small>
          {slip === 'stakes' && <Button label={T.pact} variant="secondary" onPress={onPact} style={{ alignSelf: 'flex-start' }} />}
          {slip === 'nudge' && <Button label={T.notifications} variant="secondary" onPress={onNotifications} style={{ alignSelf: 'flex-start' }} />}
        </NightCard>
      )}
      <View style={{ gap: 12 }}>
        <Label>{T.obstacles}</Label>
        <Small>{T.obstaclesNote}</Small>
        {OBSTACLES.map((o) => (
          <OptionCard key={o.id} label={o.name} selected={obstacle === o.id} onPress={() => setObstacle(o.id)} />
        ))}
      </View>
      {tip !== null && (
        <NightCard>
          <Small tone="chalk">{tip.tip}</Small>
          {tip.action !== null && (
            <Button label={tip.action} variant="secondary" onPress={tip.id === 'forget' ? onNotifications : onGame} style={{ alignSelf: 'flex-start' }} />
          )}
        </NightCard>
      )}
      <Button label={T.done} onPress={onDone} />
    </ScreenScroll>
  );
}
