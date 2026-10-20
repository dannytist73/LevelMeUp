import { PLAY_TEXT, READING_TEXT } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SAMPLE_ARTICLE, SAMPLE_LEGACY_DECK } from '../src/dev/sampleArticle.ts';
import { project } from '../src/game/project.ts';
import type { ArticleBody, PhoneEvent, ServerState } from '../src/game/types.ts';
import { Quest } from '../src/screens/Quest.tsx';
import { openSource } from '../src/screens/reading/openSource.ts';
import { Reader } from '../src/screens/reading/Reader.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13);
const SUMMARY = { id: SAMPLE_ARTICLE.id, cluster: SAMPLE_ARTICLE.cluster, title: SAMPLE_ARTICLE.title, minutes: SAMPLE_ARTICLE.minutes };
const base = serverState();
const WITH_ARTICLE: ServerState = { ...base, today: { ...base.today!, article: SUMMARY } };
const articleId = base.today!.quests.find((q) => q.slot === 'article')!.id;

/** M11: the article as a phone held it before Story Decks (and as one whose deck failed). */
const NO_DECK: ArticleBody = { ...SAMPLE_ARTICLE, deck: null };

async function renderReading(server: ServerState, held: boolean, article: ArticleBody = NO_DECK) {
  const pending: PhoneEvent[] = [];
  const store = testStore({ view: project(server, []), articles: held ? { [article.id]: article } : {} });
  const enqueue = jest.fn(async (event: Omit<PhoneEvent, 'id'>) => {
    pending.push({ ...event, id: `00000000-0000-4000-8000-${String(pending.length + 1).padStart(12, '0')}` } as PhoneEvent);
    store.setState({ view: project(server, pending) });
  });
  store.setState({ enqueue: enqueue as never });
  const onRead = jest.fn();
  await render(withStore(store, <Quest questId={articleId} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onRead={onRead} now={() => NOW} />));
  return { store, enqueue, onRead };
}

describe('the reader (board D3, M8b decision 5)', () => {
  it('shows the article: its topic, title, summary, sections with their sources, the System note, the takeaways', async () => {
    await render(<Reader article={SAMPLE_ARTICLE} label="Today's reading" xp={10} onOpenSource={jest.fn()} />);
    expect(screen.getByText(/^6 min · Wisdom \+10 XP · /)).toBeTruthy();
    expect(screen.getByText(/ · Discipline and habits$/)).toBeTruthy();
    expect(screen.getByText(SAMPLE_ARTICLE.title)).toBeTruthy();
    expect(screen.getByText(SAMPLE_ARTICLE.summary)).toBeTruthy();
    for (const s of SAMPLE_ARTICLE.sections) expect(screen.getByText(s.heading)).toBeTruthy();
    expect(screen.getByLabelText('System: A streak is exactly this: evidence, one day at a time.')).toBeTruthy();
    expect(screen.getByLabelText('Sources 1, 2')).toBeTruthy();
    for (const t of SAMPLE_ARTICLE.takeaways) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByText(SAMPLE_ARTICLE.question)).toBeTruthy();
  });

  it('lists the sources, each opening in the browser', async () => {
    const onOpenSource = jest.fn();
    await render(<Reader article={SAMPLE_ARTICLE} label="Today's reading" xp={10} onOpenSource={onOpenSource} />);
    await fireEvent.press(screen.getByRole('link', { name: '2. Small wins and motivation · example.com' }));
    expect(onOpenSource).toHaveBeenCalledWith('https://www.example.com/small-wins');
  });

  it('a one-sentence takeaway claims the reading quest', async () => {
    const { enqueue } = await renderReading(WITH_ARTICLE, true);
    expect(screen.getByText(SAMPLE_ARTICLE.title)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(READING_TEXT.takeawayLabel), '  Small wins are evidence.  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared · +10 XP' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'complete', instanceId: articleId, completedAt: NOW, rating: null, payload: { text: 'Small wins are evidence.' } });
  });

  it('after the claim: "Quest cleared" without a rating, and Read again', async () => {
    const { onRead } = await renderReading(WITH_ARTICLE, true);
    await fireEvent.changeText(screen.getByLabelText(READING_TEXT.takeawayLabel), 'Small wins are evidence.');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared · +10 XP' }));
    expect(screen.queryByRole('button', { name: PLAY_TEXT.cleared.easy })).toBeNull();
    expect(screen.getByText("Today's reading · Discipline and habits")).toBeTruthy(); // not the slot twice
    await fireEvent.press(screen.getByRole('button', { name: READING_TEXT.readAgain }));
    expect(onRead).toHaveBeenCalledWith(SAMPLE_ARTICLE.id);
  });

  it('an article not on the phone yet is asked for, and the screen says it is on its way', async () => {
    const { store } = await renderReading(WITH_ARTICLE, false);
    expect(screen.getByText(READING_TEXT.waiting)).toBeTruthy();
    expect(store.getState().fetchArticle).toHaveBeenCalledWith(SAMPLE_ARTICLE.id);
    expect(screen.queryByRole('button', { name: 'Mark cleared · +10 XP' })).toBeNull();
  });
});

describe('the Story Deck (M11)', () => {
  const D = READING_TEXT.deck;
  // The card flies off for 220 ms before the next one arrives (Remove animations is off in these tests).
  const next = async () => {
    await fireEvent.press(screen.getByRole('button', { name: D.next }));
    await act(async () => { await new Promise((done) => setTimeout(done, 300)); });
  };

  it('opens on the cover, then the story cards, the lesson and Your turn, one card at a time', async () => {
    await renderReading(WITH_ARTICLE, true, SAMPLE_ARTICLE);
    expect(screen.getByTestId('deck-card-cover')).toBeTruthy();
    expect(screen.getByText('6\u00a0cards · about\u00a02\u00a0min · +10\u00a0XP')).toBeTruthy();
    expect(screen.getByRole('button', { name: D.previous }).props.accessibilityState).toMatchObject({ disabled: true });
    await next();
    expect(screen.getByText(SAMPLE_LEGACY_DECK.story[0]!.text)).toBeTruthy();
    expect(screen.getByText('1 of 3')).toBeTruthy();
    await next();
    await next();
    expect(screen.getByLabelText(`System: ${SAMPLE_LEGACY_DECK.systemNote}`)).toBeTruthy(); // on the last story card
    await next();
    expect(screen.getByText(SAMPLE_ARTICLE.deck!.lesson)).toBeTruthy();
    expect(screen.getByText(SAMPLE_ARTICLE.deck!.tryToday)).toBeTruthy();
    await next();
    expect(screen.getByText(SAMPLE_ARTICLE.question)).toBeTruthy();
    // M17: on Your turn the bottom row is the Claim, not a Next that can't go on.
    expect(screen.queryByRole('button', { name: D.next })).toBeNull();
    expect(screen.getByRole('button', { name: 'Mark cleared · +10 XP' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: D.previous }));
    expect(screen.getByTestId('deck-card-lesson')).toBeTruthy();
  });

  it('a tap on the cover or a story card turns it', async () => {
    await renderReading(WITH_ARTICLE, true, SAMPLE_ARTICLE);
    const card = screen.getByTestId('deck-card-cover').children[0] as never;
    await fireEvent(card, 'touchStart', { nativeEvent: { pageX: 100, pageY: 200 } });
    await fireEvent(card, 'touchEnd', { nativeEvent: { pageX: 102, pageY: 201 } });
    await act(async () => { await new Promise((done) => setTimeout(done, 300)); });
    expect(screen.getByTestId('deck-card-story')).toBeTruthy();
  });

  it('Your turn claims the reading quest with the takeaway, as the reader does', async () => {
    const { enqueue } = await renderReading(WITH_ARTICLE, true, SAMPLE_ARTICLE);
    for (let i = 0; i < 5; i++) await next();
    await fireEvent.changeText(screen.getByLabelText(READING_TEXT.takeawayLabel), 'Small wins are evidence.');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared · +10 XP' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'complete', instanceId: articleId, completedAt: NOW, rating: null, payload: { text: 'Small wins are evidence.' } });
  });

  it('the full article is one tap away, and the cards one tap back', async () => {
    await renderReading(WITH_ARTICLE, true, SAMPLE_ARTICLE);
    for (let i = 0; i < 5; i++) await next();
    await fireEvent.press(screen.getByRole('button', { name: 'Read the full article · 6 min' }));
    for (const s of SAMPLE_ARTICLE.sections) expect(screen.getByText(s.heading)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: D.backToCards }));
    expect(screen.getByTestId('deck')).toBeTruthy();
  });

  it('keeps the line being written, and the card, while the full article is open (M11 review)', async () => {
    await renderReading(WITH_ARTICLE, true, SAMPLE_ARTICLE);
    for (let i = 0; i < 5; i++) await next();
    await fireEvent.changeText(screen.getByLabelText(READING_TEXT.takeawayLabel), 'Small wins');
    await fireEvent.press(screen.getByRole('button', { name: 'Read the full article · 6 min' }));
    expect(screen.getByLabelText(READING_TEXT.takeawayLabel).props.value).toBe('Small wins'); // the reader's field has it too
    await fireEvent.changeText(screen.getByLabelText(READING_TEXT.takeawayLabel), 'Small wins are evidence.');
    await fireEvent.press(screen.getByRole('button', { name: D.backToCards }));
    expect(screen.getByTestId('deck-card-turn')).toBeTruthy(); // back where it was left, not the cover
    expect(screen.getByLabelText(READING_TEXT.takeawayLabel).props.value).toBe('Small wins are evidence.');
    await fireEvent.press(screen.getByRole('button', { name: D.previous }));
    await next();
    expect(screen.getByLabelText(READING_TEXT.takeawayLabel).props.value).toBe('Small wins are evidence.'); // and across a turn
  });

  it('a deck this phone can\'t read opens the full article instead, and still clears (M11 review)', async () => {
    const { enqueue } = await renderReading(WITH_ARTICLE, true, { ...SAMPLE_ARTICLE, deck: { story: 'cards' } as never });
    expect(screen.queryByTestId('deck')).toBeNull();
    for (const s of SAMPLE_ARTICLE.sections) expect(screen.getByText(s.heading)).toBeTruthy();
    expect(screen.queryByRole('button', { name: D.backToCards })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(READING_TEXT.takeawayLabel), 'Small wins are evidence.');
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared · +10 XP' }));
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it('a deck a sync brings while the full article is open doesn\'t swap the screen (M11 review)', async () => {
    const { store } = await renderReading(WITH_ARTICLE, true, NO_DECK);
    await fireEvent.changeText(screen.getByLabelText(READING_TEXT.takeawayLabel), 'Small wins');
    await act(async () => { store.setState({ articles: { [SAMPLE_ARTICLE.id]: SAMPLE_ARTICLE } }); });
    expect(screen.queryByTestId('deck')).toBeNull();
    expect(screen.getByLabelText(READING_TEXT.takeawayLabel).props.value).toBe('Small wins');
    await fireEvent.press(screen.getByRole('button', { name: D.backToCards }));
    expect(screen.getByTestId('deck-card-cover')).toBeTruthy();
  });

  it('Keep puts the lesson in the Codex, and a second tap takes it out', async () => {
    const { store } = await renderReading(WITH_ARTICLE, true, SAMPLE_ARTICLE);
    for (let i = 0; i < 4; i++) await next();
    await fireEvent.press(screen.getByRole('button', { name: D.keepLabel }));
    expect(store.getState().codex).toEqual([{ articleId: SAMPLE_ARTICLE.id, title: SAMPLE_ARTICLE.title, lesson: SAMPLE_ARTICLE.deck!.lesson, keptAt: NOW }]);
    expect(screen.getByText(D.kept)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: D.keptLabel }));
    expect(store.getState().codex).toEqual([]);
  });
});

describe('opening a source', () => {
  it('opens only web addresses', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    openSource('https://example.org/a');
    openSource('javascript:alert(1)');
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('https://example.org/a');
    open.mockRestore();
  });
});
