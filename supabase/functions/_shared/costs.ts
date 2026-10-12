// What a Claude call costs (spec §4.1: every AI call logs model, tokens and cost, and a $25 monthly cap is checked
// before each one). Prices of 2026-10-12 from platform.claude.com/docs/en/about-claude/pricing: Claude Opus 5.5 $4 / $20
// per million input / output tokens, cache writes $5 and reads $0.20, all halved in a batch; web search $10 per 1,000
// searches, batch or not. Update this table when the pricing page changes.

export const MONTHLY_CAP_USD = 25;

/**
 * Held against the cap while a call runs, until its real cost replaces it. Generous, but not a hard ceiling: a research
 * request can't limit the input tokens its searches bring back, so the spike (M8a Task 13) checks the research estimate.
 */
export const ESTIMATE_USD = { reveal: 0.05, research: 0.4, write: 0.25 } as const;

const PRICES = { 'claude-opus-5-5': { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 } } as const;
const SEARCH_USD = 0.01;

export type PricedModel = keyof typeof PRICES;

/** The parts of the API's `usage` that cost money. */
export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
};

export function costUsd(model: PricedModel, usage: Usage, batch: boolean): number {
  const p = PRICES[model];
  const perMillion = usage.input_tokens * p.input + usage.output_tokens * p.output
    + (usage.cache_creation_input_tokens ?? 0) * p.cacheWrite + (usage.cache_read_input_tokens ?? 0) * p.cacheRead;
  const tokens = (perMillion / 1_000_000) * (batch ? 0.5 : 1);
  return Math.round((tokens + (usage.server_tool_use?.web_search_requests ?? 0) * SEARCH_USD) * 1e6) / 1e6;
}
