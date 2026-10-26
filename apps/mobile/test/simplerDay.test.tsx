// A simpler day (docs/2026-10-26-simpler-day.md): the camp's stages and friends, the visitor's cheer, "How did it feel?"
// for the quest just cleared, the story as one scroll that ends on lines to take with you, and Me's tab dot.
import { CAMP_TEXT, PLAY_TEXT, fillText } from '@levelmeup/content';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { campStage } from '../src/art/camp.ts';
import { SAMPLE_STORY_ARTICLE, SAMPLE_STORY_DECK } from '../src/dev/sampleArticle.ts';
import { project } from '../src/game/project.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import { storyLines } from '../src/reading/deck.ts';
import { FRIENDS_AT_FIRE } from '../src/screens/camp/CampScene.tsx';
import { Quest } from '../src/screens/Quest.tsx';
import { Today } from '../src/screens/Today.tsx';
import { InkTabBar } from '../src/ui/InkTabBar.tsx';
import { markJustCleared } from '../src/ui/justCleared.ts';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13); // inside day 1
const coreOf = (s: ServerState) => s.today!.quests.find((q) => q.slot === 'core')!;

describe('the camp', () => {
  it('grows from first nights to the cabin at 3 friends and the lodge at 10', () => {
    expect([0, 2, 3, 9, 10, 24].map(campStage)).toEqual(['first', 'first', 'cabin', 'cabin', 'lodge', 'lodge']);
  });

  it(`draws at most ${FRIENDS_AT_FIRE} friends at the fire; the rest are in the book`, async () => {
    const s = serverState([]);
    const wins = Object.fromEntries(['snoozle', 'scrollo', 'laterpillar', 'knowitowl', 'fizzbit', 'pingle', 'slumpkin', 'skimmy'].map((id) => [id, 1]));
    await render(withStore(testStore({ view: project({ ...s, camp: { wins, last: null } }, []) }), <Today onOpenQuest={jest.fn()} onDay={jest.fn()} now={() => NOW} />));
    expect(screen.getAllByRole('button', { name: /, a friend\. Tap to hear it\.$/ })).toHaveLength(FRIENDS_AT_FIRE);
  });

  it('the visitor cheers when power lands while Camp is in front', async () => {
    const view = project(serverState([]), []);
    const store = testStore({ view });
    await render(withStore(store, <Today onOpenQuest={jest.fn()} onDay={jest.fn()} now={() => NOW} />));
    expect(within(screen.getByTestId('camp-bubble')).getByText(CAMP_TEXT.bubble.gift)).toBeTruthy();
    const core = coreOf(serverState([]));
    const cleared = { ...view, today: { ...view.today!, quests: view.today!.quests.map((q) => (q.id === core.id ? { ...q, completedAt: new Date(NOW).toISOString() } : q)) } };
    await act(async () => store.setState({ view: cleared }));
    expect(within(screen.getByTestId('camp-bubble')).getByText(CAMP_TEXT.bubble.cheer)).toBeTruthy();
  });
});

describe('"How did it feel?" for the quest just cleared', () => {
  afterEach(() => markJustCleared(null));

  it('asks once the quest screen cleared it; a rating is sent and the row goes', async () => {
    const s = serverState(['core']);
    const store = testStore({ view: project(s, []) });
    markJustCleared(coreOf(s).id);
    await render(withStore(store, <Today onOpenQuest={jest.fn()} onDay={jest.fn()} now={() => NOW} />));
    const row = within(screen.getByTestId('feel-row'));
    await fireEvent.press(row.getByRole('button', { name: PLAY_TEXT.cleared.easy }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'rate', instanceId: coreOf(s).id, rating: 'easy' });
    expect(screen.queryByTestId('feel-row')).toBeNull();
  });

  it('never for a quest that is not cleared, and never unasked', async () => {
    const s = serverState([]);
    markJustCleared(coreOf(s).id);
    await render(withStore(testStore({ view: project(s, []) }), <Today onOpenQuest={jest.fn()} onDay={jest.fn()} now={() => NOW} />));
    expect(screen.queryByTestId('feel-row')).toBeNull();
    await act(async () => markJustCleared(null));
    await render(withStore(testStore({ view: project(serverState(['core']), []) }), <Today onOpenQuest={jest.fn()} onDay={jest.fn()} now={() => NOW} />));
    expect(screen.queryByTestId('feel-row')).toBeNull();
  });
});

describe('the story as one scroll (decision 10)', () => {
  it("offers why it works, the lesson and what to try as lines to take, each one the server would take", () => {
    expect(storyLines(SAMPLE_STORY_DECK)).toEqual([SAMPLE_STORY_DECK.why.head, SAMPLE_STORY_DECK.lesson, SAMPLE_STORY_DECK.tryToday]);
    expect(storyLines({ ...SAMPLE_STORY_DECK, tryToday: 'x'.repeat(281) })).toHaveLength(2);
    expect(storyLines({ ...SAMPLE_STORY_DECK, lesson: SAMPLE_STORY_DECK.why.head })).toHaveLength(2);
  });

  it("today's reading reads top to bottom; one tap on a line claims it with that line and goes back to Camp", async () => {
    const base = serverState(['core']);
    const s: ServerState = { ...base, today: { ...base.today!, article: { id: SAMPLE_STORY_ARTICLE.id, cluster: SAMPLE_STORY_ARTICLE.cluster, title: SAMPLE_STORY_ARTICLE.title, minutes: 6 } } };
    const reading = s.today!.quests.find((q) => q.slot === 'article')!;
    const store = testStore({ view: project(s, []), articles: { [SAMPLE_STORY_ARTICLE.id]: SAMPLE_STORY_ARTICLE } });
    const pending: PhoneEvent[] = [];
    const enqueue = jest.fn(async (event: Omit<PhoneEvent, 'id'>) => {
      pending.push({ ...event, id: `00000000-0000-4000-8000-${String(pending.length + 1).padStart(12, '0')}` } as PhoneEvent);
      store.setState({ view: project(s, pending) });
    });
    store.setState({ enqueue: enqueue as never });
    const onCleared = jest.fn();
    await render(withStore(store, <Quest questId={reading.id} onBack={jest.fn()} onPain={jest.fn()} onCleared={onCleared} now={() => NOW} />));
    expect(screen.getByTestId('story-scroll')).toBeTruthy();
    for (const i of SAMPLE_STORY_DECK.story.keys()) expect(screen.getByTestId(`story-part-${i}`)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: fillText(CAMP_TEXT.story.read, { n: 0 }) })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: SAMPLE_STORY_DECK.lesson }));
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', instanceId: reading.id, payload: { text: SAMPLE_STORY_DECK.lesson } }));
    expect(onCleared).toHaveBeenCalled();
  });

  it('"Write my own" opens the field, as before', async () => {
    const base = serverState(['core']);
    const s: ServerState = { ...base, today: { ...base.today!, article: { id: SAMPLE_STORY_ARTICLE.id, cluster: SAMPLE_STORY_ARTICLE.cluster, title: SAMPLE_STORY_ARTICLE.title, minutes: 6 } } };
    const reading = s.today!.quests.find((q) => q.slot === 'article')!;
    await render(withStore(testStore({ view: project(s, []), articles: { [SAMPLE_STORY_ARTICLE.id]: SAMPLE_STORY_ARTICLE } }),
      <Quest questId={reading.id} onBack={jest.fn()} onPain={jest.fn()} now={() => NOW} />));
    await fireEvent.press(screen.getByRole('button', { name: CAMP_TEXT.story.own }));
    expect(screen.getByLabelText('Your takeaway, one sentence')).toBeTruthy();
  });
});

describe("Me's tab dot", () => {
  it('shows while something waits on the Set up list, and is said after the tab\'s name', async () => {
    await render(<InkTabBar tabs={[{ key: 'index', label: 'Camp', icon: 'camp' }, { key: 'character', label: 'Me', icon: 'user', dot: CAMP_TEXT.setUp.dot }]}
      active="index" onSelect={jest.fn()} />);
    expect(screen.getByTestId('tab-dot-character')).toBeTruthy();
    expect(screen.getByRole('tab', { name: `Me. ${CAMP_TEXT.setUp.dot}` })).toBeTruthy();
    expect(screen.queryByTestId('tab-dot-index')).toBeNull();
  });
});
