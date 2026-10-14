// The home-screen widget (M10c decision 9), drawn from its snapshot in the app's own look: the night, chalk words in
// Black Han Sans and Gothic A1, an ember streak. One tap anywhere opens the app. Only src/widget/ imports the library.
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { WIDGET_TEXT } from '@levelmeup/content';
import { widgetLines } from './snapshot.ts';
import type { WidgetSnapshot } from './snapshot.ts';

// The app's tokens (src/theme/tokens.ts), as the widget's hex type wants them.
const NIGHT = '#0E0E10';
const CHALK = '#F1ECE1';
const ASH = '#A8A196';
const EMBER = '#F0765E';
const LINE = '#4A4A50';
// The font files the config plugin copies (app.json), named by their file names.
const DISPLAY = 'BlackHanSans-Latin';
const BODY = 'GothicA1-Regular-Latin';
const BOLD = 'GothicA1-Bold-Latin';

export function TodayWidget({ snap, now }: { snap: WidgetSnapshot | null; now: number }) {
  const lines = widgetLines(snap, now);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={WIDGET_TEXT.label}
      style={{
        height: 'match_parent', width: 'match_parent', flexDirection: 'column', justifyContent: 'space-between',
        backgroundColor: NIGHT, borderRadius: 18, borderWidth: 2, borderColor: LINE, padding: 14,
      }}
    >
      {lines.kind === 'day' ? (
        <>
          <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextWidget text={lines.day} style={{ fontFamily: DISPLAY, fontSize: 18, color: CHALK, letterSpacing: 0.04 }} />
            <TextWidget text={lines.streak} style={{ fontFamily: BOLD, fontSize: 13, color: EMBER }} />
          </FlexWidget>
          <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
            <TextWidget text={lines.label} style={{ fontFamily: DISPLAY, fontSize: 11, color: ASH, letterSpacing: 0.14 }} />
            <TextWidget text={lines.title} maxLines={2} truncate="END"
              style={{ fontFamily: DISPLAY, fontSize: 20, color: lines.cleared ? EMBER : CHALK }} />
          </FlexWidget>
          <TextWidget text={lines.progress} style={{ fontFamily: BODY, fontSize: 13, color: ASH }} />
        </>
      ) : lines.kind === 'stale' ? (
        <>
          <TextWidget text={lines.line} maxLines={2} style={{ fontFamily: DISPLAY, fontSize: 20, color: CHALK }} />
          <TextWidget text={lines.hint} style={{ fontFamily: BODY, fontSize: 13, color: ASH }} />
        </>
      ) : (
        <TextWidget text={lines.line} maxLines={2} style={{ fontFamily: DISPLAY, fontSize: 18, color: CHALK }} />
      )}
    </FlexWidget>
  );
}
