import { PLAY_TEXT, READING_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SAMPLE_ARTICLE } from '../src/dev/sampleArticle.ts';
import { project } from '../src/game/project.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
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

async function renderReading(server: ServerState, held: boolean) {
  const pending: PhoneEvent[] = [];
  const store = testStore({ view: project(server, []), articles: held ? { [SAMPLE_ARTICLE.id]: SAMPLE_ARTICLE } : {} });
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
    expect(screen.getByText('6 MIN · WISDOM +10 XP')).toBeTruthy();
    expect(screen.getByText('DISCIPLINE AND HABITS')).toBeTruthy();
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
    await fireEvent.press(screen.getByRole('button', { name: 'Claim +10 XP' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'complete', instanceId: articleId, completedAt: NOW, rating: null, payload: { text: 'Small wins are evidence.' } });
  });

  it('after the claim: "Quest cleared" without a rating, and Read again', async () => {
    const { onRead } = await renderReading(WITH_ARTICLE, true);
    await fireEvent.changeText(screen.getByLabelText(READING_TEXT.takeawayLabel), 'Small wins are evidence.');
    await fireEvent.press(screen.getByRole('button', { name: 'Claim +10 XP' }));
    expect(screen.queryByRole('button', { name: PLAY_TEXT.cleared.easy })).toBeNull();
    expect(screen.getByText("TODAY'S READING · DISCIPLINE AND HABITS")).toBeTruthy(); // not the slot twice
    await fireEvent.press(screen.getByRole('button', { name: READING_TEXT.readAgain }));
    expect(onRead).toHaveBeenCalledWith(SAMPLE_ARTICLE.id);
  });

  it('an article not on the phone yet is asked for, and the screen says it is on its way', async () => {
    const { store } = await renderReading(WITH_ARTICLE, false);
    expect(screen.getByText(READING_TEXT.waiting)).toBeTruthy();
    expect(store.getState().fetchArticle).toHaveBeenCalledWith(SAMPLE_ARTICLE.id);
    expect(screen.queryByRole('button', { name: 'Claim +10 XP' })).toBeNull();
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
