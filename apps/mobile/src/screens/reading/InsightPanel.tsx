// The Mage's Insight on Today (M8b decision 8): choose tomorrow's reading from up to 3 topics; the choice shows at once
// and can be changed until the day ends.
import { CLUSTER_LINES, CLUSTER_NAMES, READING_TEXT, fillText } from '@levelmeup/content';
import type { ArticleCluster } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import type { InsightView } from '../../game/types.ts';
import { Button } from '../../ui/Button.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
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
            {options.map((k) => (
              <OptionCard
                key={k}
                label={CLUSTER_NAMES[k]}
                detail={CLUSTER_LINES[k]}
                selected={chosen === k}
                onPress={() => {
                  setPicking(false);
                  if (k !== chosen) onChoose(k);
                }}
              />
            ))}
          </>
        )}
      </View>
    </NightCard>
  );
}
