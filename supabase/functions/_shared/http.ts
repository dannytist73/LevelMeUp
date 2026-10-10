// Small HTTP helpers shared by the Edge Functions. Plain Web APIs only, so Vitest can run them in Node.

export type Problem = { status: number; code: string; detail?: string };

export function problem(status: number, code: string, detail?: string): Problem {
  return detail === undefined ? { status, code } : { status, code, detail };
}

export function isProblem(value: unknown): value is Problem {
  return typeof value === 'object' && value !== null && typeof (value as Problem).status === 'number' && typeof (value as Problem).code === 'string';
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function problemResponse(p: Problem): Response {
  return json(p.status, { error: p.code, ...(p.detail === undefined ? {} : { detail: p.detail }) });
}

export const MAX_BODY_BYTES = 64 * 1024;

/** The request's JSON body, or a problem: not POST, too large, or not JSON. */
export async function readJson(req: Request, limit = MAX_BODY_BYTES): Promise<unknown> {
  if (req.method !== 'POST') return problem(405, 'method_not_allowed');
  const text = await req.text();
  if (new TextEncoder().encode(text).length > limit) return problem(413, 'too_large');
  try {
    return text.trim() === '' ? {} : JSON.parse(text);
  } catch {
    return problem(400, 'bad_json');
  }
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
