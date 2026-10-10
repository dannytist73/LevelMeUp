// The one Claude call in M3: the onboarding reveal's words (spec §4.2). Off until the owner adds
// LMU_ANTHROPIC_API_KEY; any failure, refusal or the 12 s timeout falls back to the template reveal.
import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import { REVEAL_SCHEMA } from './onboarding.ts';

export const REVEAL_MODEL = 'claude-opus-5-5';
const TIMEOUT_MS = 12_000;

const SYSTEM = `You write the character reveal for LevelMeUp, a self-improvement game with an anime and manhwa feel.
Write in the player's chosen voice: "mentor" is warm and encouraging, "system" is terse and factual like a game screen,
"questmaster" is strict but fair. Use only the facts given; never invent numbers, medical claims or promises.
No shaming, no threats, no emoji. Plain words. The narrative is two or three sentences.`;

export type RevealCall = { value: unknown; inputTokens: number; outputTokens: number } | { error: string };

export function claudeConfigured(): boolean {
  return (Deno.env.get('LMU_ANTHROPIC_API_KEY') ?? '') !== '';
}

export async function writeReveal(facts: string): Promise<RevealCall> {
  const client = new Anthropic({ apiKey: Deno.env.get('LMU_ANTHROPIC_API_KEY'), maxRetries: 0, timeout: TIMEOUT_MS });
  try {
    const response = await client.messages.create({
      model: REVEAL_MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: REVEAL_SCHEMA } },
      messages: [{ role: 'user', content: `Facts about the player (JSON): ${facts}` }],
    });
    if (response.stop_reason !== 'end_turn') return { error: `stop_reason ${response.stop_reason}` };
    const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    return { value: JSON.parse(text), inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  } catch (error) {
    if (error instanceof Anthropic.APIError) return { error: `${error.name} ${error.status ?? ''}`.trim() };
    return { error: String(error).slice(0, 200) };
  }
}
