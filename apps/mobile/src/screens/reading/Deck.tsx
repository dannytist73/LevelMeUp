// The Story Deck (M11 decisions 5–8): a reading told as cards to swipe, ported from Dogeared's deck. The cover, the
// story cards, the lesson with one thing to try today (and Keep, for the Codex), then Your turn, whose body the caller
// gives (today: the takeaway that clears the quest; a past reading: the line written that day). A clearly sideways drag
// turns a card and a quick tap on the cover or a story card turns it too; Previous and Next work for everyone (TalkBack,
// switch access); each card is announced with its number. Under "Remove animations" cards change without moving.
// React Native's own Animated and PanResponder, as in Dogeared: no new native module. M14 (plan
// 2026-10-19-m14-story-lessons.md): a story lesson's cards follow one of the regulars, then say why it works (and that
// the person is made up), then ask the optional quick check, whose answer stays on this phone and changes nothing.
import { CLUSTER_NAMES, PLAY_TEXT, READING_TEXT, fillText } from '@levelmeup/content';
import type { CastMember } from '@levelmeup/content';
import type { ReactNode } from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, KeyboardAvoidingView, PanResponder, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ArticleBody } from '../../game/types.ts';
import { CAST_COLORS, CAST_INK } from '../../reading/castColors.ts';
import { coverTitle, deckCards, deckMinutes, deckPerson, isStory } from '../../reading/deck.ts';
import type { ArticleDeck, Card } from '../../reading/deck.ts';
import { colors, fonts, radius, space } from '../../theme/tokens.ts';
import { Icon } from '../../ui/icons.tsx';
import type { IconName } from '../../ui/icons.tsx';
import { LinkButton } from '../../ui/LinkButton.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Body, Caption, Heading, Label, Small, Title } from '../../ui/Text.tsx';
import { useReduce } from '../../ui/useMotion.ts';
import { play } from '../../ui/sound.ts';

const D = READING_TEXT.deck;
/** Points of sideways drag past which the card leaves (Dogeared's FLY). */
export const FLY = 70;

export type DeckProps = {
  article: ArticleBody & { deck: ArticleDeck };
  /** "Today's reading", or "Past reading · Fri 9 Oct". */
  label: string;
  /** The quest's XP on the cover; null for a past reading. */
  xp: number | null;
  /** The body of the Your turn card. */
  turn: ReactNode;
  onClose: () => void;
  onFullArticle: () => void;
  kept: boolean;
  onKeep: () => void;
  /** The card to open on; the caller keeps each card turned to, so "Back to the cards" returns there (M11 review). */
  initialStep?: number;
  onStep?: (step: number) => void;
  /** Overrides the phone's setting (tests). */
  reduceMotion?: boolean;
};

/** A regular's initial in their colour (M14). */
function PersonBadge({ person, size }: { person: CastMember; size: number }) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: CAST_COLORS[person.id], alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1} style={{ fontFamily: fonts.bodyBold, fontSize: Math.round(size * 0.45), color: CAST_INK }}>{person.name[0]}</Text>
    </View>
  );
}

function RoundButton({ icon, label, onPress, disabled = false, filled = false }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; filled?: boolean }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      on={filled ? 'accent' : 'night'}
      radius={radius.pill}
      style={{
        width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
        backgroundColor: filled ? colors.accent : colors.panel, opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={icon} size={20} color={filled ? colors.onAccent : colors.chalk} />
    </Tap>
  );
}

export function Deck({ article, label, xp, turn, onClose, onFullArticle, kept, onKeep, initialStep = 0, onStep, reduceMotion }: DeckProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const still = useReduce(reduceMotion);
  const deck = article.deck;
  const cards = useMemo(() => deckCards(deck), [deck]);
  const last = cards.length - 1;
  const stories = deck.story.length;
  const story = isStory(deck) ? deck : null;
  const person = deckPerson(deck);
  const cover = coverTitle(article.title, deck);
  /** The quick check's pick: kept while the deck is open, sent nowhere (M14 decision 3). */
  const [chosen, setChosen] = useState<number | null>(null);
  const [step, setStep] = useState(() => Math.max(0, Math.min(initialStep, cards.length - 1)));
  const [back, setBack] = useState(false);
  const dx = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(1)).current;
  const flying = useRef(false); // a card is on its way off; input waits for it
  const touch = useRef({ x: 0, y: 0, t: 0 });

  /** What a screen reader says when a card arrives: where it is, then what it holds. */
  const spoken = (i: number): string => {
    const c = cards[i]!;
    const what = c.kind === 'cover' ? (cover.subtitle === null ? cover.title : `${cover.title}. ${cover.subtitle}`)
      : c.kind === 'story' ? `${c.kicker ?? fillText(D.storyBy, { name: person?.name ?? '' })}. ${c.text}`
      : c.kind === 'why' ? `${D.whyItWorks}: ${story?.why.head} ${story?.why.text}`
      : c.kind === 'check' ? `${D.check}: ${story?.check.question}`
      : c.kind === 'lesson' ? `${D.lesson}: ${deck.lesson} ${D.tryToday}: ${deck.tryToday}` : `${D.turn}: ${article.question}`;
    return `${fillText(D.card, { n: i + 1, total: cards.length })}. ${what}`;
  };

  const show = (to: number, fromLeft: boolean) => {
    play('cardTurn');
    setBack(fromLeft);
    setStep(to);
    onStep?.(to);
    AccessibilityInfo.announceForAccessibility(spoken(to));
  };
  const settle = () => Animated.spring(dx, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }).start();
  const next = () => {
    if (flying.current) return;
    if (step >= last) { settle(); return; }
    if (still) { show(step + 1, false); return; }
    flying.current = true;
    Animated.timing(dx, { toValue: -width * 1.3, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      flying.current = false;
      if (finished) show(step + 1, false); else settle();
    });
  };
  const prev = () => {
    if (flying.current) return;
    if (step > 0) show(step - 1, true); else settle();
  };

  // The responder is made once; it reads the current handlers and motion setting from refs.
  const live = useRef({ next, prev, settle, still });
  live.current = { next, prev, settle, still };
  // Reset the drag and play the entrance once the new card is committed, before it paints: done earlier, the card on its
  // way out would snap back into view for a frame (Dogeared).
  useLayoutEffect(() => {
    dx.setValue(0);
    if (live.current.still) { enter.setValue(1); return; }
    enter.setValue(0);
    const a = Animated.timing(enter, { toValue: 1, duration: 360, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [step, dx, enter]);
  const pan = useMemo(() => PanResponder.create({
    // Only a clearly sideways drag: a card that scrolls still scrolls, and a tap still taps.
    onMoveShouldSetPanResponderCapture: (_e, g) => !flying.current && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_e, g) => { if (!live.current.still && !flying.current) dx.setValue(g.dx); },
    onPanResponderRelease: (_e, g) => {
      if (g.dx < -FLY) live.current.next();
      else if (g.dx > FLY) live.current.prev();
      else live.current.settle();
    },
    onPanResponderTerminate: () => live.current.settle(),
    onPanResponderTerminationRequest: () => false,
  }), [dx]);

  const at = Math.min(step, last);
  const card = cards[at]!;
  const left = last - at;
  const minutes = deckMinutes(deck);
  const meta = xp === null ? fillText(D.cards, { cards: cards.length, minutes }) : fillText(D.cardsXp, { cards: cards.length, minutes, xp });
  const share = () => {
    Share.share({ message: fillText(D.shareLine, { lesson: deck.lesson, title: article.title }) }).catch(() => {});
  };

  const face = (c: Card): { bg: string; border?: string; body: ReactNode } => {
    switch (c.kind) {
      case 'cover':
        return { bg: colors.accent, body: (
          <View style={{ flex: 1, gap: 12 }}>
            <Label tone="onAccent">{`${label} · ${CLUSTER_NAMES[article.cluster]}`}</Label>
            <View style={{ flex: 1, minHeight: 40 }} />
            {person !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <PersonBadge person={person} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Caption tone="onAccent">{D.todaysStory}</Caption>
                  <Body tone="onAccent" weight="bold">{`${person.name}, ${person.line}`}</Body>
                </View>
              </View>
            )}
            <Title tone="onAccent">{cover.title}</Title>
            {cover.subtitle !== null && <Body tone="onAccent" weight="medium" style={{ fontSize: 19, lineHeight: 27 }}>{cover.subtitle}</Body>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <Small tone="onAccent">{meta}</Small>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onAccent }}>{D.swipe}</Text>
                <Icon name="arrowRight" size={18} color={colors.onAccent} />
              </View>
            </View>
          </View>
        ) };
      case 'story':
        return { bg: colors.paper, body: (
          <View style={{ flex: 1, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              {person !== null && c.kicker === null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
                  <PersonBadge person={person} size={32} />
                  <Label tone="accentInk" style={{ flexShrink: 1 }}>{fillText(D.storyBy, { name: person.name })}</Label>
                </View>
              ) : <Label tone="accentInk" style={{ flexShrink: 1 }}>{c.kicker}</Label>}
              <Caption tone="inkMuted">{fillText(D.storyCount, { n: c.i + 1, total: stories })}</Caption>
            </View>
            <Text selectable maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.bodyMedium, fontSize: 21, lineHeight: 32, color: colors.ink }}>{c.text}</Text>
            <View style={{ flex: 1, minHeight: 16 }} />
            {c.note !== null && (
              <View accessible accessibilityLabel={`${PLAY_TEXT.speakers.system}: ${c.note}`}
                style={{ gap: 4, padding: 14, borderRadius: radius.control, borderWidth: space.border, borderColor: colors.accent, backgroundColor: colors.panel }}>
                <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.3, color: colors.accentText }}>{PLAY_TEXT.speakers.system}</Text>
                <Body weight="medium">{c.note}</Body>
              </View>
            )}
            {c.i === 0 && <Caption tone="inkMuted">{D.tapHint}</Caption>}
          </View>
        ) };
      case 'why':
        return { bg: colors.paper, body: (
          <View style={{ flex: 1, gap: 14 }}>
            <Label tone="accentInk">{D.whyItWorks}</Label>
            <Heading tone="ink" style={{ fontSize: 24, lineHeight: 31 }}>{story?.why.head}</Heading>
            <Text selectable maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.bodyMedium, fontSize: 18, lineHeight: 28, color: colors.ink }}>{story?.why.text}</Text>
            <View style={{ flex: 1, minHeight: 16 }} />
            {person !== null && <Caption tone="inkMuted">{fillText(D.madeUp, { name: person.name })}</Caption>}
          </View>
        ) };
      case 'check': {
        const q = story!.check;
        const answered = chosen !== null;
        const answerLine = `${D.notQuite} ${fillText(D.rightAnswer, { answer: q.options[q.answer]! })}`;
        const pick = (i: number) => {
          if (answered) return;
          setChosen(i);
          AccessibilityInfo.announceForAccessibility(`${i === q.answer ? D.right : answerLine} ${q.why}`);
        };
        return { bg: colors.panel, border: colors.line, body: (
          <View style={{ flex: 1, gap: 14 }}>
            <Label tone="accentText">{D.check}</Label>
            <Heading style={{ fontSize: 22, lineHeight: 30 }}>{q.question}</Heading>
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {q.options.map((option, i) => {
                const right = answered && i === q.answer;
                const wrong = answered && i === chosen && i !== q.answer;
                return (
                  <Tap
                    key={i}
                    testID={`deck-check-${i}`}
                    accessibilityRole="radio"
                    accessibilityLabel={option}
                    accessibilityState={{ checked: chosen === i, disabled: answered }}
                    disabled={answered}
                    onPress={() => pick(i)}
                    on={right ? 'accent' : 'night'}
                    radius={radius.control}
                    style={{
                      minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: right ? colors.accent : colors.night, borderWidth: space.border, borderColor: right ? colors.accent : wrong ? colors.accentText : colors.line,
                    }}
                  >
                    {right && <Icon name="check" size={18} color={colors.onAccent} />}
                    {wrong && <Icon name="close" size={18} color={colors.accentText} />}
                    <Body tone={right ? 'onAccent' : 'chalk'} weight={right ? 'bold' : 'medium'} style={{ flex: 1 }}>{option}</Body>
                  </Tap>
                );
              })}
            </View>
            {answered && (
              <View style={{ gap: 4 }}>
                <Body weight="bold">{chosen === q.answer ? D.right : answerLine}</Body>
                <Body tone="ashLight">{q.why}</Body>
              </View>
            )}
            <View style={{ flex: 1, minHeight: 16 }} />
            {!answered && <Caption>{D.checkSkip}</Caption>}
          </View>
        ) };
      }
      case 'lesson':
        return { bg: colors.panel, border: colors.line, body: (
          <View style={{ flex: 1, gap: 16 }}>
            <Label tone="accentText">{D.lesson}</Label>
            <Heading style={{ fontSize: 26, lineHeight: 34 }}>{deck.lesson}</Heading>
            <View style={{ gap: 6, padding: 16, borderRadius: radius.control, backgroundColor: colors.paper }}>
              <Label tone="accentInk">{D.tryToday}</Label>
              <Body tone="ink" weight="medium">{deck.tryToday}</Body>
            </View>
            <View style={{ flex: 1, minHeight: 16 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <Tap
                accessibilityRole="button"
                accessibilityLabel={kept ? D.keptLabel : D.keepLabel}
                accessibilityState={{ selected: kept }}
                onPress={() => {
                  if (!kept) play('keep');
                  onKeep();
                }}
                on={kept ? 'accent' : 'night'}
                radius={radius.pill}
                style={{
                  minHeight: 48, paddingHorizontal: 18, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 8,
                  borderWidth: space.border, borderColor: colors.accentText, backgroundColor: kept ? colors.accent : 'transparent', 
                }}
              >
                <Icon name="bookmark" size={18} color={kept ? colors.onAccent : colors.accentText} />
                <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: kept ? colors.onAccent : colors.chalk }}>{kept ? D.kept : D.keep}</Text>
              </Tap>
              <RoundButton icon="share" label={D.share} onPress={share} />
            </View>
            <Caption>{D.keepNote}</Caption>
          </View>
        ) };
      case 'turn':
        return { bg: colors.panel, border: colors.line, body: (
          <View style={{ gap: 14 }}>
            <Label tone="accentText">{D.turn}</Label>
            <Heading>{article.question}</Heading>
            {turn}
            <LinkButton label={fillText(D.full, { minutes: article.minutes })} onPress={onFullArticle} />
          </View>
        ) };
    }
  };

  const { bg, border, body } = face(card);
  const tappable = card.kind === 'cover' || card.kind === 'story' || card.kind === 'why';
  const rot = dx.interpolate({ inputRange: [-220, 0, 220], outputRange: ['-9deg', '0deg', '9deg'] });
  const entering = back
    ? [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }]
    : [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }];
  const content = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 22 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {body}
    </ScrollView>
  );

  // M12 (audit 16): with the phone drawing edge to edge, the keyboard would cover Your turn's Claim; the deck rises above it.
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.night }}>
    <View testID="deck" style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 10 }}>
        <RoundButton icon="close" label={D.close} onPress={onClose} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Caption>{label}</Caption>
          <Body weight="bold">{cover.title}</Body>
        </View>
        <Small accessibilityLabel={fillText(D.card, { n: at + 1, total: cards.length })}>{`${at + 1} / ${cards.length}`}</Small>
      </View>

      <View style={{ flex: 1, marginHorizontal: 16, marginTop: 4, marginBottom: 8 }} {...pan.panHandlers}>
        {/* The cards still to come peek out below the top one. */}
        {left >= 2 && <View style={{ position: 'absolute', top: 22, left: 18, right: 18, bottom: 0, borderRadius: radius.card + 6, backgroundColor: colors.lineSoft }} />}
        {left >= 1 && <View style={{ position: 'absolute', top: 11, left: 9, right: 9, bottom: 11, borderRadius: radius.card + 6, backgroundColor: colors.line }} />}
        <Animated.View
          key={step}
          testID={`deck-card-${card.kind}`}
          style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: left >= 1 ? 22 : 0, borderRadius: radius.card + 6, overflow: 'hidden',
            backgroundColor: bg, borderWidth: border === undefined ? 0 : space.border, borderColor: border,
            opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
            transform: [{ translateX: dx }, { rotate: rot }, ...entering],
          }]}
        >
          {/* A quick tap turns a cover or story card. Read from raw touches, not a Pressable, which would take the long
              press a card's text needs to select a word (Dogeared). */}
          {tappable ? (
            <View style={{ flex: 1 }}
              onTouchStart={(e) => { touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, t: Date.now() }; }}
              onTouchEnd={(e) => {
                const t = touch.current;
                if (Date.now() - t.t < 250 && Math.abs(e.nativeEvent.pageX - t.x) < 10 && Math.abs(e.nativeEvent.pageY - t.y) < 10) next();
              }}>
              {content}
            </View>
          ) : content}
        </Animated.View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: insets.bottom + 14 }}>
        <RoundButton icon="arrowLeft" label={D.previous} onPress={prev} disabled={at === 0} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }} accessible={false} importantForAccessibility="no-hide-descendants">
          {cards.map((_c, i) => (
            <View key={i} style={{ width: i === at ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === at ? colors.accent : i < at ? colors.accentInk : colors.segmentNext }} />
          ))}
        </View>
        <RoundButton icon="arrowRight" label={D.next} onPress={next} disabled={at === last} filled />
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}
