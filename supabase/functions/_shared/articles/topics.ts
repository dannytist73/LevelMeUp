// Which topics the next jobs take (spec §4.1 "rotating through about 8 topic clusters", M8a decision 6): the cluster
// queued least recently first (never-queued ones first, in the content's order), and in it the first topic never
// queued. A cluster whose topics are all used is skipped.
import { ARTICLE_CLUSTERS, ARTICLE_TOPICS } from '../../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../../packages/content/src/index.ts';

export type UsedTopic = { cluster: ArticleCluster; topic: string; queuedAtMs: number };
export type TopicPick = { cluster: ArticleCluster; topic: string };

export function chooseTopics(used: readonly UsedTopic[], count: number): TopicPick[] {
  const taken = new Set(used.map((u) => `${u.cluster}\n${u.topic}`));
  const last = new Map<ArticleCluster, number>();
  for (const u of used) last.set(u.cluster, Math.max(last.get(u.cluster) ?? -1, u.queuedAtMs));
  const order = [...ARTICLE_CLUSTERS].sort((a, b) => (last.get(a) ?? -1) - (last.get(b) ?? -1));
  const picks: TopicPick[] = [];
  let found = true;
  while (picks.length < count && found) {
    found = false;
    for (const cluster of order) {
      if (picks.length >= count) break;
      const topic = ARTICLE_TOPICS[cluster].find((t) => !taken.has(`${cluster}\n${t}`));
      if (topic === undefined) continue;
      taken.add(`${cluster}\n${topic}`);
      picks.push({ cluster, topic });
      found = true;
    }
  }
  return picks;
}
