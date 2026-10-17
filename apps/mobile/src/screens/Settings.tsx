// Settings (spec §1.3, S1 board): the account (a guest, or saved with Google since M5), sync status, the
// not-medical-advice line and the version. M6c: Training under Game. M7b: Your game (voice, the day's end, minutes,
// difficulty), Delete my character, and the sign-in-lost card. M7c: the Accountability Pact under Game. M7d: the
// Notifications section (S1). M9b: About opens Your data and privacy; the update card in Sync. M10b: the Haptics switch
// under Your game. M10c: places are rows with what's set now (Daily plan, Training, the Pact, Notifications, privacy);
// Delete my character moves to the end, under its own heading.
import {
  ABOUT_TEXT, ADJUST_TEXT, GOOGLE_ERRORS, NOTIFY_TEXT, PACT_TEXT, PRIVACY_TEXT, SETTINGS_TEXT, VOICE_NAMES, fillText,
} from '@levelmeup/content';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pactName, pactStartsNext } from '../game/pact.ts';
import { clockLabel } from '../lib/dates.ts';
import type { Permission } from '../notify/types.ts';
import { useGame } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { RowLink } from '../ui/RowLink.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Label, Meta, Small, Title } from '../ui/Text.tsx';
import { Toggle } from '../ui/Toggle.tsx';
import { SignInLost } from './SignInLost.tsx';
import { lastSynced, syncMark } from './syncLine.ts';
import { UpdateNeeded } from './UpdateNeeded.tsx';

export type SettingsProps = {
  onBack: () => void; onDeveloper?: () => void; onTraining: () => void; onGame: () => void; onDelete: () => void; version: string;
  deviceZone: string; onPact?: () => void; onNotifications?: () => void;
  /** M9b decision 6: About → Your data and privacy. */
  onPrivacy?: () => void;
};

/** "7:30 AM", "Off", or "Off in your phone's settings" (S1 board's rows). */
function notifyLine(slot: { on: boolean; minutes: number }, permission: Permission): string {
  if (permission === 'denied') return NOTIFY_TEXT.blocked;
  return permission === 'granted' && slot.on ? clockLabel(slot.minutes) : NOTIFY_TEXT.off;
}

export function Settings({ onBack, onDeveloper, onTraining, onGame, onDelete, version, deviceZone, onPact, onNotifications, onPrivacy }: SettingsProps) {
  const view = useGame((s) => s.view);
  const notify = useGame((s) => s.notify);
  const permission = useGame((s) => s.permission);
  const haptics = useGame((s) => s.haptics);
  const setHaptics = useGame((s) => s.setHaptics);
  const slotLine = (slot: { on: boolean; minutes: number }) => notifyLine(slot, permission);
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
  const updateRequired = useGame((s) => s.updateRequired);
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
          style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: space.border, borderColor: colors.line }}
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
      </View>

      <View style={{ gap: 12 }}>
        <SectionTitle title="Game" />
        <RowLink
          label={SETTINGS_TEXT.game.open}
          line={view === null ? undefined : fillText(SETTINGS_TEXT.game.row, {
            voice: VOICE_NAMES[view.profile.voice], time: clockLabel(view.profile.boundaryMinutes), minutes: view.profile.minutesPerDay,
          })}
          onPress={onGame}
        />
        {/* M10b: kept on the phone and applied at once, so not inside Your game, whose Save goes to the server. */}
        <Toggle label={SETTINGS_TEXT.haptics.label} line={SETTINGS_TEXT.haptics.line} value={haptics} onChange={(on) => void setHaptics(on)} />
        <RowLink label={ADJUST_TEXT.training.open} onPress={onTraining} />
        {view !== null && onPact !== undefined && (
          <>
            <RowLink label={PACT_TEXT.settings} line={pactName(view.profile.accountabilityLevel)} onPress={onPact} />
            {pactStartsNext(view) && <Small>{PACT_TEXT.startsNext}</Small>}
          </>
        )}
      </View>

      {onNotifications !== undefined && (
        <View style={{ gap: 12 }}>
          <SectionTitle title={NOTIFY_TEXT.section} />
          <RowLink
            label={NOTIFY_TEXT.open}
            line={`${NOTIFY_TEXT.briefing} · ${slotLine(notify.briefing)}\n${NOTIFY_TEXT.evening} · ${slotLine(notify.evening)}`}
            onPress={onNotifications}
          />
          <Meta>{NOTIFY_TEXT.eveningNote}</Meta>
        </View>
      )}

      <View style={{ gap: 12 }}>
        <SectionTitle title="Sync" />
        {updateRequired && <UpdateNeeded />}
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
        <Small>{ABOUT_TEXT.notMedical}</Small>
        <Meta>{`Version ${version}`}</Meta>
        {onPrivacy !== undefined && <RowLink label={PRIVACY_TEXT.open} onPress={onPrivacy} />}
      </View>

      {phase === 'ready' && !signInLost && (
        <View style={{ gap: 12 }}>
          <SectionTitle title={SETTINGS_TEXT.account.section} />
          <Button label={SETTINGS_TEXT.account.delete} variant="secondary" onPress={onDelete} />
        </View>
      )}

      {onDeveloper !== undefined && <RowLink label="Developer" onPress={onDeveloper} />}
    </ScreenScroll>
  );
}
