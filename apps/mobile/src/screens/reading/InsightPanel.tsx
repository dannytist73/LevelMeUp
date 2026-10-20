// The Mage's Insight on Today (M8b decision 8): choose tomorrow's reading from up to 3 topics; the choice shows at once
// and can be changed until the day ends. M17: the topics as pills.
import { CLUSTER_LINES, CLUSTER_NAMES, READING_TEXT, fillText } from '@levelmeup/content';
import type { ArticleCluster } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import type { InsightView } from '../../game/types.ts';
import { Button } from '../../ui/Button.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Tap } from '../../ui/Tap.tsx';
import { Body, Heading, Small } from '../../ui/Text.tsx';

const I = READING_TEXT.insight;

export function InsightPanel({ insight, onChoose }: { insight: InsightView; onChoose: (cluster: ArticleCluster) => void }) {
  const [picking, setPicking] = useState(false);
  const { chosen, options } = insight;
  return (
    <NightCard>
      <View style={{ gap: 10 }}>
        <Heading tone="accentText">{I.title}</Heading>
        {chosen !== null && !picking ? (
          <>
            <Body weight="medium">{fillText(I.chosen, { topic: CLUSTER_NAMES[chosen] })}</Body>
            <Button label={I.change} variant="secondary" onPress={() => setPicking(true)} style={{ alignSelf: 'flex-start' }} />
          </>
        ) : options.length === 0 ? (
          <Small>{I.none}</Small>
        ) : (
          <>
            <Small>{I.line}</Small>
            {/* M17 (UX audit N12): the topics as pills, not three tall cards in the middle of Today; each says what it
                covers to a screen reader. */}
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {options.map((k) => (
                <Tap
                  key={k}
                  accessibilityRole="radio"
                  accessibilityLabel={`${CLUSTER_NAMES[k]}. ${CLUSTER_LINES[k]}`}
                  accessibilityState={{ checked: chosen === k }}
                  onPress={() => {
                    setPicking(false);
                    if (k !== chosen) onChoose(k);
                  }}
                  radius={radius.pill}
                  style={{
                    minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: space.border,
                    borderColor: chosen === k ? colors.paper : colors.lineStrong, backgroundColor: chosen === k ? colors.paper : 'transparent',
                  }}
                >
                  <Body weight="bold" tone={chosen === k ? 'ink' : 'chalk'}>{CLUSTER_NAMES[k]}</Body>
                </Tap>
              ))}
            </View>
          </>
        )}
      </View>
    </NightCard>
  );
}
