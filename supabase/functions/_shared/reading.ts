// M8b: the daily reading (spec §4.1 "Assignment"; plan decisions 1–8). Pure: the article a new quest day gets, the one
// the next day would get (the phone's offline day), Insight's options and its check, the readings, and an article as the
// phone shows it. db.ts reads the rows.
import { ARTICLE_CLUSTERS, CLASS_CLUSTERS, GOAL_CLUSTERS } from '../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../packages/content/src/index.ts';
import { abilityUnlocked, questDayDate } from '../../../packages/rules/src/index.ts';
import type { ClassId, Goal } from '../../../packages/rules/src/index.ts';

/** A published article as the chooser sees it, with the last quest day it was given to this player (null: unread). */
export type CandidateRow = {
  id: string;
  cluster: ArticleCluster;
  title: string;
  reading_minutes: number;
  evergreen: boolean;
  published_at: Date | null;
  last_given: number | null;
};

/** Insight's choice as `character_state.insight` stores it (0015). */
export type InsightRow = { cluster: string; day: number };

/** An article on Today's card, as the next day's pick, and in the past readings. */
export type ArticleSummary = { id: string; cluster: ArticleCluster; title: string; minutes: number };

export const summaryOf = (c: CandidateRow): ArticleSummary => ({ id: c.id, cluster: c.cluster, title: c.title, minutes: c.reading_minutes });

export const isCluster = (v: unknown): v is ArticleCluster => typeof v === 'string' && (ARTICLE_CLUSTERS as readonly string[]).includes(v);

/** `article-<job id>`, the ids 0014 gives. */
export const isArticleId = (v: unknown): v is string => typeof v === 'string' && /^article-[0-9]{1,18}$/.test(v);

/** A player's areas: the topic of each goal and of the class, once each (decision 2). */
export function preferredClusters(goals: readonly Goal[], classId: ClassId): ArticleCluster[] {
  return [...new Set([...goals.map((g) => GOAL_CLUSTERS[g]), CLASS_CLUSTERS[classId]])];
}

/** Days 1, 2, 3, 6, 7, 8 … read from the player's areas; days 4, 5, 9, 10 … from the others (spec: "about 60 %"). */
export const fromOwnAreas = (dayNumber: number): boolean => (dayNumber - 1) % 5 < 3;

const publishedMs = (c: CandidateRow): number => c.published_at?.getTime() ?? 0;
const byAge = (a: CandidateRow, b: CandidateRow): number => publishedMs(a) - publishedMs(b) || a.id.localeCompare(b.id);

/** The oldest published; one from the topic of the last reading goes after the others. */
function oldest(list: readonly CandidateRow[], previous: ArticleCluster | null): CandidateRow | null {
  return [...list].sort((a, b) => Number(a.cluster === previous) - Number(b.cluster === previous) || byAge(a, b))[0] ?? null;
}

export type ChoiceInput = { dayNumber: number; preferred: readonly ArticleCluster[]; insight: ArticleCluster | null };

/**
 * The article a new quest day gets (decision 1): Insight's topic first, then the day's group (the player's areas on 3
 * days in 5, the other topics on 2), then the other group; with nothing unread, the evergreen article given longest ago;
 * null without one (the reading quest waits).
 */
export function chooseArticle(candidates: readonly CandidateRow[], input: ChoiceInput): CandidateRow | null {
  const given = candidates.filter((c) => c.last_given !== null);
  const previous = given.length === 0 ? null : given.reduce((a, b) => (b.last_given! > a.last_given! ? b : a)).cluster;
  const unread = candidates.filter((c) => c.last_given === null);
  if (input.insight !== null) {
    const chosen = oldest(unread.filter((c) => c.cluster === input.insight), null);
    if (chosen !== null) return chosen;
  }
  const own = unread.filter((c) => input.preferred.includes(c.cluster));
  const others = unread.filter((c) => !input.preferred.includes(c.cluster));
  const [first, second] = fromOwnAreas(input.dayNumber) ? [own, others] : [others, own];
  const pick = oldest(first, previous) ?? oldest(second, previous);
  if (pick !== null) return pick;
  return candidates.filter((c) => c.evergreen).sort((a, b) => (a.last_given ?? 0) - (b.last_given ?? 0) || byAge(a, b))[0] ?? null;
}

/** Insight's topic for the day built after `lastDay` (decision 8): chosen on that day, else none (a choice lapses). */
export function insightFor(insight: InsightRow | null, lastDay: number): ArticleCluster | null {
  return insight !== null && insight.day === lastDay && isCluster(insight.cluster) ? insight.cluster : null;
}

export type Reader = { goals: readonly Goal[]; classId: ClassId; insight: InsightRow | null };

/** The article the day after `day` would get, as of now (decision 4: the phone's offline day). */
export function nextArticle(candidates: readonly CandidateRow[], reader: Reader, day: { number: number; articleId: string | null }): ArticleSummary | null {
  const seen = candidates.map((c) => (c.id === day.articleId && c.last_given === null ? { ...c, last_given: day.number } : c));
  const pick = chooseArticle(seen, {
    dayNumber: day.number + 1, preferred: preferredClusters(reader.goals, reader.classId), insight: insightFor(reader.insight, day.number),
  });
  return pick === null ? null : summaryOf(pick);
}

export const INSIGHT_CHOICES = 3;

/** Topics with an unread article other than today's, read least recently first; ties turn with the day (decision 8). */
export function insightOptions(candidates: readonly CandidateRow[], today: { number: number; articleId: string | null }): ArticleCluster[] {
  const lastRead = (cluster: ArticleCluster): number =>
    Math.max(0, ...candidates.filter((c) => c.cluster === cluster && c.last_given !== null).map((c) => c.last_given!));
  const n = ARTICLE_CLUSTERS.length;
  const turn = (cluster: ArticleCluster): number => (ARTICLE_CLUSTERS.indexOf(cluster) - (today.number % n) + n) % n;
  return ARTICLE_CLUSTERS
    .filter((k) => candidates.some((c) => c.cluster === k && c.last_given === null && c.id !== today.articleId))
    .sort((a, b) => lastRead(a) - lastRead(b) || turn(a) - turn(b))
    .slice(0, INSIGHT_CHOICES);
}

export type InsightView = { options: ArticleCluster[]; chosen: ArticleCluster | null };

/** Insight on Today (decision 8): for a Mage from level 5 on an open day; null otherwise. */
export function insightView(
  candidates: readonly CandidateRow[], reader: Reader & { level: number }, today: { number: number; articleId: string | null; open: boolean } | null,
): InsightView | null {
  if (today === null || !today.open || !abilityUnlocked('insight', reader.classId, reader.level)) return null;
  const chosen = insightFor(reader.insight, today.number);
  const options = insightOptions(candidates, today);
  return { options: chosen === null || options.includes(chosen) ? options : [...options, chosen], chosen };
}

/** Whether Insight may choose `cluster` now (decision 8): the open day's number, or why not. */
export function planInsight(
  candidates: readonly CandidateRow[],
  reader: { classId: ClassId; level: number },
  day: { number: number; articleId: string | null; status: 'open' | 'closed'; endsAtMs: number } | null,
  cluster: ArticleCluster,
  nowMs: number,
): { day: number } | { code: string } {
  if (day === null || day.status !== 'open' || day.endsAtMs <= nowMs) return { code: 'day_closed' };
  if (!abilityUnlocked('insight', reader.classId, reader.level)) return { code: 'ability_not_ready' };
  if (!candidates.some((c) => c.cluster === cluster && c.last_given === null && c.id !== day.articleId)) return { code: 'topic_empty' };
  return { day: day.number };
}

/** An article's section as 0014 stores it (camelCase, from the pipeline's checks). */
type StoredSection = { heading: string; paragraphs: string[]; systemNote: string | null; sourceIds: number[] };

export type ArticleRow = {
  id: string;
  cluster: ArticleCluster;
  title: string;
  summary: string;
  sections: StoredSection[];
  takeaways: string[];
  reflection_question: string;
  reading_minutes: number;
};

export type SourceRow = { article_id: string; idx: number; url: string; title: string };

/** An article as the phone shows it (decision 5): its sources numbered 1…n, each section naming the numbers it uses. */
export type ArticleBody = ArticleSummary & {
  summary: string;
  sections: { heading: string; paragraphs: string[]; systemNote: string | null; sources: number[] }[];
  takeaways: string[];
  question: string;
  sources: { n: number; title: string; url: string; host: string }[];
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function articleBody(row: ArticleRow, sources: readonly SourceRow[]): ArticleBody {
  const ordered = sources.filter((s) => s.article_id === row.id).sort((a, b) => a.idx - b.idx);
  const numbers = new Map(ordered.map((s, i) => [s.idx, i + 1]));
  return {
    id: row.id,
    cluster: row.cluster,
    title: row.title,
    minutes: row.reading_minutes,
    summary: row.summary,
    sections: row.sections.map((s) => ({
      heading: s.heading,
      paragraphs: s.paragraphs,
      // The writer starts a System note with "System:"; the app's box carries that label already.
      systemNote: s.systemNote === null ? null : s.systemNote.replace(/^system:\s*/i, ''),
      sources: [...new Set(s.sourceIds.flatMap((id) => numbers.get(id) ?? []))].sort((a, b) => a - b),
    })),
    takeaways: row.takeaways,
    question: row.reflection_question,
    sources: ordered.map((s, i) => ({ n: i + 1, title: s.title, url: s.url, host: hostOf(s.url) })),
  };
}

/** The readings the Chronicle lists (decision 7). */
export const READINGS_SHOWN = 30;

export type ReadingRow = {
  day_number: number;
  starts_at: Date;
  ends_at: Date;
  time_zone: string;
  article_id: string;
  title: string;
  cluster: ArticleCluster;
  reading_minutes: number;
  takeaway: string | null;
};

export type ReadingView = ArticleSummary & { dayNumber: number; date: string; takeaway: string | null };

export function readingsView(rows: readonly ReadingRow[]): ReadingView[] {
  return [...rows]
    .sort((a, b) => b.day_number - a.day_number)
    .map((r) => ({
      id: r.article_id, cluster: r.cluster, title: r.title, minutes: r.reading_minutes, dayNumber: r.day_number,
      date: questDayDate({ startsAt: r.starts_at.getTime(), endsAt: r.ends_at.getTime(), timeZone: r.time_zone }),
      takeaway: r.takeaway,
    }));
}

/** At most this many ids in a sync's `have` and `want` (decision 3). */
export const MAX_HAVE = 64;
export const MAX_WANT = 3;

/** The articles a response carries (decision 3): those named, less what the phone holds, once each. */
export function bodiesToSend(ids: readonly (string | null)[], have: readonly string[]): string[] {
  const held = new Set(have);
  return [...new Set(ids.filter((id): id is string => id !== null && !held.has(id)))];
}
