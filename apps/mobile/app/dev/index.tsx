// Developer screen (development builds only; M4 plan decision 11): a test character on the live project, sample
// completions through the real outbox, the outbox and notices, the self-check and the kit.
import { authoredTemplate } from '@levelmeup/content';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { samplePayload } from '../../src/dev/samplePayload.ts';
import { testChoices } from '../../src/dev/testCharacter.ts';
import { deviceZone } from '../../src/state/appStore.ts';
import { useGame } from '../../src/state/store.ts';
import { colors, fonts, space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { NightCard } from '../../src/ui/NightCard.tsx';
import { SectionTitle } from '../../src/ui/SectionTitle.tsx';
import { Body, Meta, Small, Title } from '../../src/ui/Text.tsx';

export default function Developer() {
  const insets = useSafeAreaInsets();
  const phase = useGame((s) => s.phase);
  const view = useGame((s) => s.view);
  const pending = useGame((s) => s.pending);
  const notices = useGame((s) => s.notices);
  const status = useGame((s) => s.status);
  const enqueue = useGame((s) => s.enqueue);
  const startTestCharacter = useGame((s) => s.startTestCharacter);
  const deleteTestCharacter = useGame((s) => s.deleteTestCharacter);
  const startOver = useGame((s) => s.startOver);
  const error = useGame((s) => s.error);
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

  const today = view?.today ?? null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.night }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
      <Title>Developer</Title>
      <Small>{`Phase ${phase} · sync ${status} · ${pending.length} waiting · zone ${deviceZone()}`}</Small>
      {message !== null && <Body weight="bold">{message}</Body>}

      <SectionTitle title="Test character" />
      {phase !== 'ready' ? (
        <Button
          label="Start a test character"
          disabled={busy}
          onPress={() =>
            void act(async () => {
              const r = await startTestCharacter(testChoices(deviceZone()));
              return r.ok ? `Started. The reveal was written by ${r.source === 'claude' ? 'Claude' : 'the template'}.` : `Not started: ${r.code}`;
            })
          }
        />
      ) : (
        today?.quests.map((q) => (
          <NightCard key={q.id} quiet={q.completedAt !== null}>
            <Body weight="bold">{`${q.slot}: ${authoredTemplate(q.templateId).name}`}</Body>
            <Meta>{`${q.completion} · ${q.completedAt === null ? 'open' : `cleared, rating ${q.rating ?? 'none'}`}${view!.waiting.has(q.id) ? ' · will sync' : ''}`}</Meta>
            {q.completedAt === null ? (
              <Button
                label="Complete (sample)"
                variant="secondary"
                onPress={() => void act(async () => (await enqueue({ type: 'complete', instanceId: q.id, completedAt: Date.now(), rating: null, payload: samplePayload(q, today, Date.now()) }), 'Queued.'))}
              />
            ) : (
              <View style={{ gap: 8 }}>
                <Button label="Undo" variant="secondary" onPress={() => void act(async () => (await enqueue({ type: 'undo', instanceId: q.id }), 'Queued.'))} />
                <Button label="Rate easy" variant="secondary" onPress={() => void act(async () => (await enqueue({ type: 'rate', instanceId: q.id, rating: 'easy' }), 'Queued.'))} />
              </View>
            )}
          </NightCard>
        ))
      )}

      <SectionTitle title="Outbox and notices" />
      {pending.length === 0 ? <Meta>Nothing waiting.</Meta> : pending.map((e) => <Meta key={e.id}>{`${e.type} → quest ${e.instanceId}`}</Meta>)}
      {notices.map((n) => (
        <Meta key={n.eventId}>{`Refused: ${n.code}`}</Meta>
      ))}

      {error !== null && (
        <>
          <Small>{error}</Small>
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
                const r = await deleteTestCharacter();
                setConfirm('');
                return r.ok ? 'Deleted. A new guest sign-in starts on the next sync.' : `Not deleted: ${r.code}`;
              })
            }
          />
        </>
      )}
    </ScrollView>
  );
}
