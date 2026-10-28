// The home-screen widget for the base app (docs/2026-10-28-base-app.md): the next workout, the next chapter and today's
// food, in Graphite and Geist. One tap opens the app. As in TodayWidget, children are arrays with keys (no fragments).
import { BASE_TEXT } from '@levelmeup/content';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Graphite (src/base/theme.ts), as the widget's hex type wants it.
const BG = '#111315';
const TEXT = '#F2F4F7';
const MUTED = '#A3ABB6';
const ACCENT = '#8FB2FF';
const LINE = '#2C3138';
// The font files the config plugin copies (app.json), named by their file names.
const BOLD = 'Geist-SemiBold-Latin';
const BODY = 'Geist-Regular-Latin';

export type BaseWidgetLines = { train: string; read: string; eat: string } | null;

export function BaseWidget({ lines }: { lines: BaseWidgetLines }) {
  const rows = lines === null
    ? [<TextWidget key="none" text={BASE_TEXT.widget.noPlan} maxLines={2} style={{ fontFamily: BOLD, fontSize: 16, color: TEXT }} />]
    : [
      <TextWidget key="train" text={lines.train} maxLines={2} style={{ fontFamily: BOLD, fontSize: 16, color: TEXT }} />,
      <TextWidget key="read" text={lines.read} maxLines={2} style={{ fontFamily: BODY, fontSize: 14, color: ACCENT }} />,
      <TextWidget key="eat" text={lines.eat} style={{ fontFamily: BODY, fontSize: 13, color: MUTED }} />,
    ];
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={BASE_TEXT.widget.label}
      style={{
        height: 'match_parent', width: 'match_parent', flexDirection: 'column', justifyContent: 'space-between',
        backgroundColor: BG, borderRadius: 18, borderWidth: 1, borderColor: LINE, padding: 14,
      }}
    >
      {rows}
    </FlexWidget>
  );
}
