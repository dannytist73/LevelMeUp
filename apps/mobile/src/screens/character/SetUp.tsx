// A simpler day (docs/2026-10-26-simpler-day.md, decision 9): Me's Set up list. What Today's notice strip offered one card
// at a time (save your character, the voice, gear, the slip question, the vow, training, the weekly program, the morning
// briefing, Plus) waits here instead, so Camp asks nothing extra. A row goes where it says, or "Not now" puts it away;
// either way it leaves the list. While anything waits, Me's tab shows a dot.
import { ADJUST_TEXT, CAMP_TEXT, FEEDBACK_TEXT, PLUS_TEXT, SETUP_TEXT, TODAY_TEXT, fillText } from '@levelmeup/content';
import { Linking, View } from 'react-native';
import { setUpItems } from '../../game/setup.ts';
import type { SetUpItem } from '../../game/setup.ts';
import { clockLabel, dateLine } from '../../lib/dates.ts';
import { plusCard, plusOf } from '../../plus/plus.ts';
import { manageUrl, purchasesSetUp } from '../../plus/purchases.ts';
import { useGame } from '../../state/store.ts';
import type { Offer } from '../../state/store.ts';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Icon } from '../../ui/icons.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Body, Heading, Small } from '../../ui/Text.tsx';
import { toast } from '../../ui/toast.ts';

/** What Me's Set up list holds now; empty until the phone knows who is signed in (M17). */
export function useSetUpItems(now: () => number = Date.now): SetUpItem[] {
  const view = useGame((s) => s.view);
  const offers = useGame((s) => s.offers);
  const saved = useGame((s) => s.account.kind === 'saved');
  const accountKnown = useGame((s) => s.accountKnown);
  const vow = useGame((s) => s.vow);
  const trainingNoticeSeen = useGame((s) => s.trainingNoticeSeen);
  const notify = useGame((s) => s.notify);
  const permission = useGame((s) => s.permission);
  if (view === null || !accountKnown) return [];
  const reminder = !offers.includes('reminder') && !(notify.optedIn && notify.briefing.on) && permission !== 'denied' && permission !== 'unknown';
  const plus = plusCard(view, offers, now(), purchasesSetUp()) !== null;
  return setUpItems({ view, offers, saved, vow, trainingNoticeSeen, reminder, plus });
}

export type SetUpGo = {
  onSettings: () => void;
  onGame: () => void;
  onTraining: () => void;
  onSlip: () => void;
  onVow: () => void;
  onPlus: () => void;
};

/** One row: its words and where it goes; "Not now" beside it. */
function SetUpRow({ label, line, onGo, onLater }: { label: string; line: string; onGo: () => void; onLater: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.control, borderWidth: space.border, borderColor: colors.divider, backgroundColor: colors.panel }}>
      <Tap accessibilityRole="button" accessibilityLabel={`${label}. ${line}`} onPress={onGo} radius={radius.control}
        style={{ flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingVertical: 10 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Body weight="bold">{label}</Body>
          <Small>{line}</Small>
        </View>
        <Icon name="chevronRight" size={20} color={colors.ashLight} />
      </Tap>
      <Tap accessibilityRole="button" accessibilityLabel={`${SETUP_TEXT.notNow}: ${label}`} onPress={onLater} radius={radius.pill}
        style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" size={18} color={colors.ash} />
      </Tap>
    </View>
  );
}

export function SetUpList({ go, now = Date.now }: { go: SetUpGo; now?: () => number }) {
  const items = useSetUpItems(now);
  const view = useGame((s) => s.view);
  const offers = useGame((s) => s.offers);
  const notify = useGame((s) => s.notify);
  const permission = useGame((s) => s.permission);
  const markOffer = useGame((s) => s.markOffer);
  const setNotify = useGame((s) => s.setNotify);
  const allowNotify = useGame((s) => s.allowNotify);
  const dismissTrainingNotice = useGame((s) => s.dismissTrainingNotice);
  if (items.length === 0 || view === null) return null;
  const time = clockLabel(notify.briefing.minutes);
  /** M12 decision 9, as Today's offer did it: ask the phone first, then turn the briefing on, and say which way it went. */
  const remind = async (): Promise<void> => {
    const allowed = permission === 'granted' ? 'granted' : await allowNotify();
    if (allowed === 'granted') await setNotify({ ...notify, briefing: { ...notify.briefing, on: true }, optedIn: true });
    toast(allowed === 'granted' ? fillText(FEEDBACK_TEXT.reminderOn, { time }) : FEEDBACK_TEXT.reminderRefused);
  };
  const U = CAMP_TEXT.setUp;
  const plusNote = plusCard(view, offers, now(), purchasesSetUp());
  const plus = plusOf(view);
  const row = (item: SetUpItem): { label: string; line: string; mark: () => void; go: () => void } => {
    const offer = (key: Offer) => () => void markOffer(key);
    switch (item) {
      case 'save': return { label: U.save, line: SETUP_TEXT.save.line, mark: offer('setup:save'), go: go.onSettings };
      case 'voice': return { label: U.voice, line: SETUP_TEXT.voice.line, mark: offer('setup:voice'), go: go.onGame };
      case 'gear': return { label: U.gear, line: SETUP_TEXT.gear.line, mark: offer('setup:gear'), go: go.onTraining };
      case 'slip': return { label: U.slip, line: SETUP_TEXT.slip.line, mark: offer('setup:slip'), go: go.onSlip };
      case 'vow': return { label: U.vow, line: SETUP_TEXT.vow.line, mark: offer('setup:vow'), go: go.onVow };
      case 'training': return { label: U.training, line: ADJUST_TEXT.training.notice, mark: () => void dismissTrainingNotice(), go: go.onTraining };
      case 'program': return { label: U.program, line: ADJUST_TEXT.training.offer, mark: offer('program'), go: go.onTraining };
      case 'reminder':
        return { label: U.reminder, line: fillText(TODAY_TEXT.reminder.line, { time }), mark: offer('reminder'), go: () => void remind() };
      case 'plus':
        return plusNote === 'trial' && plus.endsAt !== null
          ? { label: fillText(PLUS_TEXT.trialCard.title, { date: dateLine(Date.parse(plus.endsAt), view.profile.timeZone) }), line: PLUS_TEXT.trialCard.line,
              mark: offer('plus:trial'), go: () => void Linking.openURL(manageUrl(plus.product)).catch(() => {}) }
          : { label: U.plus, line: PLUS_TEXT.day7.line, mark: offer('plus:day7'), go: go.onPlus };
    }
  };
  return (
    <View testID="set-up" style={{ gap: 10 }}>
      <Heading accessibilityRole="header">{U.title}</Heading>
      {items.map((item) => {
        const r = row(item);
        return <SetUpRow key={item} label={r.label} line={r.line} onGo={() => { r.mark(); r.go(); }} onLater={r.mark} />;
      })}
    </View>
  );
}
