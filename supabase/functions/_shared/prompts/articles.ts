// The two Claude requests of the article pipeline (architecture §5.2), both sent through the Message Batches API:
// research with web search, as plain text so its citations come back (code builds the brief from them, M8a decision 2),
// then the article as structured output from that brief (decision 3).
import { CLUSTER_NAMES } from '../../../../packages/content/src/index.ts';
import type { ArticleCluster } from '../../../../packages/content/src/index.ts';
import type { Brief } from '../articles/brief.ts';
import { HOUSE_STYLE } from './style.ts';

export const ARTICLE_MODEL = 'claude-opus-5-5';

/** Searches per research request (architecture §5.2: "max ~5 uses"). */
export const MAX_SEARCHES = 5;

export type BatchRequest = { custom_id: string; params: Record<string, unknown> };
export type JobRef = { id: number; attempt: number; cluster: ArticleCluster; topic: string };
/** A job about to be written: on its second attempt, why the first draft was refused (M8a spike). */
export type WriteJob = JobRef & { error?: string | null };

/** Unique per job, attempt and step, as the Batch API requires within a batch. */
export function customId(jobId: number, attempt: number, step: 'research' | 'write'): string {
  return `job-${jobId}-${attempt}-${step}`;
}

export const RESEARCH_SYSTEM = `You research one topic for a short, evidence-based article in LevelMeUp, a self-improvement game.
Search the web (at most ${MAX_SEARCHES} searches) for reliable sources: research papers and their summaries, universities, public health bodies, reputable encyclopedias, museums and long-form journalism. Avoid forums, shops, product pages and content farms, and avoid patents, surveys run by companies about their own market, commercial blogs and preprints; when one of these is the only source for a fact, say what it is in that fact (for example: a survey by a company that sells a screen-time app).
Then write 8 to 14 key facts, each as its own short paragraph and each drawn from the search results, so that every fact carries its citation. Include numbers, study sizes and dates where the sources give them, and say when the evidence is weak or disputed. Tie every number to the exact study and the exact outcome it measured, give the size of a small study, and never describe one paper or review as two.
Write the facts in your own words and never quote. No introduction, no conclusion, no advice: facts only.`;

export function researchRequest(job: JobRef): BatchRequest {
  return {
    custom_id: customId(job.id, job.attempt, 'research'),
    params: {
      model: ARTICLE_MODEL,
      max_tokens: 12000,
      system: RESEARCH_SYSTEM,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }],
      output_config: { effort: 'medium' },
      messages: [{ role: 'user', content: `Topic: ${job.topic}\nArea: ${CLUSTER_NAMES[job.cluster]}` }],
    },
  };
}

const text = (description: string) => ({ type: 'string', description }) as const;

/** The writer's answer (decision 3). Lengths are in the descriptions: the API's schemas take no length limits. */
export const ARTICLE_SCHEMA = {
  type: 'object',
  properties: {
    title: text('Under 70 characters.'),
    summary: text('One or two sentences, under 240 characters.'),
    sections: {
      type: 'array',
      description: '4 to 6 sections. Together their paragraphs and System notes have 800 to 1,200 words.',
      items: {
        type: 'object',
        properties: {
          heading: text('A short heading, under 60 characters.'),
          paragraphs: { type: 'array', items: text('One paragraph of plain prose.'), description: '1 to 4 paragraphs.' },
          system_note: {
            anyOf: [text('A short System note in its terse game-screen voice, starting with "System:".'), { type: 'null' }],
            description: 'At most two sections in the article have one; null otherwise.',
          },
          source_ids: { type: 'array', items: { type: 'integer' }, description: 'The ids of the brief\'s sources this section relies on.' },
        },
        required: ['heading', 'paragraphs', 'system_note', 'source_ids'],
        additionalProperties: false,
      },
    },
    takeaways: { type: 'array', items: text('One sentence.'), description: '2 to 4 takeaways.' },
    reflection_question: text('One question for the reader, ending with a question mark.'),
  },
  required: ['title', 'summary', 'sections', 'takeaways', 'reflection_question'],
  additionalProperties: false,
} as const;

/** On a second attempt, what the checks refused in the first draft, so the writer fixes exactly that (M8a spike). */
function rewrite(job: WriteJob): string {
  if (job.attempt < 2 || job.error === undefined || job.error === null) return '';
  return `\n\nYour first draft of this article failed these checks, so write it again and fix every one. Words named here appear word for word in a source: say that idea in different words. ${job.error}`;
}

export const WRITE_SYSTEM = `You write one daily article for LevelMeUp from a research brief. Follow the house style exactly.

${HOUSE_STYLE}`;

export function writeRequest(job: WriteJob, brief: Brief): BatchRequest {
  // The pages' addresses stay out: the writer cites by id, and the app lists the sources.
  const input = {
    topic: job.topic,
    area: CLUSTER_NAMES[job.cluster],
    sources: brief.sources.map(({ id, title }) => ({ id, title })),
    facts: brief.facts,
  };
  return {
    custom_id: customId(job.id, job.attempt, 'write'),
    params: {
      model: ARTICLE_MODEL,
      max_tokens: 16000,
      system: WRITE_SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ARTICLE_SCHEMA } },
      messages: [{ role: 'user', content: `The research brief (JSON):\n${JSON.stringify(input)}${rewrite(job)}` }],
    },
  };
}
