// The Accountability Pact (spec §4.3, board F5; M7c decisions 3, 10): the three levels in full, a preview of the Shadow,
// the five rules, then hold to sign a higher level (it starts with the next quest day) or one tap for a lower one (at
// once, today included). From Settings it sends `accountability_set`; from the reveal it keeps the level in the
// onboarding draft, sent when the onboarding ends.
import { FEEDBACK_TEXT, PACT_TEXT, SHADOW_LINES, fillText } from '@levelmeup/content';
import { ACCOUNTABILITY_LEVELS } from '@levelmeup/rules';
import type { AccountabilityLevel } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { asLevel, pactStartsNext } from '../game/pact.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { HoldButton } from '../ui/HoldButton.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { SaveFailed } from '../ui/SaveFailed.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { toast } from '../ui/toast.ts';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { Panel } from '../ui/Panel.tsx';
import { Body, Label, Small } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';

const T = PACT_TEXT;

export type PactProps = {
  /** `game`: Settings (sends the change); `draft`: the reveal (keeps it in the onboarding draft). */
  mode: 'game' | 'draft';
  onDone: () => void;
  /** Overrides the phone's setting for the hold button (tests). */
  screenReader?: boolean;
};

export function Pact({ mode, onDone, screenReader }: PactProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const enqueue = useGame((s) => s.enqueue);
  const current: AccountabilityLevel = mode === 'draft' ? (draft.pact ?? 0) : asLevel(view?.profile.accountabilityLevel ?? 0);
  const [choice, setChoice] = useState<AccountabilityLevel>(current === 0 ? 1 : current);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Premium pass A7: the phone couldn't save it. */
  const [failed, setFailed] = useState(false);
  const startsNext = mode === 'game' && view !== null && pactStartsNext(view);

  const commit = async (level: AccountabilityLevel): Promise<void> => {
    if (busy) return;
    if (mode === 'draft') {
      editDraft({ pact: level === 0 ? null : level });
      onDone();
      return;
    }
    setBusy(true);
    setFailed(false);
    leave();
    try {
      await enqueue({ type: 'accountability_set', level });
    } catch {
      stay();
      setBusy(false);
      setFailed(true);
      return;
    }
    onDone();
    // Premium pass B1: on, at a new level, or off, and from when.
    toast(level === 0 ? FEEDBACK_TEXT.pactOff : fillText(level > current ? FEEDBACK_TEXT.pactOn : FEEDBACK_TEXT.pactLevel, { level }));
  };

  let action;
  if (choice > current) {
    action = (
      <>
        <HoldButton
          label={fillText(T.sign, { level: choice })}
          tapLabel={fillText(T.signTap, { level: choice })}
          confirmLabel={fillText(T.signConfirm, { level: choice })}
          disabled={busy}
          screenReader={screenReader}
          onDone={() => void commit(choice)}
        />
        <Small tone="chalk">{T.signNote}</Small>
      </>
    );
  } else if (choice < current) {
    action = (
      <>
        <Button label={choice === 0 ? T.off : fillText(T.lower, { level: choice })} variant="secondary" disabled={busy} onPress={() => void commit(choice)} />
        <Small tone="chalk">{T.lowerNote}</Small>
      </>
    );
  } else {
    action = <Small tone="chalk">{startsNext ? `${T.current} ${T.startsNext}` : T.current}</Small>;
  }

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      {/* M17 (UX audit, old finding 10): Back like every other screen, not only "Not now" at the very end. */}
      <TopBar title={T.title} onBack={onDone} disabled={busy} />
      <NarrationBox>{T.lead}</NarrationBox>
      <View style={{ gap: 10 }}>
        <Label>{T.choose}</Label>
        {ACCOUNTABILITY_LEVELS.map((level) => (
          <View key={level} style={{ gap: 8 }}>
            <OptionCard label={T.levels[level].name} detail={T.levels[level].line} selected={choice === level} onPress={() => setChoice(level)} />
            {level === 1 && (
              <Button label={preview ? T.hidePreview : T.preview} variant="secondary" onPress={() => setPreview((p) => !p)} style={{ alignSelf: 'flex-start' }} />
            )}
            {level === 1 && preview && <ShadowBox lines={[SHADOW_LINES.claim[0]!, SHADOW_LINES.mark[0]!]} />}
          </View>
        ))}
      </View>
      <Panel contentStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
        <Label tone="accentInk">{T.rulesTitle}</Label>
        {T.rules.map((rule, i) => <Body key={rule} tone="ink">{`${i + 1}. ${rule}`}</Body>)}
      </Panel>
      {action}
      <SaveFailed shown={failed} />
      <Button label={T.notNow} variant="secondary" onPress={onDone} />
    </ScreenScroll>
  );
}
