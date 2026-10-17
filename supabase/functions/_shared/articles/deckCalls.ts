// The deck writer's real port (M11): one direct Messages API call per deck. An answer is billed by its tokens even when
// it can't be used; a call that never answered (a timeout, a lost connection) may have been billed (M8a review), so the
// pipeline books its estimate.
import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import type { Usage } from '../costs.ts';
import { deckParams } from './deck.ts';
import type { DeckAnswer, DeckSource, Decks } from './pipeline.ts';

const TIMEOUT_MS = 60_000;

export function claudeDecks(): Decks {
  const client = new Anthropic({ apiKey: Deno.env.get('LMU_ANTHROPIC_API_KEY'), maxRetries: 0, timeout: TIMEOUT_MS });
  return {
    async write(source: DeckSource): Promise<DeckAnswer> {
      try {
        // deckParams is built for messages.create; the SDK's own types can't see through the plain record.
        const response = await client.messages.create(deckParams(source.draft) as never) as Anthropic.Message;
        const usage: Usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };
        if (response.stop_reason !== 'end_turn') return { error: `stop_reason ${response.stop_reason}`, usage, maybeBilled: false };
        const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
        try {
          return { value: JSON.parse(text), usage };
        } catch {
          return { error: 'the answer is not JSON', usage, maybeBilled: false };
        }
      } catch (error) {
        if (error instanceof Anthropic.APIError && typeof error.status === 'number') {
          return { error: `${error.name} ${error.status}`, usage: null, maybeBilled: false };
        }
        return { error: String(error).slice(0, 200), usage: null, maybeBilled: true };
      }
    },
  };
}
