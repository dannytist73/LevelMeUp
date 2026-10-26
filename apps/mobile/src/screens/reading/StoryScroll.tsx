// A simpler day (docs/2026-10-26-simpler-day.md, decision 10): a story lesson as one scroll, top to bottom, in place of
// the swipe deck's ten cards. The title and the regular, each story card with its clay picture, why it works (the story's
// Grumble shrinks and cheers up), the optional quick check (your buddy thinks, then cheers when you're right), the lesson
// with what to try today, Keep and Share, then the end the caller gives: today's three lines to take with you (one tap
// claims the reading), or a past reading's line. A thin bar shows how far you are. Every picture appears once: with the
// cards' pictures the cover's is the card it was painted for; without them the cover shows at the top, as before.
import { CAMP_TEXT, CLUSTER_NAMES, READING_TEXT, fillText } from '@levelmeup/content';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storyPictureUrl } from '../../art/stories.ts';
import type { ArticleBody } from '../../game/types.ts';
import { deckMinutes, deckPerson } from '../../reading/deck.ts';
import type { StoryDeck } from '../../reading/deck.ts';
import { colors, fonts, radius, space } from '../../theme/tokens.ts';
import { Icon } from '../../ui/icons.tsx';
import { LinkButton } from '../../ui/LinkButton.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Body, Caption, Heading, Label, Small, Title } from '../../ui/Text.tsx';
import { useReduce } from '../../ui/useMotion.ts';
import { play } from '../../ui/sound.ts';
import { PersonBadge, RoundButton } from './Deck.tsx';
import { CardBuddy, CardGrumble } from './DeckFriends.tsx';
import type { Buddy } from './DeckFriends.tsx';

const D = READING_TEXT.deck;

export type StoryScrollProps = {
  article: ArticleBody & { deck: StoryDeck };
  /** "Today's reading", or "Past reading · Fri 9 Oct". */
  label: string;
  /** The quest's XP; null for a past reading. */
  xp: number | null;
  onClose: () => void;
  onFullArticle: () => void;
  kept: boolean;
  onKeep: () => void;
  /** The reader's buddy, on the quick check and the lesson; none before the game has loaded. */
  buddy?: Buddy;
  /** What the scroll ends on: today's lines to take with you, or a past reading's line. */
  end: ReactNode;
  /** Overrides the phone's setting (tests). */
  reduceMotion?: boolean;
};

/** A picture inside the scroll, until it fails to load; hidden from screen readers (the words say it all). */
function Picture({ uri, testID }: { uri: string; testID: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.control, overflow: 'hidden', backgroundColor: colors.trackOnPaper }}
      accessible={false} importantForAccessibility="no-hide-descendants">
      <Image testID={testID} source={{ uri }} onError={() => setFailed(true)} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

export function StoryScroll({ article, label, xp, onClose, onFullArticle, kept, onKeep, buddy, end, reduceMotion }: StoryScrollProps) {
  const insets = useSafeAreaInsets();
  const still = useReduce(reduceMotion);
  const deck = article.deck;
  const person = deckPerson(deck);
  const [read, setRead] = useState(0);
  /** The quick check's pick: kept while the story is open, sent nowhere (M14 decision 3). */
  const [chosen, setChosen] = useState<number | null>(null);
  // Fetched as the story opens, so each picture is there when it scrolls in.
  useEffect(() => {
    for (const path of [deck.picture, ...(deck.scenes ?? [])]) {
      if (typeof path === 'string') Promise.resolve(Image.prefetch(storyPictureUrl(path))).catch(() => {});
    }
  }, [deck]);
  const minutes = deckMinutes(deck);
  const length = fillText(CAMP_TEXT.storyLength, { n: minutes });
  const meta = xp === null ? length : `${length} · +${xp}\u00a0XP`;
  const share = () => {
    Share.share({ message: fillText(D.shareLine, { lesson: deck.lesson, title: article.title }) }).catch(() => {});
  };
  const q = deck.check;
  const answered = chosen !== null;
  const answerLine = `${D.notQuite} ${fillText(D.rightAnswer, { answer: q.options[q.answer]! })}`;
  const pick = (i: number) => {
    if (answered) return;
    setChosen(i);
    AccessibilityInfo.announceForAccessibility(`${i === q.answer ? D.right : answerLine} ${q.why}`);
  };

  return (
    <View testID="story-scroll" style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ gap: 8, paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <RoundButton icon="close" label={D.close} onPress={onClose} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Caption>{label}</Caption>
            <Body weight="bold">{deck.title}</Body>
          </View>
        </View>
        <View accessible accessibilityRole="progressbar" accessibilityLabel={fillText(CAMP_TEXT.story.read, { n: read })}
          accessibilityValue={{ min: 0, max: 100, now: read }} style={{ height: 6, borderRadius: radius.pill, backgroundColor: colors.segmentNext }}>
          <View style={{ width: `${read}%`, height: 6, borderRadius: radius.pill, backgroundColor: colors.accent }} />
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 32, gap: 18 }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={64}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const span = contentSize.height - layoutMeasurement.height;
          setRead(span <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((contentOffset.y / span) * 100))));
        }}
      >
        <View style={{ gap: 10 }}>
          <Label tone="accentText">{CLUSTER_NAMES[article.cluster]}</Label>
          {deck.scenes === undefined && deck.picture !== undefined && <Picture uri={storyPictureUrl(deck.picture)} testID="story-picture" />}
          {person !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <PersonBadge person={person} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                {xp !== null && <Caption>{D.todaysStory}</Caption>}
                <Body weight="bold">{`${person.name}, ${person.line}`}</Body>
              </View>
            </View>
          )}
          <Title accessibilityRole="header">{deck.title}</Title>
          <Body tone="ashLight" weight="medium">{deck.subtitle}</Body>
          <Small>{meta}</Small>
        </View>

        {deck.story.map((text, i) => {
          const scene = deck.scenes?.[i] ?? null;
          return (
            <View key={i} testID={`story-part-${i}`} style={{ gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: colors.paper }}>
              {scene !== null && <Picture uri={storyPictureUrl(scene)} testID={`story-scene-${i}`} />}
              <Text selectable maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.bodyMedium, fontSize: 19, lineHeight: 29, color: colors.ink }}>{text}</Text>
            </View>
          );
        })}

        <View style={{ gap: 10, padding: 18, borderRadius: radius.card, backgroundColor: colors.panel, borderWidth: space.border, borderColor: colors.line }}>
          <Label tone="accentText">{D.whyItWorks}</Label>
          <Heading style={{ fontSize: 22, lineHeight: 29 }}>{deck.why.head}</Heading>
          <Text selectable maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 26, color: colors.chalk }}>{deck.why.text}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>{person !== null && <Caption>{fillText(D.madeUp, { name: person.name })}</Caption>}</View>
            {deck.grumble !== undefined && <CardGrumble id={deck.grumble} size={84} still={still} />}
          </View>
        </View>

        <View style={{ gap: 12, padding: 18, borderRadius: radius.card, backgroundColor: colors.panel, borderWidth: space.border, borderColor: colors.line }}>
          <Label tone="accentText">{D.check}</Label>
          <Heading style={{ fontSize: 20, lineHeight: 28 }}>{q.question}</Heading>
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            {q.options.map((option, i) => {
              const right = answered && i === q.answer;
              const wrong = answered && i === chosen && i !== q.answer;
              return (
                <Tap key={i} testID={`story-check-${i}`} accessibilityRole="radio" accessibilityLabel={option} accessibilityState={{ checked: chosen === i, disabled: answered }}
                  disabled={answered} onPress={() => pick(i)} on={right ? 'accent' : 'night'} radius={radius.control}
                  style={{
                    minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: right ? colors.accent : colors.night, borderWidth: space.border, borderColor: right ? colors.accent : wrong ? colors.accentText : colors.line,
                  }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>{!answered && <Caption>{CAMP_TEXT.story.checkSkip}</Caption>}</View>
            {buddy !== undefined && (
              <CardBuddy buddy={buddy} pose={!answered ? 'think' : chosen === q.answer ? 'happy' : 'idle'} hop={answered && chosen === q.answer} size={76} still={still} />
            )}
          </View>
        </View>

        <View style={{ gap: 14, padding: 18, borderRadius: radius.card, backgroundColor: colors.panel, borderWidth: space.border, borderColor: colors.line }}>
          <Label tone="accentText">{D.lesson}</Label>
          <Heading style={{ fontSize: 24, lineHeight: 32 }}>{deck.lesson}</Heading>
          <View style={{ gap: 6, padding: 16, borderRadius: radius.control, backgroundColor: colors.paper }}>
            <Label tone="accentInk">{D.tryToday}</Label>
            <Body tone="ink" weight="medium">{deck.tryToday}</Body>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <Tap accessibilityRole="button" accessibilityLabel={kept ? D.keptLabel : D.keepLabel} accessibilityState={{ selected: kept }}
              onPress={() => {
                if (!kept) play('keep');
                onKeep();
              }}
              on={kept ? 'accent' : 'night'} radius={radius.pill}
              style={{
                minHeight: 48, paddingHorizontal: 18, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 8,
                borderWidth: space.border, borderColor: colors.accentText, backgroundColor: kept ? colors.accent : 'transparent',
              }}>
              <Icon name="bookmark" size={18} color={kept ? colors.onAccent : colors.accentText} />
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: kept ? colors.onAccent : colors.chalk }}>{kept ? D.kept : D.keep}</Text>
            </Tap>
            <RoundButton icon="share" label={D.share} onPress={share} />
            <View style={{ flex: 1 }} />
            {buddy !== undefined && <CardBuddy buddy={buddy} pose="happy" size={64} still={still} />}
          </View>
          <Caption>{D.keepNote}</Caption>
        </View>

        {end}
        <LinkButton label={fillText(D.full, { minutes: article.minutes })} onPress={onFullArticle} style={{ alignSelf: 'center' }} />
      </ScrollView>
    </View>
  );
}

/** Today's end: three lines from the story, one tap each to take one (it claims the reading), or your own words. */
export function TakeLines({ lines, disabled, onPick, own }: { lines: readonly string[]; disabled: boolean; onPick: (line: string) => void; own: ReactNode }) {
  const [writing, setWriting] = useState(false);
  return (
    <View testID="take-lines" style={{ gap: 10 }}>
      <Heading accessibilityRole="header">{CAMP_TEXT.story.which}</Heading>
      {lines.map((line) => (
        <Tap key={line} accessibilityRole="button" accessibilityLabel={line} accessibilityState={{ disabled }} disabled={disabled} onPress={() => onPick(line)}
          on="paper" radius={radius.control}
          style={{ minHeight: 52, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.control, backgroundColor: colors.paper, opacity: disabled ? 0.5 : 1 }}>
          <Body tone="ink" weight="bold">{line}</Body>
        </Tap>
      ))}
      {writing ? own : <LinkButton label={CAMP_TEXT.story.own} tone="accentText" onPress={() => setWriting(true)} style={{ alignSelf: 'center' }} />}
    </View>
  );
}
