// The swap sheet (spec §3.5, visual design §4.2; M6b decision 3): pick an open quest (from Today) or start from one (its
// quest screen), then one of the options the server offered for its slot. The count says how many swaps are left today.
import { ADJUST_TEXT, PLAY_TEXT, STAT_NAMES, authoredTemplate, fillText, questSummary } from '@levelmeup/content';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuestFields } from '../../../../supabase/functions/_shared/state.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label, Title } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';

const T = ADJUST_TEXT.swap;

export type SwapProps = { questId: number | null; onDone: () => void; onBack: () => void; now?: () => number };

export function Swap({ questId, onDone, onBack, now = Date.now }: SwapProps) {
  const insets = useSafeAreaInsets();
  const [view, leave] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const today = view?.today ?? null;
  const swappable = (today?.quests ?? []).filter((q) => q.completedAt === null && q.swaps.length > 0);
  const [picked, setPicked] = useState<number | null>(questId ?? (swappable.length === 1 ? swappable[0]!.id : null));
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 18 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      {children}
    </ScreenScroll>
  );
  const open = today !== null && today.endsAt !== null && Date.parse(today.endsAt) > now();
  if (view === null || today === null || !open || today.swapsLeft === 0 || swappable.length === 0) {
    return frame(<NarrationBox>{T.none}</NarrationBox>);
  }
  const quest = swappable.find((q) => q.id === picked) ?? null;
  const card = (f: QuestFields) => {
    const t = authoredTemplate(f.templateId);
    const xp = Object.values(f.xp).reduce((sum, x) => sum + (x ?? 0), 0);
    return { label: t.voice[view.profile.voice].title, detail: `${questSummary(t, f.hardDay)} · ${STAT_NAMES[f.stat]} · +${xp} XP` };
  };
  const send = async (): Promise<void> => {
    if (quest === null || choice === null || busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'swap', instanceId: quest.id, templateId: choice });
    } catch {
      setBusy(false);
      return;
    }
    onDone();
  };

  return frame(
    <>
      <Title>{T.title}</Title>
      <Body>{fillText(T.lead, { left: today.swapsLeft })}</Body>
      {quest === null ? (
        <View style={{ gap: 10 }}>
          <Label>{T.which}</Label>
          {swappable.map((q) => <OptionCard key={q.id} {...card(q)} selected={false} onPress={() => setPicked(q.id)} />)}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Label>{T.current}</Label>
          <Body weight="bold">{card(quest).label}</Body>
          <Label>{T.options}</Label>
          {quest.swaps.map((o) => (
            <OptionCard key={o.templateId} {...card(o)} selected={choice === o.templateId} onPress={() => setChoice(o.templateId)} />
          ))}
          <Button label={T.choose} disabled={choice === null || busy} onPress={() => void send()} />
        </View>
      )}
    </>,
  );
}
