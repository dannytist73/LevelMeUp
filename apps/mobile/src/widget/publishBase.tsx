// Keeps the widget in step with the base app: when its three lines change, Android redraws it. Android only.
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { BaseWidget } from './BaseWidget.tsx';
import type { BaseWidgetLines } from './BaseWidget.tsx';
import { WIDGET_NAME } from './snapshot.ts';

let last: string | undefined;

export async function publishBaseWidget(lines: BaseWidgetLines): Promise<void> {
  if (Platform.OS !== 'android') return;
  const key = JSON.stringify(lines);
  if (key === last) return;
  last = key;
  await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => <BaseWidget lines={lines} />, widgetNotFound: () => {} }).catch(() => {});
}
