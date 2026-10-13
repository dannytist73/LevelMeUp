// Developer: the notifications planned now (M7d decision 10), each with its time in the quest day's zone, and a copy of
// the first one shown in 10 seconds, to check the look and the tap without waiting for its time. Development builds only.
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clockTime, dateLine } from '../../lib/dates.ts';
import { expoNotes } from '../../notify/os.ts';
import { deviceZone } from '../../state/appStore.ts';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { Body, Meta, Small, Title } from '../../ui/Text.tsx';

export default function DevNotify() {
  const insets = useSafeAreaInsets();
  const planned = useGame((s) => s.planned);
  const permission = useGame((s) => s.permission);
  const zone = useGame((s) => s.view?.today?.timeZone) ?? deviceZone();
  const [message, setMessage] = useState<string | null>(null);
  const first = planned[0];

  const preview = async (): Promise<void> => {
    if (first === undefined) return;
    try {
      // The plan stays as it is; the copy has its own id and shows once.
      await expoNotes.replace([...planned, { ...first, id: 'dev-preview', at: Date.now() + 10_000 }]);
      setMessage('Planned: the copy shows in 10 seconds. Leave the app to see it in the shade.');
    } catch (e) {
      setMessage(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 12 }}>
      <Title>Notifications</Title>
      <Meta>{`Permission: ${permission} · ${planned.length} planned · zone ${zone}`}</Meta>
      {planned.map((n) => (
        <NightCard key={n.id}>
          <Meta>{`${dateLine(n.at, zone)} ${clockTime(new Date(n.at).toISOString(), zone)} · ${n.kind} · ${n.url}`}</Meta>
          <Body weight="bold">{n.title}</Body>
          <Small>{n.body}</Small>
        </NightCard>
      ))}
      <Button label="Show the first one in 10 seconds" variant="secondary" disabled={first === undefined || permission !== 'granted'} onPress={() => void preview()} />
      {message !== null && <Small>{message}</Small>}
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
    </ScreenScroll>
  );
}
