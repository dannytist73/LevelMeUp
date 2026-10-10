// Settings (spec §1.3, S1 board), M4's version: the guest account line, sync status, the not-medical-advice line and the
// version. Game settings, notifications, the Pact, saving the character and deletion arrive in M5–M7.
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Label, Meta, Small, Title } from '../ui/Text.tsx';
import { lastSynced, syncMark } from './syncLine.ts';

export type SettingsProps = { onBack: () => void; onDeveloper?: () => void; version: string; deviceZone: string };

export function Settings({ onBack, onDeveloper, version, deviceZone }: SettingsProps) {
  const insets = useSafeAreaInsets();
  const lastSyncedAt = useGame((s) => s.lastSyncedAt);
  const waiting = useGame((s) => s.pending.length);
  const status = useGame((s) => s.status);
  const error = useGame((s) => s.error);
  const syncNow = useGame((s) => s.syncNow);
  const zone = useGame((s) => s.view?.profile.timeZone) ?? deviceZone;
  const mark = syncMark(status);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.night }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 2, borderColor: colors.chalk }}
        >
          <Label tone="chalk">Back</Label>
        </Pressable>
        <Title>Settings</Title>
      </View>

      <View style={{ gap: 12 }}>
        <SectionTitle title="Account" />
        <NightCard>
          <Body weight="bold">Playing as a guest.</Body>
          <Small>Your character lives on the server under a guest sign-in on this phone.</Small>
        </NightCard>
      </View>

      <View style={{ gap: 12 }}>
        <SectionTitle title="Sync" />
        <NightCard>
          <Body>{lastSynced(lastSyncedAt, zone)}</Body>
          <Meta>{`${waiting} waiting`}</Meta>
          {mark !== null && <Meta>{mark}</Meta>}
          {error !== null && <Small>{error}</Small>}
          <Button label="Sync now" variant="secondary" onPress={() => void syncNow()} />
        </NightCard>
      </View>

      <View style={{ gap: 12 }}>
        <SectionTitle title="About" />
        <Small>LevelMeUp is not medical advice.</Small>
        <Meta>{`Version ${version}`}</Meta>
      </View>

      {onDeveloper !== undefined && <Button label="Developer" variant="secondary" onPress={onDeveloper} />}
    </ScrollView>
  );
}
