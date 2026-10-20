// The reader (board D3; M8b decision 5): the label and the reading time, the topic, the title and the summary; each
// section with its source numbers and the System's note; the takeaways and the question; then `footer` (the claim, or the
// takeaway written that day); the sources last, each opening in the browser.
import { CLUSTER_NAMES, READING_TEXT, fillText } from '@levelmeup/content';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Tap } from '../../ui/Tap.tsx';
import type { ArticleBody } from '../../game/types.ts';
import { colors, radius } from '../../theme/tokens.ts';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { Body, Caption, Heading, Label, Small, Title } from '../../ui/Text.tsx';

const R = READING_TEXT;

export type ReaderProps = {
  article: ArticleBody;
  /** "Today's reading", or "Past reading · Fri 9 Oct". */
  label: string;
  /** The quest's XP, shown beside the minutes; null for a past reading. */
  xp: number | null;
  footer?: ReactNode;
  onOpenSource: (url: string) => void;
};

export function Reader({ article, label, xp, footer, onOpenSource }: ReaderProps) {
  const meta = xp === null ? `${article.minutes} min` : fillText(R.meta, { minutes: article.minutes, xp });
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 8 }}>
        <Label tone="accentText">{label}</Label>
        <Label>{`${meta} · ${CLUSTER_NAMES[article.cluster]}`}</Label>
        <Title accessibilityRole="header">{article.title}</Title>
        <Body weight="medium">{article.summary}</Body>
      </View>
      {article.sections.map((s, i) => (
        <View key={i} style={{ gap: 10 }}>
          <Heading>{s.heading}</Heading>
          {s.paragraphs.map((p, j) => <Body key={j}>{p}</Body>)}
          {s.sources.length > 0 && (
            <Caption accessibilityLabel={fillText(R.sourceMarks, { list: s.sources.join(', ') })}>
              {s.sources.map((n) => `[${n}]`).join(' ')}
            </Caption>
          )}
          {s.systemNote !== null && <NarrationBox>{s.systemNote}</NarrationBox>}
        </View>
      ))}
      <View style={{ gap: 10, padding: 16, borderRadius: radius.card, backgroundColor: colors.panel }}>
        <Label>{R.takeaways}</Label>
        {article.takeaways.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Heading tone="accentText">{String(i + 1)}</Heading>
            <Body style={{ flex: 1 }}>{t}</Body>
          </View>
        ))}
      </View>
      <View style={{ gap: 6 }}>
        <Label>{R.question}</Label>
        <Body weight="medium">{article.question}</Body>
      </View>
      {footer}
      {article.sources.length > 0 && (
        <View style={{ gap: 8 }}>
          <Label>{R.sources}</Label>
          {article.sources.map((s) => {
            const line = fillText(R.sourceLine, { n: s.n, title: s.title, host: s.host });
            return (
              <Tap
                key={s.n}
                accessibilityRole="link"
                accessibilityLabel={line}
                accessibilityHint={fillText(R.sourceHint, { host: s.host })}
                onPress={() => onOpenSource(s.url)}
                radius={radius.small}
                style={{ minHeight: 48, justifyContent: 'center' }}
              >
                <Small tone="chalk">{line}</Small>
              </Tap>
            );
          })}
        </View>
      )}
    </View>
  );
}
