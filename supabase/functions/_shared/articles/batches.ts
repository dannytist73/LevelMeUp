// The Message Batches API for the pipeline (architecture §5.2). With claude.ts, the only files that talk to Claude.
import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import type { BatchRequest } from '../prompts/articles.ts';
import type { BatchResult, Batches } from './pipeline.ts';

export function claudeBatches(): Batches {
  const client = new Anthropic({ apiKey: Deno.env.get('LMU_ANTHROPIC_API_KEY'), maxRetries: 2, timeout: 60_000 });
  return {
    async submit(requests: readonly BatchRequest[]) {
      // The requests are built and tested in prompts/articles.ts; the SDK's own types are too strict for plain records.
      const batch = await client.messages.batches.create({ requests: requests as unknown as Anthropic.Messages.Batches.BatchCreateParams.Request[] });
      return batch.id;
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
          const error = r.type === 'errored' ? `${r.error.error.type}: ${r.error.error.message}`.slice(0, 300) : r.type;
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
