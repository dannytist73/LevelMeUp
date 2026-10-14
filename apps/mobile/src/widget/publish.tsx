// Keeps the widget in step with the game (M10c decision 9): whenever the view changes, the app writes the widget's
// snapshot and asks Android to redraw it, but only when the snapshot itself changed. The character's deletion (the view
// going away) clears it. Android only; elsewhere it does nothing.
import kvStore from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { Shown } from '../game/project.ts';
import { WIDGET_KEY, WIDGET_NAME, widgetSnapshot } from './snapshot.ts';
import type { WidgetSnapshot } from './snapshot.ts';
import { TodayWidget } from './TodayWidget.tsx';

export type PublishDeps = {
  kv: { setItem: (key: string, value: string) => Promise<void>; removeItem: (key: string) => Promise<void> };
  redraw: (snap: WidgetSnapshot | null) => Promise<void>;
};

export function makeWidgetPublisher(deps: PublishDeps) {
  let last: string | null | undefined;
  return async (view: Shown | null): Promise<void> => {
    const snap = widgetSnapshot(view);
    const text = snap === null ? null : JSON.stringify(snap);
    if (text === last) return;
    last = text;
    await (text === null ? deps.kv.removeItem(WIDGET_KEY) : deps.kv.setItem(WIDGET_KEY, text)).catch(() => {});
    await deps.redraw(snap).catch(() => {});
  };
}

export const publishWidget: (view: Shown | null) => Promise<void> = Platform.OS === 'android'
  ? makeWidgetPublisher({
    kv: kvStore,
    redraw: (snap) => requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <TodayWidget snap={snap} now={Date.now()} />,
      widgetNotFound: () => {},
    }),
  })
  : async () => {};
