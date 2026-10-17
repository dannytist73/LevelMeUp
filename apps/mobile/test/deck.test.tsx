// M11: the Story Deck's cards and the Codex, apart from the screens that show them.
import { READING_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SAMPLE_ARTICLE } from '../src/dev/sampleArticle.ts';
import { CODEX_MAX, isKept, readCodex, toggled } from '../src/reading/codex.ts';
import { asDeck, coverTitle, deckCards, deckMinutes } from '../src/reading/deck.ts';
import { Codex } from '../src/screens/Codex.tsx';
import { Deck } from '../src/screens/reading/Deck.tsx';
import { testStore, withStore } from './support/store.ts';

const DECK = SAMPLE_ARTICLE.deck!;

describe('the deck\'s cards (M11 decision 5)', () => {
  it('are the cover, the story cards with the System note on the last one, the lesson and Your turn', () => {
    const cards = deckCards(DECK);
    expect(cards.map((c) => c.kind)).toEqual(['cover', 'story', 'story', 'story', 'lesson', 'turn']);
    expect(cards.filter((c) => c.kind === 'story').map((c) => (c.kind === 'story' ? c.note : 'x'))).toEqual([null, null, DECK.systemNote]);
  });

  it('split a title at its colon into the cover\'s title and subtitle', () => {
    expect(coverTitle('Rest Between Sets: The Pause That Builds Strength')).toEqual({ title: 'Rest Between Sets', subtitle: 'The Pause That Builds Strength' });
    expect(coverTitle('Why tiny wins change how you see yourself')).toEqual({ title: 'Why tiny wins change how you see yourself', subtitle: null });
    expect(coverTitle(': odd')).toEqual({ title: ': odd', subtitle: null });
  });

  it('take about their words at 150 a minute, plus a minute for your line', () => {
    expect(deckMinutes(DECK)).toBe(2);
    expect(deckMinutes({ ...DECK, story: [{ kicker: 'k', text: 'word '.repeat(400) }] })).toBe(4);
  });
});

describe('a deck as the phone reads it (M11 review)', () => {
  it('keeps a deck of the known shape, and a missing System note is none', () => {
    expect(asDeck(DECK)).toEqual(DECK);
    const noNote: Record<string, unknown> = { ...DECK };
    delete noNote.systemNote;
    expect(asDeck(noNote)).toEqual({ ...DECK, systemNote: null });
  });

  it('refuses any other shape, so the reading opens the full article instead', () => {
    const card = DECK.story[0]!;
    const bad: unknown[] = [
      null, 'deck', {}, { ...DECK, story: 'cards' }, { ...DECK, story: [] }, { ...DECK, story: [{ kicker: 'k' }] },
      { ...DECK, story: [card, card, card, card, card, card] }, { ...DECK, lesson: undefined }, { ...DECK, tryToday: ' ' }, { ...DECK, systemNote: 3 },
    ];
    for (const value of bad) expect(asDeck(value)).toBeNull();
  });
});

describe('the Codex (M11 decision 7)', () => {
  const a = { articleId: 'article-1', title: 'One', lesson: 'Lesson one.', keptAt: 1 };
  const b = { articleId: 'article-2', title: 'Two', lesson: 'Lesson two.', keptAt: 2 };

  it('keeps one lesson per article, newest first; keeping it again takes it out', () => {
    const kept = toggled(toggled([], a), b);
    expect(kept.map((e) => e.articleId)).toEqual(['article-2', 'article-1']);
    expect(isKept(kept, 'article-1')).toBe(true);
    expect(toggled(kept, a).map((e) => e.articleId)).toEqual(['article-2']);
  });

  it('reads back what it stored, and treats anything unreadable as empty', () => {
    expect(readCodex(JSON.stringify([a, b]))).toEqual([b, a]);
    expect(readCodex(null)).toEqual([]);
    expect(readCodex('not json')).toEqual([]);
    expect(readCodex(JSON.stringify([{ articleId: 3 }, a]))).toEqual([a]);
  });

  it('holds at most CODEX_MAX lessons, dropping the oldest', () => {
    let codex = [] as ReturnType<typeof toggled>;
    for (let i = 0; i < CODEX_MAX + 5; i++) codex = toggled(codex, { ...a, articleId: `article-${i}`, keptAt: i });
    expect(codex).toHaveLength(CODEX_MAX);
    expect(codex[0]!.articleId).toBe(`article-${CODEX_MAX + 4}`);
  });
});

describe('the deck without animations (Remove animations, M11 decision 8)', () => {
  it('changes cards at once, and announces each with its number', async () => {
    await render(
      <Deck article={{ ...SAMPLE_ARTICLE, deck: DECK }} label="Today's reading" xp={10} turn={<Text>turn</Text>}
        onClose={jest.fn()} onFullArticle={jest.fn()} kept={false} onKeep={jest.fn()} reduceMotion />,
    );
    expect(screen.getByLabelText('Card 1 of 6')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: READING_TEXT.deck.next }));
    expect(screen.getByTestId('deck-card-story')).toBeTruthy(); // no wait: nothing flies
    expect(screen.getByLabelText('Card 2 of 6')).toBeTruthy();
  });

  it('closes from its first card', async () => {
    const onClose = jest.fn();
    await render(
      <Deck article={{ ...SAMPLE_ARTICLE, deck: DECK }} label="Today's reading" xp={null} turn={<Text>turn</Text>}
        onClose={onClose} onFullArticle={jest.fn()} kept={false} onKeep={jest.fn()} reduceMotion />,
    );
    expect(screen.getByText('6 cards · about 2 min')).toBeTruthy(); // a past reading shows no XP
    await fireEvent.press(screen.getByRole('button', { name: READING_TEXT.deck.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('the Codex screen (M11 decision 7)', () => {
  it('lists the kept lessons with their readings, opens one, and takes one out with Undo (M12, audit 24)', async () => {
    const two = { articleId: 'article-2', title: 'Two', lesson: 'Lesson two.', keptAt: 2 };
    const store = testStore({ codex: [two, { articleId: 'article-1', title: 'One', lesson: 'Lesson one.', keptAt: 1 }] });
    const onOpenReading = jest.fn();
    await render(withStore(store, <Codex onBack={jest.fn()} onOpenReading={onOpenReading} />));
    expect(screen.getByText('Lesson two.')).toBeTruthy();
    expect(screen.getByText('One')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^Lesson two\. Open the reading "Two"$/ }));
    expect(onOpenReading).toHaveBeenCalledWith('article-2');
    await fireEvent.press(screen.getByRole('button', { name: 'Take "Lesson two." out of your Codex' }));
    expect(store.getState().codex.map((e) => e.articleId)).toEqual(['article-1']);
    expect(screen.getByText(READING_TEXT.codex.removed)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: READING_TEXT.codex.undo }));
    expect(store.getState().codex.map((e) => e.articleId).sort()).toEqual(['article-1', 'article-2']);
  });

  it('says how to fill it when empty', async () => {
    await render(withStore(testStore(), <Codex onBack={jest.fn()} />));
    expect(screen.getByText(READING_TEXT.codex.empty)).toBeTruthy();
  });
});
