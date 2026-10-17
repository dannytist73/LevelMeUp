// M10c decision 9: the home-screen widget: its snapshot, its lines by the time, its drawing, its task and how the app
// keeps it in step. The library itself is mocked in the Jest setup (its primitives draw as views and text).
import { WIDGET_TEXT, authoredTemplate, fillText } from '@levelmeup/content';
import { render, screen } from '@testing-library/react-native';
import { Fragment } from 'react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { project } from '../src/game/project.ts';
import { makeWidgetPublisher } from '../src/widget/publish.tsx';
import { WIDGET_KEY, readSnapshot, widgetLines, widgetSnapshot } from '../src/widget/snapshot.ts';
import type { WidgetSnapshot } from '../src/widget/snapshot.ts';
import { widgetTaskHandler } from '../src/widget/taskHandler.tsx';
import { TodayWidget } from '../src/widget/TodayWidget.tsx';
import { serverState } from './support/fixtures.ts';

const SNAP: WidgetSnapshot = { day: 6, streak: 5, core: 'Wall push-ups', coreCleared: false, done: 1, total: 4, endsAt: 2_000 };

describe('the snapshot', () => {
  it("holds the day, the streak as Today shows it, the core quest in the player's voice, and the count", () => {
    const s = serverState(['core'], { streak_current: 5, streak_best: 5 });
    const view = project(s, []);
    const core = s.today!.quests.find((q) => q.slot === 'core')!;
    expect(widgetSnapshot(view)).toEqual({
      day: 1, streak: 6, core: authoredTemplate(core.templateId).voice.system.title, coreCleared: true,
      done: 1, total: s.today!.quests.length, endsAt: Date.parse(s.today!.endsAt!),
    });
    expect(widgetSnapshot(null)).toBeNull();
    expect(widgetSnapshot({ ...view, today: null })).toBeNull();
  });

  it('reads back only a whole snapshot', () => {
    expect(readSnapshot(JSON.stringify(SNAP))).toEqual(SNAP);
    expect(readSnapshot(null)).toBeNull();
    expect(readSnapshot('nope')).toBeNull();
    expect(readSnapshot(JSON.stringify({ ...SNAP, day: '6' }))).toBeNull();
  });
});

describe('the lines, by when it is drawn', () => {
  it('a day: the day, the streak, the core quest and the count', () => {
    expect(widgetLines(SNAP, 1_000)).toEqual({
      kind: 'day', day: 'Day 6', streak: '5-day streak', label: WIDGET_TEXT.core, title: 'Wall push-ups', progress: '1 of 4 cleared', cleared: false,
    });
  });

  it('every quest cleared: "Day cleared"; the core quest cleared alone shows its title, in ember', () => {
    expect(widgetLines({ ...SNAP, done: 4, coreCleared: true }, 1_000)).toMatchObject({ label: null, title: WIDGET_TEXT.dayCleared, cleared: true });
    expect(widgetLines({ ...SNAP, coreCleared: true }, 1_000)).toMatchObject({ title: 'Wall push-ups', cleared: true });
  });

  it('after the day ends: a new day is ready; with nothing kept: open the app', () => {
    expect(widgetLines(SNAP, 2_000)).toEqual({ kind: 'stale', line: WIDGET_TEXT.newDay, hint: WIDGET_TEXT.open });
    expect(widgetLines(null, 0)).toEqual({ kind: 'none', line: WIDGET_TEXT.none });
  });
});

describe('the widget and its task', () => {
  it('draws the lines, labelled for TalkBack', async () => {
    await render(<TodayWidget snap={SNAP} now={1_000} />);
    expect(screen.getByLabelText(WIDGET_TEXT.label)).toBeTruthy();
    for (const text of ['Day 6', '5-day streak', WIDGET_TEXT.core, 'Wall push-ups', fillText(WIDGET_TEXT.progress, { done: 1, total: 4 })]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it("holds only the library's primitives: no fragments, which its tree builder can't draw (emulator check)", () => {
    const types: unknown[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node === null || typeof node !== 'object' || !('type' in node)) return;
      const element = node as { type: unknown; props: { children?: unknown } };
      types.push(element.type);
      walk(element.props.children);
    };
    for (const [snap, now] of [[SNAP, 1_000], [SNAP, 3_000], [null, 0]] as const) walk(TodayWidget({ snap, now }));
    expect(types.length).toBeGreaterThan(5);
    expect(types.every((t) => typeof t === 'function')).toBe(true);
    expect(types).not.toContain(Fragment);
  });

  it('the task draws from the kept snapshot when added, updated or resized; not when deleted or tapped', async () => {
    const renderWidget = jest.fn();
    const deps = { read: jest.fn(async () => JSON.stringify(SNAP)), now: () => 3_000 };
    const info = { widgetName: 'Today', widgetId: 1, width: 250, height: 110, screenInfo: {} } as never;
    for (const widgetAction of ['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED'] as const) {
      await widgetTaskHandler({ widgetInfo: info, widgetAction, renderWidget }, deps);
    }
    expect(renderWidget).toHaveBeenCalledTimes(3);
    await render(renderWidget.mock.calls[0]![0]);
    expect(screen.getByText(WIDGET_TEXT.newDay)).toBeTruthy(); // 3 000 is past the snapshot's end
    for (const widgetAction of ['WIDGET_DELETED', 'WIDGET_CLICK'] as const) {
      await widgetTaskHandler({ widgetInfo: info, widgetAction, renderWidget }, deps);
    }
    expect(renderWidget).toHaveBeenCalledTimes(3);
  });

  it('the task draws "open the app" when the phone keeps nothing or can\'t read it', async () => {
    const renderWidget = jest.fn();
    await widgetTaskHandler({ widgetInfo: {} as never, widgetAction: 'WIDGET_ADDED', renderWidget }, { read: async () => { throw new Error('locked'); }, now: () => 0 });
    await render(renderWidget.mock.calls[0]![0]);
    expect(screen.getByText(WIDGET_TEXT.none)).toBeTruthy();
  });
});

describe('the app keeps it in step', () => {
  it('writes the snapshot and redraws only when it changed; the view going away clears it', async () => {
    const kv = { setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) };
    const redraw = jest.fn(async () => {});
    const publish = makeWidgetPublisher({ kv, redraw });
    const view = project(serverState(['core']), []);
    await publish(view);
    await publish({ ...view }); // a new view with the same day: nothing to redraw
    expect(kv.setItem).toHaveBeenCalledTimes(1);
    expect(kv.setItem).toHaveBeenCalledWith(WIDGET_KEY, JSON.stringify(widgetSnapshot(view)));
    expect(redraw).toHaveBeenCalledTimes(1);
    await publish(project(serverState(['core', 'side1']), []));
    expect(redraw).toHaveBeenCalledTimes(2);
    await publish(null);
    expect(kv.removeItem).toHaveBeenCalledWith(WIDGET_KEY);
    expect(redraw).toHaveBeenLastCalledWith(null);
  });

  it("a failing store or redraw never throws into the app", async () => {
    const publish = makeWidgetPublisher({
      kv: { setItem: async () => { throw new Error('full'); }, removeItem: async () => {} },
      redraw: async () => { throw new Error('no widget'); },
    });
    await expect(publish(project(serverState(), []))).resolves.toBeUndefined();
  });
});

describe('only src/widget/ and the entry use the widget library', () => {
  it('holds for every app source file', () => {
    const root = join(__dirname, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) files.push(path);
      }
    };
    walk(join(root, 'src'));
    walk(join(root, 'app'));
    const users = files
      .filter((f) => readFileSync(f, 'utf8').includes("from 'react-native-android-widget'"))
      .map((f) => relative(root, f).replace(/\\/g, '/'));
    expect(users.length).toBeGreaterThan(0);
    expect(users.filter((f) => !f.startsWith('src/widget/'))).toEqual([]);
  });
});
