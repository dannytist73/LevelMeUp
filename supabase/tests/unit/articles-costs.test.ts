import { describe, expect, it } from 'vitest';
import { ESTIMATE_USD, MONTHLY_CAP_USD, costUsd } from '../../functions/_shared/costs.ts';

describe('costUsd (spec §4.1, prices of 2026-10-12)', () => {
  it('prices Opus 5.5 at $4 / $20 per million tokens, half in a batch', () => {
    expect(costUsd('claude-opus-5-5', { input_tokens: 1_000_000, output_tokens: 1_000_000 }, false)).toBe(24);
    expect(costUsd('claude-opus-5-5', { input_tokens: 1_000_000, output_tokens: 1_000_000 }, true)).toBe(12);
  });

  it('adds $0.01 a web search, batch or not', () => {
    const usage = { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 3 } };
    expect(costUsd('claude-opus-5-5', usage, true)).toBe(0.03);
    expect(costUsd('claude-opus-5-5', usage, false)).toBe(0.03);
  });

  it('prices cache writes and reads', () => {
    expect(costUsd('claude-opus-5-5', { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 }, false)).toBe(5.2);
  });

  it('rounds to the micro-dollar the log keeps', () => {
    expect(costUsd('claude-opus-5-5', { input_tokens: 1234, output_tokens: 567 }, true)).toBe(0.008138);
  });

  it('keeps the cap and generous estimates', () => {
    expect(MONTHLY_CAP_USD).toBe(25);
    expect(ESTIMATE_USD).toEqual({ reveal: 0.05, research: 0.4, write: 0.25, deck: 0.08 });
  });
});
