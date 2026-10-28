// Read (docs/2026-10-28-base-app.md, "Read"): the book you're on, your books, and "more on the way"; a book's chapters;
// a chapter's cards one at a time (the story, why it works, a quick check, the idea, try today). The first books ship
// inside the app, so they read offline.
import { BASE_TEXT, BOOKS, book as findBook, chapter, chapterMinutes } from '@levelmeup/content';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { buzz } from '../../ui/haptics.ts';
import { currentBook } from '../logic.ts';
import { STORY_ART } from '../storyArt.ts';
import { useBase, useBaseApi } from '../store.ts';
import { G, S } from '../theme.ts';
import { Bar, Button, Card, Header, Options, Press, Screen, T } from '../ui.tsx';

const TX = BASE_TEXT.read;

export function Read() {
  const data = useBase((s) => s);
  const { book, next } = currentBook(data);
  const read = (id: string) => findBook(id).chapters.filter((c) => data.reading.done[c] !== undefined).length;
  return (
    <Screen>
      <T v="title" accessibilityRole="header">{TX.title}</T>
      <Card hero>
        {STORY_ART[book.chapters[0]!]?.cover != null && <Picture source={STORY_ART[book.chapters[0]!]!.cover!} inset={32} />}
        <T v="label" color={G.accentText}>{TX.current}</T>
        <T v="heading">{book.title}</T>
        <T v="small" color={G.muted}>{book.blurb}</T>
        <T v="small" color={G.muted}>{TX.progress(read(book.id), book.chapters.length)}</T>
        <Bar value={read(book.id)} max={book.chapters.length} />
        <Button label={next === null ? TX.reread : read(book.id) === 0 ? TX.start : TX.continue} icon="read"
          onPress={() => router.push(`/chapter/${book.chapters[next ?? 0]}`)} />
      </Card>
      <T v="heading" accessibilityRole="header">{TX.shelf}</T>
      {BOOKS.map((b) => (
        <Press key={b.id} label={`${b.title}. ${TX.progress(read(b.id), b.chapters.length)}`} onPress={() => router.push(`/books/${b.id}`)}
          style={{ backgroundColor: G.surface, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          {STORY_ART[b.chapters[0]!]?.cover != null && (
            <Image source={STORY_ART[b.chapters[0]!]!.cover!} accessibilityElementsHidden importantForAccessibility="no" resizeMode="cover"
              style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: G.raised }} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <T v="bodyStrong">{b.title}</T>
            <T v="small" color={G.muted}>{b.blurb}</T>
            <T v="label" color={G.muted}>{`${TX.chapters(b.chapters.length)} · ${TX.progress(read(b.id), b.chapters.length)}`}</T>
          </View>
        </Press>
      ))}
      <Card style={{ backgroundColor: 'transparent', borderWidth: 1.5, borderColor: G.line }}>
        <T v="bodyStrong">{TX.more}</T>
        <T v="small" color={G.muted}>{TX.moreText}</T>
      </Card>
    </Screen>
  );
}

export function BookScreen({ id }: { id: string }) {
  const api = useBaseApi();
  const data = useBase((s) => s);
  const b = BOOKS.find((x) => x.id === id);
  if (b === undefined) return <Screen><Header onBack={() => router.back()} /></Screen>;
  return (
    <Screen>
      <Header onBack={() => router.back()} />
      <T v="title" accessibilityRole="header">{b.title}</T>
      <T color={G.muted}>{b.blurb}</T>
      {b.chapters.map((c, i) => {
        const ch = chapter(c);
        const done = data.reading.done[c] !== undefined;
        return (
          <Press key={c} label={`${i + 1}. ${ch.title}`} onPress={() => {
            api.getState().chooseBook(b.id);
            router.push(`/chapter/${c}`);
          }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: G.surface, borderRadius: 14, padding: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? G.accent : G.raised }}>
              <T v="label" color={done ? G.onAccent : G.text}>{String(i + 1)}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T v="bodyStrong">{ch.title}</T>
              <T v="small" color={G.muted}>{`${ch.subtitle} · ${chapterMinutes(ch)} min`}</T>
            </View>
          </Press>
        );
      })}
    </Screen>
  );
}

/** A story picture (960 × 540) across the screen's width; decorative, the words tell the story. */
function Picture({ source, inset = 0 }: { source: number; inset?: number }) {
  const { width } = useWindowDimensions();
  const w = width - 2 * S.gutter - inset;
  return (
    <Image source={source} accessibilityElementsHidden importantForAccessibility="no" resizeMode="cover"
      style={{ width: w, height: Math.round(w * 9 / 16), borderRadius: 16, backgroundColor: G.surface }} />
  );
}

type Card = { kind: 'story'; text: string } | { kind: 'why' } | { kind: 'check' } | { kind: 'lesson' };

export function ChapterScreen({ id }: { id: string }) {
  const api = useBaseApi();
  const left = useBase((s) => s.reading.at?.[id] ?? 0);
  const [index, setShown] = useState(left);
  const setIndex = (i: number) => {
    setShown(i);
    api.getState().leaveChapter(id, i);
  };
  const [answer, setAnswer] = useState<number | null>(null);
  const b = BOOKS.find((x) => x.chapters.includes(id));
  if (b === undefined) return <Screen><Header onBack={() => router.back()} /></Screen>;
  const ch = chapter(id);
  const cards: Card[] = [...ch.story.map((text) => ({ kind: 'story' as const, text })), { kind: 'why' }, { kind: 'check' }, { kind: 'lesson' }];
  const card = cards[index]!;
  const last = index === cards.length - 1;
  const position = b.chapters.indexOf(id);
  const nextId = b.chapters[position + 1];
  const finish = (go: 'next' | 'back') => {
    api.getState().readChapter(id);
    buzz('stamp');
    if (go === 'next' && nextId !== undefined) {
      router.replace(`/chapter/${nextId}`);
    } else router.back();
  };
  return (
    <Screen footer={
      last ? (
        <View style={{ gap: 8 }}>
          {nextId !== undefined && <Button label={TX.nextChapter} onPress={() => finish('next')} testID="chapter-next" />}
          <Button label={nextId === undefined ? TX.bookDone : TX.finish} kind={nextId === undefined ? 'primary' : 'secondary'} onPress={() => finish('back')} testID="chapter-finish" />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {index > 0 && <Button label={TX.back} kind="secondary" style={{ flex: 1 }} onPress={() => setIndex(index - 1)} />}
          <Button label={TX.next} style={{ flex: 2 }} onPress={() => setIndex(index + 1)} disabled={card.kind === 'check' && answer === null} testID="card-next" />
        </View>
      )
    }>
      <Header onBack={() => router.back()} backIcon="close" right={<T v="label" color={G.muted}>{TX.cardOf(index + 1, cards.length)}</T>} />
      <T v="label" color={G.muted}>{`${b.title} · ${position + 1}`}</T>
      <T v="title" accessibilityRole="header">{ch.title}</T>
      <Bar value={index + 1} max={cards.length} height={4} />
      {card.kind === 'story' && STORY_ART[id]?.cards[index] != null && <Picture source={STORY_ART[id]!.cards[index]!} />}
      {card.kind === 'story' && <T style={{ fontSize: 19, lineHeight: 30 }}>{card.text}</T>}
      {card.kind === 'why' && (
        <Card>
          <T v="label" color={G.accentText}>{TX.why}</T>
          <T v="bodyStrong">{ch.why.head}</T>
          <T color={G.muted}>{ch.why.text}</T>
        </Card>
      )}
      {card.kind === 'check' && (
        <Card>
          <T v="label" color={G.accentText}>{TX.check}</T>
          <T v="bodyStrong">{ch.check.question}</T>
          <Options label={ch.check.question} columns={1} value={answer} onChange={(k) => {
            setAnswer(k);
            // A right answer confirms; a wrong one stays quiet (research 2026-10-28, haptic map).
            if (k === ch.check.answer) buzz('stamp');
          }} options={ch.check.options.map((o, i) => ({ key: i, label: o }))} />
          {answer !== null && (
            <T accessibilityLiveRegion="polite" color={answer === ch.check.answer ? G.accentText : G.text}>{`${answer === ch.check.answer ? TX.right : TX.notQuite} ${ch.check.why}`}</T>
          )}
        </Card>
      )}
      {card.kind === 'lesson' && (
        <>
          <Card>
            <T v="label" color={G.accentText}>{TX.lesson}</T>
            <T v="bodyStrong">{ch.lesson}</T>
          </Card>
          <Card>
            <T v="label" color={G.accentText}>{TX.tryToday}</T>
            <T>{ch.tryToday}</T>
          </Card>
        </>
      )}
    </Screen>
  );
}
