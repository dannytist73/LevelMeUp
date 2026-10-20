// The swap sheet (spec §3.5, visual design §4.2; M6b decision 3): pick an open quest (from Today) or start from one (its
// quest screen), then one of the options the server offered for its slot. The count says how many swaps are left today.
import { ADJUST_TEXT, FEEDBACK_TEXT, STAT_NAMES, authoredTemplate, fillText, questSummary } from '@levelmeup/content';
import { swapLimit } from '@levelmeup/rules';
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
import { SaveFailed } from '../ui/SaveFailed.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';
import { TopBar } from '../ui/TopBar.tsx';
import { toast } from '../ui/toast.ts';

const T = ADJUST_TEXT.swap;

export type SwapProps = { questId: number | null; onDone: () => void; onBack: () => void; now?: () => number };

export function Swap({ questId, onDone, onBack, now = Date.now }: SwapProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const today = view?.today ?? null;
  const swappable = (today?.quests ?? []).filter((q) => q.completedAt === null && q.swaps.length > 0);
  const [picked, setPicked] = useState<number | null>(questId ?? (swappable.length === 1 ? swappable[0]!.id : null));
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Premium pass A7: the phone couldn't save the swap. */
  const [failed, setFailed] = useState(false);

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 18 }}>
      <TopBar title={T.title} onBack={onBack} />
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
    return { label: t.voice[view.profile.voice].title, detail: `${questSummary(f)} · ${STAT_NAMES[f.stat]} · +${xp} XP` };
  };
  const send = async (): Promise<void> => {
    if (quest === null || choice === null || busy) return;
    setBusy(true);
    setFailed(false);
    leave();
    try {
      await enqueue({ type: 'swap', instanceId: quest.id, templateId: choice });
    } catch {
      stay();
      setBusy(false);
      setFailed(true);
      return;
    }
    onDone();
    // Premium pass B1: the swap says it worked, on the screen the player lands on.
    toast(fillText(FEEDBACK_TEXT.swapped, { title: authoredTemplate(choice).voice[view.profile.voice].title }));
  };

  return frame(
    <>
      <Body>{fillText(T.lead, { left: today.swapsLeft, total: swapLimit(view.profile.classId, view.character.level) })}</Body>
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
          <SaveFailed shown={failed} />
        </View>
      )}
    </>,
  );
}
