// Settings (spec §1.3, S1 board): the account (a guest, or saved with Google since M5), sync status, the
// not-medical-advice line and the version. M6c: Training under Game. M7b: Your game (voice, the day's end, minutes,
// difficulty), Delete my character, and the sign-in-lost card. M7c: the Accountability Pact under Game. M7d: the
// Notifications section (S1). M9b: About opens Your data and privacy; the update card in Sync. M10b: the Haptics switch
// under Your game. M10c: places are rows with what's set now (Daily plan, Training, the Pact, Notifications, privacy);
// Delete my character moves to the end, under its own heading. M17 (UX audit 2026-10-20, O4): grouped cards (Your
// plan, Accountability, Look and feel, LevelMeUp Plus, Account, Sync, About), each a card of rows; the sync is one row
// with Sync now beside it, and "N waiting" shows only while something waits.
import {
  ABOUT_TEXT, ADJUST_TEXT, GOOGLE_ERRORS, NOTIFY_TEXT, PACT_TEXT, PLUS_TEXT, PRIVACY_TEXT, SETTINGS_TEXT, VOICE_NAMES, fillText,
} from '@levelmeup/content';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pactName, pactStartsNext } from '../game/pact.ts';
import { clockLabel } from '../lib/dates.ts';
import type { Permission } from '../notify/types.ts';
import { canManage, plusOf, shownFrame, shownTheme, statusLine } from '../plus/plus.ts';
import { manageUrl } from '../plus/purchases.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { LinkButton } from '../ui/LinkButton.tsx';
import { Group, GroupBody } from '../ui/Group.tsx';
import { Bone, Skeleton } from '../ui/Skeleton.tsx';
import { RowLink } from '../ui/RowLink.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Meta, Small } from '../ui/Text.tsx';
import { Toggle } from '../ui/Toggle.tsx';
import { SignInLost } from './SignInLost.tsx';
import { lastSynced, syncMark } from './syncLine.ts';
import { UpdateNeeded } from './UpdateNeeded.tsx';
import { TopBar } from '../ui/TopBar.tsx';

export type SettingsProps = {
  onBack: () => void; onDeveloper?: () => void; onTraining: () => void; onGame: () => void; onDelete: () => void; version: string;
  deviceZone: string; onPact?: () => void; onNotifications?: () => void;
  /** M9b decision 6: About → Your data and privacy. */
  onPrivacy?: () => void;
  /** M13: the Plus offer, and Your look (colours and the portrait frame). */
  onPlus?: () => void;
  onLook?: () => void;
};

/** "7:30 AM", "Off", or "Off in your phone's settings" (S1 board's rows). */
function notifyLine(slot: { on: boolean; minutes: number }, permission: Permission): string {
  if (permission === 'denied') return NOTIFY_TEXT.blocked;
  return permission === 'granted' && slot.on ? clockLabel(slot.minutes) : NOTIFY_TEXT.off;
}

export function Settings({
  onBack, onDeveloper, onTraining, onGame, onDelete, version, deviceZone, onPact, onNotifications, onPrivacy, onPlus, onLook,
}: SettingsProps) {
  const view = useGame((s) => s.view);
  const plus = plusOf(view);
  const theme = useGame((s) => shownTheme(s.theme, plusOf(s.view)));
  const restorePlus = useGame((s) => s.restorePlus);
  const [restoring, setRestoring] = useState(false);
  const [plusNote, setPlusNote] = useState<string | null>(null);
  const restore = async () => {
    setRestoring(true);
    setPlusNote(null);
    const outcome = await restorePlus();
    setRestoring(false);
    const words: Partial<Record<typeof outcome, string>> = {
      on: PLUS_TEXT.restored, none: PLUS_TEXT.nothingToRestore, not_set_up: PLUS_TEXT.notSetUp, server_late: PLUS_TEXT.serverLate,
      failed: PLUS_TEXT.restoreFailed, // premium pass B7: a restore that couldn't ask, not "can't be bought"
    };
    setPlusNote(words[outcome] ?? null);
  };
  const frame = useGame((s) => shownFrame(s.frame, plusOf(s.view)));
  const notify = useGame((s) => s.notify);
  const permission = useGame((s) => s.permission);
  const haptics = useGame((s) => s.haptics);
  const setHaptics = useGame((s) => s.setHaptics);
  const sounds = useGame((s) => s.sounds);
  const setSounds = useGame((s) => s.setSounds);
  const slotLine = (slot: { on: boolean; minutes: number }) => notifyLine(slot, permission);
  const account = useGame((s) => s.account);
  /** Premium pass B5: Sync now says it is working, then the time above it changes. */
  const syncing = useGame((s) => s.status === 'syncing');
  // M17 (review): until the phone has read who is signed in, the card waits rather than calling a saved player a guest.
  const accountKnown = useGame((s) => s.accountKnown);
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
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: space.gutter, gap: 28 }}>
      <TopBar title={'Settings'} onBack={onBack} />

      <Group title={SETTINGS_TEXT.groups.plan} note={onNotifications !== undefined ? <Meta>{NOTIFY_TEXT.eveningNote}</Meta> : undefined}>
        <RowLink
          flat
          label={SETTINGS_TEXT.game.open}
          line={view === null ? undefined : fillText(SETTINGS_TEXT.game.row, {
            voice: VOICE_NAMES[view.profile.voice], time: clockLabel(view.profile.boundaryMinutes), minutes: view.profile.minutesPerDay,
          })}
          onPress={onGame}
        />
        {/* M17 (design critique): what's set now, as the rows around it say. */}
        <RowLink flat label={ADJUST_TEXT.training.open} onPress={onTraining}
          line={view === null ? undefined : (view.profile.trainingPlan ?? 'build') === 'weekly'
            ? `${ADJUST_TEXT.training.plans.weekly.name} · ${ADJUST_TEXT.training.dayChoices[view.profile.programDays === 2 ? 2 : 3].name}`
            : ADJUST_TEXT.training.plans.build.name} />
        {onNotifications !== undefined && (
          <RowLink
            flat
            label={NOTIFY_TEXT.open}
            line={`${NOTIFY_TEXT.briefing} · ${slotLine(notify.briefing)}\n${NOTIFY_TEXT.evening} · ${slotLine(notify.evening)}`}
            onPress={onNotifications}
          />
        )}
      </Group>

      {view !== null && onPact !== undefined && (
        <Group title={SETTINGS_TEXT.groups.accountability} note={pactStartsNext(view) ? <Small>{PACT_TEXT.startsNext}</Small> : undefined}>
          <RowLink flat label={PACT_TEXT.settings} line={pactName(view.profile.accountabilityLevel)} onPress={onPact} />
        </Group>
      )}

      {/* M10b: kept on the phone and applied at once, so not inside Your game, whose Save goes to the server. */}
      <Group title={SETTINGS_TEXT.groups.feel}>
        {view !== null && onPlus !== undefined && onLook !== undefined && (
          <RowLink flat label={PLUS_TEXT.settings.look} line={`${PLUS_TEXT.themes[theme].name} · ${PLUS_TEXT.frames[frame]}`} onPress={onLook} />
        )}
        <Toggle flat label={SETTINGS_TEXT.haptics.label} line={SETTINGS_TEXT.haptics.line} value={haptics} onChange={(on) => void setHaptics(on)} />
        <Toggle flat label={SETTINGS_TEXT.sounds.label} line={SETTINGS_TEXT.sounds.line} value={sounds} onChange={(on) => void setSounds(on)} />
      </Group>

      {view !== null && onPlus !== undefined && onLook !== undefined && (
        <Group title={PLUS_TEXT.settings.section}>
          <GroupBody>
            <Body weight="bold">{statusLine(plus, zone)}</Body>
            {!plus.active && <Button label={PLUS_TEXT.settings.see} variant="secondary" onPress={onPlus} />}
            {canManage(plus) && (
              <Button label={PLUS_TEXT.settings.manage} variant="secondary" onPress={() => void Linking.openURL(manageUrl(plus.product)).catch(() => {})} />
            )}
            {plus.source !== 'beta_founder' && (
              <LinkButton label={restoring ? PLUS_TEXT.restoring : PLUS_TEXT.restore} tone="accentText" disabled={restoring} onPress={() => void restore()} />
            )}
            {plusNote !== null && <View accessibilityLiveRegion="polite"><Small>{plusNote}</Small></View>}
          </GroupBody>
        </Group>
      )}

      <Group title="Account" note={signInLost ? <SignInLost /> : undefined}>
        <GroupBody>
          {!accountKnown ? (
            <Skeleton><Bone height={16} width="50%" /><Bone height={12} width="80%" /></Skeleton>
          ) : account.kind === 'saved' ? (
            <>
              <Body weight="bold">Saved with Google.</Body>
              {account.email !== null && <Small>{account.email}</Small>}
              <Small>A new phone can sign in with Google and pick up where you left off.</Small>
            </>
          ) : (
            <>
              <Body weight="bold">Playing as a guest.</Body>
              <Small>For now, only this phone can reach your character. Save it with Google so a new or lost phone costs you nothing.</Small>
              <Button label="Save with Google" variant="secondary" disabled={account.kind !== 'guest'} busy={saving} busyLabel={SETTINGS_TEXT.busy.saving} onPress={() => void save()} />
              {note !== null && <View accessibilityLiveRegion="polite"><Small>{note}</Small></View>}
            </>
          )}
        </GroupBody>
      </Group>

      <View style={{ gap: 10 }}>
        {updateRequired && <UpdateNeeded />}
        <Group title="Sync">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, rowGap: 8, padding: 16 }}>
            <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: 2 }}>
              <Body weight="bold">{lastSynced(lastSyncedAt, zone)}</Body>
              {waiting > 0 && <Meta>{`${waiting} waiting`}</Meta>}
              {/* Premium pass B5: while it syncs, Sync now says so; the line under the time would say it twice. */}
              {mark !== null && !syncing && <Meta>{mark}</Meta>}
              {/* M12 (audit 23): plain words, never the server's code. */}
              {error !== null && <Small>The last sync didn't go through. Sync now tries again.</Small>}
            </View>
            <Button label="Sync now" variant="secondary" busy={syncing} busyLabel={SETTINGS_TEXT.busy.syncing} onPress={() => void syncNow()} />
          </View>
        </Group>
      </View>

      <Group title="About">
        <GroupBody>
          <Small>{ABOUT_TEXT.notMedical}</Small>
          <Meta>{`Version ${version}`}</Meta>
        </GroupBody>
        {onPrivacy !== undefined && <RowLink flat label={PRIVACY_TEXT.open} onPress={onPrivacy} />}
      </Group>

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
