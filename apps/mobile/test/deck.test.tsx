// M11: the Story Deck's cards and the Codex, apart from the screens that show them. M14: the story lesson.
import { READING_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SAMPLE_ARTICLE, SAMPLE_LEGACY_DECK, SAMPLE_STORY_ARTICLE, SAMPLE_STORY_DECK } from '../src/dev/sampleArticle.ts';
import { CAST_COLORS, CAST_INK } from '../src/reading/castColors.ts';
import { contrast } from '../src/theme/contrast.ts';
import { CODEX_MAX, isKept, readCodex, toggled } from '../src/reading/codex.ts';
import { asDeck, coverTitle, deckCards, deckMinutes, deckPerson } from '../src/reading/deck.ts';
import { Codex } from '../src/screens/Codex.tsx';
import { Deck } from '../src/screens/reading/Deck.tsx';
import { testStore, withStore } from './support/store.ts';

const DECK = SAMPLE_LEGACY_DECK;
const STORY = SAMPLE_STORY_DECK;
const D = READING_TEXT.deck;

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

describe('the story lesson (M14)', () => {
  it('is the cover, the story, why it works, the quick check, the lesson and Your turn', () => {
    expect(deckCards(STORY).map((c) => c.kind)).toEqual(['cover', 'story', 'story', 'story', 'story', 'why', 'check', 'lesson', 'turn']);
    expect(deckCards(STORY).filter((c) => c.kind === 'story').map((c) => (c.kind === 'story' ? [c.kicker, c.note] : 'x'))).toEqual(Array(4).fill([null, null]));
    expect(deckPerson(STORY)).toMatchObject({ name: 'Amara', line: '19, first-year student' });
    expect(deckPerson(DECK)).toBeNull();
  });

  it('has its own title on the cover, and counts every card\'s words', () => {
    expect(coverTitle(SAMPLE_ARTICLE.title, STORY)).toEqual({ title: 'Small promises', subtitle: 'Why tiny wins change how you see yourself' });
    expect(coverTitle('Rest Between Sets: The Pause', DECK)).toEqual({ title: 'Rest Between Sets', subtitle: 'The Pause' });
    expect(deckMinutes(STORY)).toBe(3);
    expect(deckMinutes({ ...STORY, story: ['word '.repeat(400)] })).toBe(5); // 400 story words and about 105 more
  });

  it('is read as sent, and refused when a piece is missing or the person is unknown', () => {
    expect(asDeck(JSON.parse(JSON.stringify(STORY)))).toEqual(STORY);
    const check = STORY.check;
    const bad: unknown[] = [
      { ...STORY, v: 3 }, { ...STORY, cast: 'gandalf' }, { ...STORY, story: [] }, { ...STORY, story: [{ kicker: 'k', text: 't' }] },
      { ...STORY, title: ' ' }, { ...STORY, why: { head: 'x' } }, { ...STORY, check: { ...check, answer: 3 } },
      { ...STORY, check: { ...check, answer: 0.5 } }, { ...STORY, check: { ...check, options: ['only one'] } }, { ...STORY, lesson: undefined },
    ];
    for (const value of bad) expect(asDeck(value)).toBeNull();
  });

  it('keeps a picture of the published shape, and drops any other without losing the story', () => {
    expect(asDeck({ ...STORY, picture: 'story-v1/article-31.webp' })).toEqual({ ...STORY, picture: 'story-v1/article-31.webp' });
    for (const picture of ['https://example.com/x.webp', '../story-v1/article-31.webp', 'story-v1/article-31.png', 3]) {
      expect(asDeck({ ...STORY, picture })).toEqual(STORY);
    }
  });

  it('draws each regular\'s initial at 4.5:1 or more', () => {
    for (const colour of Object.values(CAST_COLORS)) expect(contrast(colour, CAST_INK)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the story lesson on screen (M14)', () => {
  const renderStory = () => render(
    <Deck article={SAMPLE_STORY_ARTICLE as typeof SAMPLE_STORY_ARTICLE & { deck: typeof STORY }} label="Today's reading" xp={10} turn={<Text>turn</Text>}
      onClose={jest.fn()} onFullArticle={jest.fn()} kept={false} onKeep={jest.fn()} reduceMotion />,
  );
  const next = () => fireEvent.press(screen.getByRole('button', { name: D.next }));

  it('follows its person from the cover through the story, then says the person is made up', async () => {
    await renderStory();
    expect(screen.getByText(D.todaysStory)).toBeTruthy();
    expect(screen.getByText('Amara, 19, first-year student')).toBeTruthy();
    expect(screen.getAllByText('Small promises')).toHaveLength(2); // the top bar and the cover
    expect(screen.getByText('9 cards · about 3 min · +10 XP')).toBeTruthy();
    await next();
    expect(screen.getByText("Amara's story")).toBeTruthy();
    expect(screen.getByText('1 of 4')).toBeTruthy();
    expect(screen.getByText(STORY.story[0]!)).toBeTruthy();
    for (let i = 0; i < 4; i++) await next();
    expect(screen.getByTestId('deck-card-why')).toBeTruthy();
    expect(screen.getByText(D.whyItWorks)).toBeTruthy();
    expect(screen.getByText(STORY.why.head)).toBeTruthy();
    expect(screen.getByText(STORY.why.text)).toBeTruthy();
    expect(screen.getByText('Amara is made up. The research is real, and the full article lists its sources.')).toBeTruthy();
  });

  it('asks the quick check, shows the right answer once one is picked, and locks it', async () => {
    await renderStory();
    for (let i = 0; i < 6; i++) await next();
    expect(screen.getByText(STORY.check.question)).toBeTruthy();
    expect(screen.getByText(D.checkSkip)).toBeTruthy();
    const options = screen.getAllByRole('radio');
    expect(options.map((o) => o.props.accessibilityLabel)).toEqual(STORY.check.options);
    await fireEvent.press(screen.getByTestId('deck-check-2'));
    expect(screen.getByText(`${D.notQuite} The answer: ${STORY.check.options[0]}.`)).toBeTruthy();
    expect(screen.getByText(STORY.check.why)).toBeTruthy();
    expect(screen.queryByText(D.checkSkip)).toBeNull();
    expect(screen.getByTestId('deck-check-2').props.accessibilityState).toMatchObject({ checked: true, disabled: true });
    await fireEvent.press(screen.getByTestId('deck-check-0'));
    expect(screen.queryByText(D.right)).toBeNull(); // the first pick stands
    await next();
    expect(screen.getByText(STORY.lesson)).toBeTruthy();
    await next();
    expect(screen.getByText('turn')).toBeTruthy();
  });

  it('shows the story\'s picture on the cover, and the cover as before when it fails to load', async () => {
    await render(
      <Deck article={{ ...SAMPLE_STORY_ARTICLE, deck: { ...STORY, picture: 'story-v1/article-0.webp' } }} label="Today's reading" xp={10}
        turn={<Text>turn</Text>} onClose={jest.fn()} onFullArticle={jest.fn()} kept={false} onKeep={jest.fn()} reduceMotion />,
    );
    const picture = screen.getByTestId('deck-picture', { includeHiddenElements: true });
    expect(picture.props.source.uri).toMatch(/\/storage\/v1\/object\/public\/lmu-art\/story-v1\/article-0\.webp$/);
    await fireEvent(picture, 'error');
    expect(screen.queryByTestId('deck-picture', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText(D.todaysStory)).toBeTruthy();
    await renderStory();
    expect(screen.queryByTestId('deck-picture', { includeHiddenElements: true })).toBeNull(); // no picture: none drawn
  });

  it('says Right for the right answer, and can be skipped', async () => {
    await renderStory();
    for (let i = 0; i < 6; i++) await next();
    await fireEvent.press(screen.getByTestId('deck-check-0'));
    expect(screen.getByText(D.right)).toBeTruthy();
    await renderStory();
    for (let i = 0; i < 7; i++) await next();
    expect(screen.getByTestId('deck-card-lesson')).toBeTruthy(); // swiped on without an answer
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
