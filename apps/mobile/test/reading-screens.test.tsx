import { CLUSTER_LINES, CLUSTER_NAMES, READING_TEXT } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SAMPLE_ARTICLE } from '../src/dev/sampleArticle.ts';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { Library } from '../src/screens/Library.tsx';
import { Reading } from '../src/screens/Reading.tsx';
import { InsightPanel } from '../src/screens/reading/InsightPanel.tsx';
import { ReadingHero, ReadingRow } from '../src/screens/reading/ReadingCard.tsx';
import { Today } from '../src/screens/Today.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const SUMMARY = { id: SAMPLE_ARTICLE.id, cluster: SAMPLE_ARTICLE.cluster, title: SAMPLE_ARTICLE.title, minutes: SAMPLE_ARTICLE.minutes };
const base = serverState();
const article = base.today!.quests.find((q) => q.slot === 'article')!;

describe("Today's reading (board D1; M12 boards R3-1, R3-5)", () => {
  it('as Up next: the topic, the title, how long it takes and its XP, and Read', async () => {
    const onOpen = jest.fn();
    await render(withStore(testStore(), <ReadingHero quest={article} article={SUMMARY} waiting={false} onOpen={onOpen} />));
    expect(screen.getByText(SAMPLE_ARTICLE.title)).toBeTruthy();
    expect(screen.getByText('6 min read · +10 XP')).toBeTruthy();
    expect(screen.getByText(`${READING_TEXT.label} · ${CLUSTER_NAMES[SAMPLE_ARTICLE.cluster]}`)).toBeTruthy();
    await fireEvent.press(screen.getByText(READING_TEXT.read));
    expect(onOpen).toHaveBeenCalled();
  });

  it('counts the Story Deck\'s cards once the phone holds it', async () => {
    await render(withStore(testStore({ articles: { [SAMPLE_ARTICLE.id]: SAMPLE_ARTICLE } }),
      <ReadingHero quest={article} article={SUMMARY} waiting={false} onOpen={jest.fn()} />));
    expect(screen.getByText(/^\d+\scards · about\s\d+\smin · \+10\sXP$/)).toBeTruthy();
  });

  it('as a row: says it waits while the day has no article', async () => {
    await render(withStore(testStore(), <ReadingRow quest={article} article={null} waiting={false} onOpen={jest.fn()} />));
    expect(screen.getByText(/Today's reading opens once the daily articles arrive/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe("Today's reading card on Today", () => {
  it('opens the quest to read and claim; once cleared, Read again opens the article itself (emulator check)', async () => {
    const withArticle = (done: boolean): ServerState => ({
      ...base,
      today: {
        ...base.today!, article: SUMMARY,
        quests: base.today!.quests.map((q) => (q.slot === 'article' && done ? { ...q, completedAt: '2026-10-10T13:00:00.000Z' } : q)),
      },
    });
    const onOpenQuest = jest.fn();
    const onOpenReading = jest.fn();
    const today = (server: ServerState) => withStore(testStore({ view: project(server, []) }), (
      <Today onSettings={jest.fn()} onOpenQuest={onOpenQuest} onOpenReading={onOpenReading} onSwap={jest.fn()} onPain={jest.fn()}
        onVanish={jest.fn()} onTraining={jest.fn()} onCheckin={jest.fn()} now={() => Date.UTC(2026, 9, 10, 13)} />
    ));
    const view = await render(today(withArticle(false)));
    await fireEvent.press(screen.getByText(SAMPLE_ARTICLE.title));
    expect(onOpenQuest).toHaveBeenCalledWith(article.id);
    // Once cleared it waits under Done today; its row opens the article itself.
    await view.rerender(today(withArticle(true)));
    await fireEvent.press(screen.getByRole('button', { name: 'Done today · 1' }));
    await fireEvent.press(screen.getByText(SAMPLE_ARTICLE.title));
    expect(onOpenReading).toHaveBeenCalledWith(SAMPLE_ARTICLE.id);
  });
});

describe('Insight (decision 8)', () => {
  it('offers the topics and sends the choice; the choice can be changed', async () => {
    const onChoose = jest.fn();
    const view = await render(<InsightPanel insight={{ options: ['history', 'sleep'], chosen: null }} onChoose={onChoose} />);
    expect(screen.getByText(READING_TEXT.insight.line)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: `${CLUSTER_NAMES.history}. ${CLUSTER_LINES.history}` }));
    expect(onChoose).toHaveBeenCalledWith('history');
    await view.rerender(<InsightPanel insight={{ options: ['history', 'sleep'], chosen: 'history' }} onChoose={onChoose} />);
    expect(screen.getByText("Tomorrow's reading: History and decision-making.")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: READING_TEXT.insight.change }));
    expect(screen.getByRole('radio', { name: /Sleep and recovery/ })).toBeTruthy();
  });

  it('says so when no topic is waiting', async () => {
    await render(<InsightPanel insight={{ options: [], chosen: null }} onChoose={jest.fn()} />);
    expect(screen.getByText(READING_TEXT.insight.none)).toBeTruthy();
  });
});

describe('past readings (board D5, decision 7)', () => {
  const state: ServerState = {
    ...base,
    readings: [
      { ...SUMMARY, dayNumber: 1, date: '2026-10-10', takeaway: null },
      { id: 'article-9', cluster: 'sleep', title: 'The quiet power of a fixed wake time', minutes: 6, dayNumber: 0, date: '2026-10-09', takeaway: 'Wake at seven.' },
    ],
  };

  it("the Library lists the readings before today's, newest first, with the line saved that day, and opens one (M12)", async () => {
    const onOpenReading = jest.fn();
    await render(withStore(testStore({ view: project(state, []) }), <Library onOpenQuest={jest.fn()} onOpenReading={onOpenReading} onOpenCodex={jest.fn()} />));
    expect(screen.getByText(READING_TEXT.past.title)).toBeTruthy();
    expect(screen.queryByText(SAMPLE_ARTICLE.title)).toBeNull(); // today's (day 1) has its own place
    expect(screen.getByText(`Fri 9 Oct · ${CLUSTER_NAMES.sleep} · ${READING_TEXT.library.lineSaved}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /The quiet power of a fixed wake time/ }));
    expect(onOpenReading).toHaveBeenCalledWith('article-9', 0);
  });

  it('a past reading shows the article with the takeaway written that day', async () => {
    const store = testStore({ view: project(state, []), articles: { 'article-9': { ...SAMPLE_ARTICLE, id: 'article-9', deck: null } } });
    await render(withStore(store, <Reading articleId="article-9" onBack={jest.fn()} />));
    expect(screen.getByText('Past reading · Fri 9 Oct')).toBeTruthy();
    expect(screen.getByText('Wake at seven.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
    expect(store.getState().fetchArticle).toHaveBeenCalledWith('article-9'); // held without its deck: asked for (M11 review)
  });

  it('an evergreen reading read twice opens on the day chosen (review)', async () => {
    const twice: ServerState = {
      ...state,
      readings: [
        { id: 'article-9', cluster: 'sleep', title: 'Wake time', minutes: 6, dayNumber: 5, date: '2026-10-14', takeaway: 'Second.' },
        { id: 'article-9', cluster: 'sleep', title: 'Wake time', minutes: 6, dayNumber: 0, date: '2026-10-09', takeaway: 'First.' },
      ],
    };
    const store = testStore({ view: project(twice, []), articles: { 'article-9': { ...SAMPLE_ARTICLE, id: 'article-9', deck: null } } });
    await render(withStore(store, <Reading articleId="article-9" dayNumber={0} onBack={jest.fn()} />));
    expect(screen.getByText('Past reading · Fri 9 Oct')).toBeTruthy();
    expect(screen.getByText('First.')).toBeTruthy();
  });

  it('M11: a past reading with a Story Deck opens on its cover; Your turn shows the line written that day', async () => {
    const store = testStore({ view: project(state, []), articles: { 'article-9': { ...SAMPLE_ARTICLE, id: 'article-9' } } });
    await render(withStore(store, <Reading articleId="article-9" onBack={jest.fn()} />));
    expect(screen.getByTestId('deck-card-cover')).toBeTruthy();
    expect(screen.getByText('Past reading · Fri 9 Oct')).toBeTruthy();
    for (let i = 0; i < 5; i++) {
      await fireEvent.press(screen.getByRole('button', { name: READING_TEXT.deck.next }));
      await act(async () => { await new Promise((done) => setTimeout(done, 300)); }); // the card flies off first
    }
    expect(screen.getByTestId('deck-card-turn')).toBeTruthy();
    expect(screen.getByText(READING_TEXT.deck.yourLine)).toBeTruthy();
    expect(screen.getByText('Wake at seven.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
    expect(store.getState().fetchArticle).not.toHaveBeenCalled();
  });

  it('a past reading not on the phone is asked for', async () => {
    const store = testStore({ view: project(state, []) });
    await render(withStore(store, <Reading articleId="article-9" onBack={jest.fn()} />));
    expect(screen.getByText(READING_TEXT.missing)).toBeTruthy();
    expect(store.getState().fetchArticle).toHaveBeenCalledWith('article-9');
  });
});
