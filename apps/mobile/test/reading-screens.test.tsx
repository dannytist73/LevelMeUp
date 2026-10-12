import { CLUSTER_LINES, CLUSTER_NAMES, READING_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SAMPLE_ARTICLE } from '../src/dev/sampleArticle.ts';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { Chronicle } from '../src/screens/Chronicle.tsx';
import { Reading } from '../src/screens/Reading.tsx';
import { InsightPanel } from '../src/screens/reading/InsightPanel.tsx';
import { ReadingCard } from '../src/screens/reading/ReadingCard.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const SUMMARY = { id: SAMPLE_ARTICLE.id, cluster: SAMPLE_ARTICLE.cluster, title: SAMPLE_ARTICLE.title, minutes: SAMPLE_ARTICLE.minutes };
const base = serverState();
const article = base.today!.quests.find((q) => q.slot === 'article')!;

describe("Today's reading card (board D1)", () => {
  it('shows the title, the minutes and XP, and Read', async () => {
    const onOpen = jest.fn();
    await render(<ReadingCard quest={article} article={SUMMARY} waiting={false} onOpen={onOpen} />);
    expect(screen.getByText(SAMPLE_ARTICLE.title)).toBeTruthy();
    expect(screen.getByText('6 min · Wisdom +10 XP · one takeaway')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: READING_TEXT.read }));
    expect(onOpen).toHaveBeenCalled();
  });

  it('says it waits while the day has no article, and shows a cleared reading', async () => {
    const view = await render(<ReadingCard quest={article} article={null} waiting={false} onOpen={jest.fn()} />);
    expect(screen.getByText(/Today's reading opens once the daily articles arrive/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: READING_TEXT.read })).toBeNull();
    await view.rerender(<ReadingCard quest={{ ...article, completedAt: '2026-10-10T13:00:00.000Z' }} article={SUMMARY} waiting={false} onOpen={jest.fn()} />);
    expect(screen.getByText('Cleared +10')).toBeTruthy();
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

  it("lists the readings before today's, newest first, and opens one", async () => {
    const onOpenReading = jest.fn();
    await render(withStore(testStore({ view: project(state, []) }), <Chronicle onOpenReading={onOpenReading} />));
    expect(screen.getByText(READING_TEXT.past.title)).toBeTruthy(); // SectionTitle capitalises it in its style
    expect(screen.queryByText(SAMPLE_ARTICLE.title)).toBeNull(); // today's (day 1) is on Today
    await fireEvent.press(screen.getByRole('button', { name: /The quiet power of a fixed wake time/ }));
    expect(onOpenReading).toHaveBeenCalledWith('article-9');
  });

  it('a past reading shows the article with the takeaway written that day', async () => {
    const store = testStore({ view: project(state, []), articles: { 'article-9': { ...SAMPLE_ARTICLE, id: 'article-9' } } });
    await render(withStore(store, <Reading articleId="article-9" onBack={jest.fn()} />));
    expect(screen.getByText('Past reading · Fri 9 Oct')).toBeTruthy();
    expect(screen.getByText('Wake at seven.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
  });

  it('a past reading not on the phone is asked for', async () => {
    const store = testStore({ view: project(state, []) });
    await render(withStore(store, <Reading articleId="article-9" onBack={jest.fn()} />));
    expect(screen.getByText(READING_TEXT.missing)).toBeTruthy();
    expect(store.getState().fetchArticle).toHaveBeenCalledWith('article-9');
  });
});
