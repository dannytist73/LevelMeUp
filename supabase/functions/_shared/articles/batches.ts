// The Message Batches API for the pipeline (architecture §5.2). With claude.ts, the only files that talk to Claude.
import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import type { BatchRequest } from '../prompts/articles.ts';
import { SubmitError } from './pipeline.ts';
import type { BatchResult, Batches } from './pipeline.ts';
import { clip } from './text.ts';

export function claudeBatches(): Batches {
  // Short timeouts and one retry for reads keep a tick well inside its 240-second lease.
  const client = new Anthropic({ apiKey: Deno.env.get('LMU_ANTHROPIC_API_KEY'), maxRetries: 1, timeout: 30_000 });
  return {
    async submit(requests: readonly BatchRequest[]) {
      try {
        // Never retried: the API takes no idempotency key, so a retry after a lost answer could make a second batch
        // that is billed and never collected (M8a review). The next tick tries again instead.
        // The requests are built and tested in prompts/articles.ts; the SDK's own types are too strict for plain records.
        const batch = await client.messages.batches.create(
          { requests: requests as unknown as Anthropic.Messages.Batches.BatchCreateParams.Request[] },
          { maxRetries: 0 },
        );
        return batch.id;
      } catch (error) {
        // Busy (rate limited, overloaded or unavailable) and key problems (401, 403: the owner fixes the key) made no
        // batch and keep the jobs waiting; another 4xx refuses the request itself. Any other answer (a 500, a gateway's
        // 502 or 504) or none at all (a timeout, a lost connection) doesn't prove no batch was made (M8a re-review).
        const status = error instanceof Anthropic.APIError ? error.status : undefined;
        if (status === 401 || status === 403 || status === 429 || status === 503 || status === 529) {
          throw new SubmitError('busy', clip(`${status} ${(error as Error).message}`, 200));
        }
        if (typeof status === 'number' && status >= 400 && status < 500) throw new SubmitError('refused', clip(`${status} ${(error as Error).message}`, 200));
        throw error;
      }
    },
    async state(batchId) {
      const batch = await client.messages.batches.retrieve(batchId);
      return { ended: batch.processing_status === 'ended', createdAtMs: Date.parse(batch.created_at) };
    },
    async results(batchId) {
      const out: BatchResult[] = [];
      for await (const entry of await client.messages.batches.results(batchId)) {
        const r = entry.result;
        if (r.type === 'succeeded') {
          out.push({ customId: entry.custom_id, type: 'succeeded', message: { content: r.message.content, stop_reason: r.message.stop_reason, usage: r.message.usage }, error: null });
        } else {
          const error = r.type === 'errored' ? clip(`${r.error.error.type}: ${r.error.error.message}`, 300) : r.type;
          out.push({ customId: entry.custom_id, type: r.type, message: null, error });
        }
      }
      return out;
    },
    async cancel(batchId) {
      await client.messages.batches.cancel(batchId);
    },
  };
}
