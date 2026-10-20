// M12 phase 4: the Library tab (plan decision 1, board R3-5; audit 18).
import { READING_TEXT, fillText } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SAMPLE_ARTICLE } from '../src/dev/sampleArticle.ts';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { LIBRARY_LESSONS, Library } from '../src/screens/Library.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const L = READING_TEXT.library;
const SUMMARY = { id: SAMPLE_ARTICLE.id, cluster: SAMPLE_ARTICLE.cluster, title: SAMPLE_ARTICLE.title, minutes: SAMPLE_ARTICLE.minutes };
const base = serverState();
const article = base.today!.quests.find((q) => q.slot === 'article')!;
const withArticle = (done: boolean): ServerState => ({
  ...base,
  today: { ...base.today!, article: SUMMARY, quests: base.today!.quests.map((q) => (q.slot === 'article' && done ? { ...q, completedAt: '2026-10-10T13:00:00.000Z' } : q)) },
});
const lesson = (n: number) => ({ articleId: `article-${n}`, title: `Reading ${n}`, lesson: `Lesson ${n}.`, keptAt: n });

async function renderLibrary(server: ServerState, over: Parameters<typeof testStore>[0] = {}) {
  const props = { onOpenQuest: jest.fn(), onOpenReading: jest.fn(), onOpenCodex: jest.fn() };
  jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 10, 13));
  await render(withStore(testStore({ view: project(server, []), ...over }), <Library {...props} />));
  return props;
}

describe('the Library (M12 decision 1)', () => {
  it("is a tab of its own: today's reading to read and claim", async () => {
    const props = await renderLibrary(withArticle(false));
    expect(screen.getByRole('header', { name: L.title })).toBeTruthy();
    expect(screen.getByText(new RegExp(`^${READING_TEXT.label} · `))).toBeTruthy(); // M17: the card's own line, no heading above it
    await fireEvent.press(screen.getByText(READING_TEXT.read));
    expect(props.onOpenQuest).toHaveBeenCalledWith(article.id);
  });

  it('says "Open the cards" once the phone holds its Story Deck', async () => {
    await renderLibrary(withArticle(false), { articles: { [SAMPLE_ARTICLE.id]: SAMPLE_ARTICLE } });
    expect(screen.getByText(L.openCards)).toBeTruthy();
  });

  it("once claimed, today's reading opens again", async () => {
    const props = await renderLibrary(withArticle(true));
    await fireEvent.press(screen.getByText(SAMPLE_ARTICLE.title));
    expect(props.onOpenReading).toHaveBeenCalledWith(SAMPLE_ARTICLE.id, null);
  });

  it("the kept lessons, each opening its reading's cards; See all opens the Codex", async () => {
    const codex = [lesson(5), lesson(4), lesson(3), lesson(2), lesson(1)];
    const props = await renderLibrary(withArticle(false), { codex });
    expect(screen.getByText(fillText(L.kept, { n: 5 }))).toBeTruthy();
    expect(screen.getAllByText(/^Lesson \d\.$/)).toHaveLength(LIBRARY_LESSONS);
    await fireEvent.press(screen.getByText('Lesson 5.'));
    expect(props.onOpenReading).toHaveBeenCalledWith('article-5', null);
    await fireEvent.press(screen.getByRole('button', { name: fillText(L.seeAll, { n: 5 }) }));
    expect(props.onOpenCodex).toHaveBeenCalled();
  });

  it('with none kept: says how; the card above is the one way in to today (M17: no second button)', async () => {
    await renderLibrary(withArticle(false));
    expect(screen.getByText(L.noKept)).toBeTruthy();
    expect(screen.getByText(L.noKeptLine)).toBeTruthy();
    expect(screen.queryByRole('button', { name: L.openToday })).toBeNull();
  });

  it('waits for the article while the day has none', async () => {
    await renderLibrary(base);
    expect(screen.getByText(/Today's reading opens once the daily articles arrive/)).toBeTruthy();
  });
});

describe('past readings in the Library (M17)', () => {
  it('shows the latest five; Show all opens the rest in place', async () => {
    const readings = Array.from({ length: 7 }, (_, i) => ({
      id: `article-p${i}`, cluster: 'sleep' as const, title: `Past ${i}`, minutes: 5, dayNumber: -i, date: `2026-10-0${9 - i}`, takeaway: null,
    }));
    await renderLibrary({ ...base, readings });
    expect(screen.getByText('Past 4')).toBeTruthy();
    expect(screen.queryByText('Past 5')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: fillText(READING_TEXT.past.showAll, { n: 7 }) }));
    expect(screen.getByText('Past 6')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: READING_TEXT.past.fewer }));
    expect(screen.queryByText('Past 6')).toBeNull();
  });
});
