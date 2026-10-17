// The home-screen widget (M10c decision 9), drawn from its snapshot in the app's own look: the night, chalk words in
// Black Han Sans and Gothic A1, the accent's streak. One tap anywhere opens the app. Only src/widget/ imports the library.
// The library builds its own tree from these elements and calls each one's type: no fragments (emulator check: a
// fragment drew nothing and threw "Symbol(react.fragment) is not a function"), so children are arrays with keys.
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { WIDGET_TEXT } from '@levelmeup/content';
import { widgetLines } from './snapshot.ts';
import type { WidgetSnapshot } from './snapshot.ts';

// The app's tokens (src/theme/tokens.ts), as the widget's hex type wants them.
const NIGHT = '#171A2B';
const CHALK = '#F1F0F7';
const ASH = '#A4AAC8';
const ACCENT = '#BAC3FF';
const LINE = '#383F63';
// The font files the config plugin copies (app.json), named by their file names.
const DISPLAY = 'BlackHanSans-Latin';
const BODY = 'GothicA1-Regular-Latin';
const BOLD = 'GothicA1-Bold-Latin';

export function TodayWidget({ snap, now }: { snap: WidgetSnapshot | null; now: number }) {
  const lines = widgetLines(snap, now);
  const children = lines.kind === 'day'
    ? [
      <FlexWidget key="top" style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={lines.day} style={{ fontFamily: DISPLAY, fontSize: 18, color: CHALK, letterSpacing: 0.04 }} />
        <TextWidget text={lines.streak} style={{ fontFamily: BOLD, fontSize: 13, color: ACCENT }} />
      </FlexWidget>,
      <FlexWidget key="quest" style={{ width: 'match_parent', flexDirection: 'column' }}>
        {[
          ...(lines.label === null ? [] : [<TextWidget key="label" text={lines.label} style={{ fontFamily: DISPLAY, fontSize: 11, color: ASH, letterSpacing: 0.14 }} />]),
          <TextWidget key="title" text={lines.title} maxLines={2} truncate="END" style={{ fontFamily: DISPLAY, fontSize: 20, color: lines.cleared ? ACCENT : CHALK }} />,
        ]}
      </FlexWidget>,
      <TextWidget key="progress" text={lines.progress} style={{ fontFamily: BODY, fontSize: 13, color: ASH }} />,
    ]
    : lines.kind === 'stale'
      ? [
        <TextWidget key="line" text={lines.line} maxLines={2} style={{ fontFamily: DISPLAY, fontSize: 20, color: CHALK }} />,
        <TextWidget key="hint" text={lines.hint} style={{ fontFamily: BODY, fontSize: 13, color: ASH }} />,
      ]
      : [<TextWidget key="line" text={lines.line} maxLines={2} style={{ fontFamily: DISPLAY, fontSize: 18, color: CHALK }} />];
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={WIDGET_TEXT.label}
      style={{
        height: 'match_parent', width: 'match_parent', flexDirection: 'column', justifyContent: 'space-between',
        backgroundColor: NIGHT, borderRadius: 18, borderWidth: 2, borderColor: LINE, padding: 14,
      }}
    >
      {children}
    </FlexWidget>
  );
}
