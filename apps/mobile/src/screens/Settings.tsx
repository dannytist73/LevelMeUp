// Settings (spec §1.3, S1 board): the account (a guest, or saved with Google since M5), sync status, the
// not-medical-advice line and the version. M6c: Training under Game. M7b: Your game (voice, the day's end, minutes,
// difficulty), Delete my character, and the sign-in-lost card; notifications (M7d) and the Pact (M7c) come later.
import { ADJUST_TEXT, GOOGLE_ERRORS, SETTINGS_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Label, Meta, Small, Title } from '../ui/Text.tsx';
import { SignInLost } from './SignInLost.tsx';
import { lastSynced, syncMark } from './syncLine.ts';

export type SettingsProps = {
  onBack: () => void; onDeveloper?: () => void; onTraining: () => void; onGame: () => void; onDelete: () => void; version: string;
  deviceZone: string;
};

export function Settings({ onBack, onDeveloper, onTraining, onGame, onDelete, version, deviceZone }: SettingsProps) {
  const account = useGame((s) => s.account);
  const phase = useGame((s) => s.phase);
  const signInLost = useGame((s) => s.signInLost);
  const saveWithGoogle = useGame((s) => s.saveWithGoogle);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const save = async () => {
    setSaving(true);
    setNote(null);
    const result = await saveWithGoogle();
    setSaving(false);
    if (!result.ok) setNote(GOOGLE_ERRORS[result.code]);
  };
  const insets = useSafeAreaInsets();
  const lastSyncedAt = useGame((s) => s.lastSyncedAt);
  const waiting = useGame((s) => s.pending.length);
  const status = useGame((s) => s.status);
  const error = useGame((s) => s.error);
  const syncNow = useGame((s) => s.syncNow);
  const zone = useGame((s) => s.view?.profile.timeZone) ?? deviceZone;
  const mark = syncMark(status);

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 24 }}>
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
          {account.kind === 'saved' ? (
            <>
              <Body weight="bold">Saved with Google.</Body>
              {account.email !== null && <Small>{account.email}</Small>}
              <Small>A new phone can sign in with Google and pick up where you left off.</Small>
            </>
          ) : (
            <>
              <Body weight="bold">Playing as a guest.</Body>
              <Small>For now, only this phone can reach your character. Save it with Google so a new or lost phone costs you nothing.</Small>
              <Button label="Save with Google" variant="secondary" disabled={saving || account.kind !== 'guest'} onPress={() => void save()} />
              {note !== null && <View accessibilityLiveRegion="polite"><Small>{note}</Small></View>}
            </>
          )}
        </NightCard>
        {signInLost && <SignInLost />}
        {phase === 'ready' && !signInLost && <Button label={SETTINGS_TEXT.account.delete} variant="secondary" onPress={onDelete} />}
      </View>

      <View style={{ gap: 12 }}>
        <SectionTitle title="Game" />
        <Button label={SETTINGS_TEXT.game.open} variant="secondary" onPress={onGame} />
        <Button label={ADJUST_TEXT.training.open} variant="secondary" onPress={onTraining} />
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
    </ScreenScroll>
  );
}
