// Developer screen (development builds only; M4 plan decision 11): a test character on the live project,
// the outbox and notices, the self-check and the kit. Quests are logged from Today since M6a.
import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deviceZone } from '../../state/appStore.ts';
import { useGame } from '../../state/store.ts';
import { colors, fonts, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SectionTitle } from '../../ui/SectionTitle.tsx';
import { Body, Meta, Small, Title } from '../../ui/Text.tsx';

export default function Developer() {
  const insets = useSafeAreaInsets();
  const phase = useGame((s) => s.phase);
  const pending = useGame((s) => s.pending);
  const notices = useGame((s) => s.notices);
  const status = useGame((s) => s.status);
  const deleteCharacter = useGame((s) => s.deleteCharacter);
  const startOver = useGame((s) => s.startOver);
  const signInLost = useGame((s) => s.signInLost);
  const account = useGame((s) => s.account);
  const saveWithGoogle = useGame((s) => s.saveWithGoogle);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (work: () => Promise<string>) => {
    setBusy(true);
    try {
      setMessage(await work());
    } catch (e) {
      setMessage(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
      <Title>Developer</Title>
      <Small>{`Phase ${phase} · sync ${status} · ${pending.length} waiting · zone ${deviceZone()} · ${account.kind}${account.kind === 'saved' && account.email !== null ? ` ${account.email}` : ''}`}</Small>
      {message !== null && <Body weight="bold">{message}</Body>}

      <SectionTitle title="Account" />
      <Button
        label="Save with Google"
        variant="secondary"
        disabled={busy || account.kind !== 'guest'}
        onPress={() => void act(async () => {
          const r = await saveWithGoogle();
          return r.ok ? 'Saved with Google.' : `Not saved: ${r.code}`;
        })}
      />

      <SectionTitle title="Outbox and notices" />
      {pending.length === 0 ? <Meta>Nothing waiting.</Meta> : pending.map((e) => <Meta key={e.id}>{'instanceId' in e ? `${e.type} → quest ${e.instanceId}` : e.type}</Meta>)}
      {notices.map((n) => (
        <Meta key={n.eventId}>{`Refused: ${n.code}`}</Meta>
      ))}

      {signInLost && (
        <>
          <Small>The guest sign-in on this phone is gone.</Small>
          <Button
            label="Start over as a new guest"
            variant="secondary"
            disabled={busy}
            onPress={() => void act(async () => (await startOver(), 'Started over. A new guest signs in on the next sync.'))}
          />
        </>
      )}

      <SectionTitle title="Checks" />
      <Button label="Self-check" variant="secondary" onPress={() => router.push('/dev/selfcheck')} />
      <Button label="Component kit" variant="secondary" onPress={() => router.push('/dev/kit')} />
      <Button label="Workout preview" variant="secondary" onPress={() => router.push('/dev/workout')} />
      <Button label="Reader sample" variant="secondary" onPress={() => router.push('/dev/reading')} />
      <Button label="Character preview" variant="secondary" onPress={() => router.push('/dev/character')} />
      <Button label="Offline day preview" variant="secondary" onPress={() => router.push('/dev/offline')} />
      <Button label="Check-in preview" variant="secondary" onPress={() => router.push('/dev/checkin')} />
      <Button label="Shadow preview" variant="secondary" onPress={() => router.push('/dev/shadow')} />
      <Button label="Portraits" variant="secondary" onPress={() => router.push('/dev/portraits')} />
      <Button label="Notifications" variant="secondary" onPress={() => router.push('/dev/notify')} />

      {phase === 'ready' && (
        <>
          <SectionTitle title="Delete the test character" />
          <Small>Deletes the character and its guest sign-in on the live project. Type DELETE to confirm.</Small>
          <TextInput
            accessibilityLabel="Type DELETE to confirm"
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="characters"
            style={{ minHeight: 48, borderWidth: 2, borderColor: colors.chalk, color: colors.chalk, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 16 }}
          />
          <Button
            label="Delete the test character"
            variant="secondary"
            disabled={confirm !== 'DELETE' || busy}
            onPress={() =>
              void act(async () => {
                const r = await deleteCharacter();
                setConfirm('');
                return r.ok ? 'Deleted. The onboarding starts again; it makes the next guest at its analysis.' : `Not deleted: ${r.code}`;
              })
            }
          />
        </>
      )}
    </ScreenScroll>
  );
}
