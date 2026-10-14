// The widget's task (M10c decision 9): Android runs it without the app open, when the widget is added, resized, or every
// 30 minutes. It draws from the snapshot the app last kept, so the day's end turns it to "A new day is ready". A tap
// opens the app natively (OPEN_APP), so clicks need nothing here.
import kvStore from 'expo-sqlite/kv-store';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { WIDGET_KEY, readSnapshot } from './snapshot.ts';
import { TodayWidget } from './TodayWidget.tsx';

export type TaskDeps = { read: () => Promise<string | null>; now: () => number };

const realDeps: TaskDeps = { read: () => kvStore.getItem(WIDGET_KEY), now: Date.now };

export async function widgetTaskHandler(props: WidgetTaskHandlerProps, deps: TaskDeps = realDeps): Promise<void> {
  if (props.widgetAction === 'WIDGET_DELETED' || props.widgetAction === 'WIDGET_CLICK') return;
  const snap = readSnapshot(await deps.read().catch(() => null));
  props.renderWidget(<TodayWidget snap={snap} now={deps.now()} />);
}
