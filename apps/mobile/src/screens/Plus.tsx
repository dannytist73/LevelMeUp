// M13: the LevelMeUp Plus offer (plan docs/superpowers/plans/2026-10-18-m13-plus.md, "What I build" 3; Google Play's
// subscription rules, docs/research/2026-10-18-google-play-policies.md §3). What Plus adds and that the game stays free;
// the plans with Google Play's own prices, the yearly plan as a yearly price; the free trial's timeline; buying and
// "Not now" the same size; that subscriptions renew and how to cancel; Restore, Terms and Privacy. No countdowns, no
// streaks, nothing held over the player.
import { PLUS_TEXT, fillText } from '@levelmeup/content';
import { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { plusOf, statusLine } from '../plus/plus.ts';
import type { Plan, PlanKind, Shop } from '../plus/purchases.ts';
import { useGame } from '../state/store.ts';
import type { PlusOutcome } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { LinkButton } from '../ui/LinkButton.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { StateNote } from '../ui/StateNote.tsx';
import { Body, Heading, Meta, Small } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';

/** The public pages (privacy policy, terms, account deletion): site/ in this repo. */
export const SITE = 'https://levelmeup.dannytist.com';
/** "Day 5" of a 7-day trial: the reminder comes two days before it ends (notify/plan.ts TRIAL_NOTE_BEFORE_MS). */
const REMIND_BEFORE_DAYS = 2;

const OUTCOME: Partial<Record<PlusOutcome, string>> = {
  on: PLUS_TEXT.thanks, pending: PLUS_TEXT.pending, failed: PLUS_TEXT.failed, not_set_up: PLUS_TEXT.notSetUp,
  server_late: PLUS_TEXT.serverLate, none: PLUS_TEXT.nothingToRestore, owned: PLUS_TEXT.owned,
};

function priceLine(plan: Plan): string {
  if (plan.kind === 'yearly' && plan.trialDays !== null) return fillText(PLUS_TEXT.trialLine, { days: plan.trialDays, price: plan.price });
  return fillText(PLUS_TEXT.price[plan.kind], { price: plan.price });
}

function planLabel(plan: Plan): string {
  const name = PLUS_TEXT.plans[plan.kind];
  return plan.kind === 'yearly' && plan.trialDays !== null ? `${name}, ${fillText(PLUS_TEXT.trialBadge, { days: plan.trialDays })}` : name;
}

export type PlusProps = { onClose: () => void };

export function Plus({ onClose }: PlusProps) {
  const plusShop = useGame((s) => s.plusShop);
  const buyPlus = useGame((s) => s.buyPlus);
  const restorePlus = useGame((s) => s.restorePlus);
  const view = useGame((s) => s.view);
  const plus = plusOf(view);
  const zone = view?.profile.timeZone ?? 'UTC';
  const [shop, setShop] = useState<Shop | null>(null);
  const [chosen, setChosen] = useState<PlanKind>('yearly');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setShop(null);
    setShop(await plusShop());
  }, [plusShop]);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (act: () => Promise<PlusOutcome>, restoring: boolean) => {
    setBusy(true);
    setNote(null);
    const outcome = await act();
    setBusy(false);
    setNote(restoring && outcome === 'on' ? PLUS_TEXT.restored : (OUTCOME[outcome] ?? null));
  };

  const plans = shop !== null && shop.ok ? shop.plans : [];
  const plan = plans.find((p) => p.kind === chosen) ?? plans[0];
  const trial = plan !== undefined && plan.kind === 'yearly' ? plan.trialDays : null;
  const open = (path: string) => void Linking.openURL(`${SITE}/${path}`).catch(() => {});

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <TopBar title={PLUS_TEXT.name} onBack={onClose} kind="close" backLabel={PLUS_TEXT.notNow} />
      <Body>{PLUS_TEXT.lead}</Body>

      <NightCard>
        {PLUS_TEXT.adds.map((add) => (
          <View key={add.title} style={{ gap: 2 }}>
            <Body weight="bold">{add.title}</Body>
            <Small>{add.line}</Small>
          </View>
        ))}
      </NightCard>
      <Small>{PLUS_TEXT.free}</Small>

      {plus.active ? (
        <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
          <Heading>{statusLine(plus, zone)}</Heading>
          {note !== null && <Body>{note}</Body>}
          <Button label={PLUS_TEXT.done} onPress={onClose} />
        </View>
      ) : shop === null ? (
        <Meta>{PLUS_TEXT.checking}</Meta>
      ) : !shop.ok ? (
        <View style={{ gap: 12 }}>
          <StateNote
            kind={shop.reason === 'not_set_up' ? 'empty' : 'offline'}
            title={shop.reason === 'not_set_up' ? PLUS_TEXT.notSetUp : PLUS_TEXT.unavailable}
            action={shop.reason === 'not_set_up' ? undefined : { label: PLUS_TEXT.retry, onPress: () => void load() }}
          />
          <Button variant="secondary" label={PLUS_TEXT.notNow} onPress={onClose} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            {plans.map((p) => (
              <OptionCard key={p.kind} label={planLabel(p)} detail={priceLine(p)} selected={plan?.kind === p.kind} onPress={() => setChosen(p.kind)} />
            ))}
          </View>
          {trial !== null && plan !== undefined && (
            <NightCard quiet>
              <Small>{PLUS_TEXT.timeline.today}</Small>
              <Small>{fillText(PLUS_TEXT.timeline.reminder, { day: trial - REMIND_BEFORE_DAYS })}</Small>
              <Small>{fillText(PLUS_TEXT.timeline.charge, { days: trial, price: plan.price })}</Small>
            </NightCard>
          )}
          {plan !== undefined && (
            <Button
              variant="commitment"
              label={trial !== null ? fillText(PLUS_TEXT.start, { days: trial }) : PLUS_TEXT.buy[plan.kind]}
              disabled={busy}
              onPress={() => void run(() => buyPlus(plan), false)}
            />
          )}
          <Button variant="secondary" label={PLUS_TEXT.notNow} disabled={busy} onPress={onClose} />
          <Meta>{plan?.kind === 'lifetime' ? `${PLUS_TEXT.lifetimeNote} ${PLUS_TEXT.renews}` : PLUS_TEXT.renews}</Meta>
          {note !== null && <View accessibilityLiveRegion="polite"><Body>{note}</Body></View>}
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 }}>
        {!plus.active && shop !== null && shop.ok && (
          <LinkButton label={PLUS_TEXT.restore} tone="accentText" disabled={busy} onPress={() => void run(restorePlus, true)} />
        )}
        <LinkButton label={PLUS_TEXT.terms} onPress={() => open('terms')} />
        <LinkButton label={PLUS_TEXT.privacy} onPress={() => open('privacy')} />
      </View>
    </ScreenScroll>
  );
}
