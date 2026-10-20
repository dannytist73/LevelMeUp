// The System's voice (Lantern, M11): a panel outlined in the accent, "System" written small at its top. Read by screen
// readers as one line, speaker first.
import { PLAY_TEXT } from '@levelmeup/content';
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, radius, space } from '../theme/tokens.ts';
import { Button } from './Button.tsx';
import { Body, Caption, Small } from './Text.tsx';

// Read as it draws, never into a constant at load: a Plus look swaps `colors` (M13).
const box = () => ({ borderRadius: radius.control, borderWidth: space.border, borderColor: colors.accent, backgroundColor: colors.panel });

function Speaker() {
  return (
    <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.3, color: colors.accentText }}>
      {PLAY_TEXT.speakers.system}
    </Text>
  );
}

export function NarrationBox({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityLabel={`${PLAY_TEXT.speakers.system}: ${children}`}
      style={[
        // M17 (design critique): a quiet edge; the accent outline is for the card you act on now.
        { gap: 6, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 14, ...box(), borderColor: colors.line },
        style,
      ]}
    >
      <Speaker />
      <Body weight="medium">{children}</Body>
    </View>
  );
}

export type SystemAction = { label: string; onPress: () => void };

/**
 * M17: a System note that asks something, as one card: its words, a line of detail, and its answers inside it. Before,
 * the box, its detail and its buttons stood apart on Today, three blocks for one question (emulator, 0.8.0). The words
 * read as one stop; each answer is its own button. Answers are quiet outlines and the card's edge is a quiet line, so Up
 * next stays the one card outlined in the accent with Today's one bright button (UX audit 2026-10-20, N6).
 */
export function SystemCard({ text, detail, actions = [], count, testID }: {
  text: string;
  detail?: string;
  actions?: readonly SystemAction[];
  /** "1 of 3" while more notes wait. */
  count?: string;
  testID?: string;
}) {
  return (
    <View testID={testID} style={{ gap: 14, padding: 16, ...box(), borderColor: colors.line }}>
      <View accessible accessibilityLabel={[`${PLAY_TEXT.speakers.system}: ${text}`, detail, count].filter((x) => x !== undefined).join(' ')} style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Speaker />
          {count !== undefined && <Caption>{count}</Caption>}
        </View>
        <Body weight="medium">{text}</Body>
        {detail !== undefined && <Small tone="ashLight">{detail}</Small>}
      </View>
      {actions.length > 0 && (
        // M17 (narrow-phone pass): each answer as wide as its words (at least 120 dp), the row's spare width shared out;
        // they stack only when both don't fit. Even halves squeezed a long answer onto two lines, and on a 360 dp phone
        // stacked even "Answer" and "Later".
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {actions.map((a) => <Button key={a.label} label={a.label} variant="secondary" onPress={a.onPress} style={{ flexGrow: 1, minWidth: 120 }} />)}
        </View>
      )}
    </View>
  );
}
