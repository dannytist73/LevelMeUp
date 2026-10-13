// The self-check (M4 plan Task 2/15): the rules' time cases on Hermes, the device zone, content, AES, SQLite and ids.
import * as Crypto from 'expo-crypto';
import { getCalendars } from 'expo-localization';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { contentProbe, runSelfCheck, uuidProbe, zoneProbe } from '../../dev/selfcheck.ts';
import type { CheckLine } from '../../dev/selfcheck.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { Body, Meta, Title } from '../../ui/Text.tsx';
import { expoCipherProbe, sqlProbe } from '../probes.ts';

export default function SelfCheck() {
  const insets = useSafeAreaInsets();
  const [lines, setLines] = useState<CheckLine[] | null>(null);

  useEffect(() => {
    void runSelfCheck([
      zoneProbe(() => getCalendars()[0]?.timeZone, () => Intl.DateTimeFormat().resolvedOptions().timeZone),
      contentProbe,
      uuidProbe(Crypto.randomUUID),
      expoCipherProbe,
      sqlProbe,
    ]).then(setLines);
  }, []);

  const failed = lines?.filter((l) => !l.ok).length ?? 0;
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 12 }}>
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
      <Title>Self-check</Title>
      <Body>{lines === null ? 'Running…' : failed === 0 ? `All ${lines.length} checks passed.` : `${failed} of ${lines.length} checks FAILED.`}</Body>
      {lines?.map((line) => (
        <NightCard key={line.name} quiet={line.ok}>
          <View style={{ gap: 2 }}>
            <Body weight="bold">{`${line.ok ? 'PASS' : 'FAIL'} · ${line.name}`}</Body>
            <Meta>{line.detail}</Meta>
          </View>
        </NightCard>
      ))}
    </ScreenScroll>
  );
}
