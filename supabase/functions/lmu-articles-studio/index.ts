// POST /functions/v1/lmu-articles-studio — the daily studio's door (M15, plan 2026-10-20-m15-daily-studio.md): the
// owner's PC takes a topic, and hands back the article, its story and its picture, which are checked again and stored
// here. It answers only to the studio secret, compared in constant time like the tick's; off until LMU_STUDIO_SECRET is
// set. The picture is uploaded with the service key, which never leaves the server.
//   { "action": "claim", "dry"? }                         -> { job } or { none: "busy" | "no_topics" }
//   { "action": "fail", "jobId", "error" }                 -> { recorded }
//   { "action": "submit", "jobId", "brief", "article", "deck", "picture"?, "dry"? }
//                                                          -> { stored | checked, picture, words }, or 422 { problems }
//   { "action": "picture", "articleId", "picture" }        -> { picture } (Monster Buddy: a stored story's clay picture),
//                                                             422 { problems }, or 404 when the article has no story
import { db, lmuCode } from '../_shared/db.ts';
import { isObject, isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { tickAllowed } from '../_shared/articles/auth.ts';
import { studioStore } from '../_shared/articles/store.ts';
import { STUDIO_MAX_BODY, claim, readPicture, readSubmission, recordFailure, repicture, submit } from '../_shared/articles/studio.ts';
import type { Art } from '../_shared/articles/studio.ts';
import { clip } from '../_shared/articles/text.ts';

function art(): Art {
  return {
    async upload(path, webp) {
      const url = Deno.env.get('SUPABASE_URL');
      const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key) throw new Error('the storage key is not set');
      const res = await fetch(`${url}/storage/v1/object/lmu-art/${path}`, {
        method: 'POST',
        headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'image/webp', 'x-upsert': 'true', 'cache-control': 'max-age=3600' },
        body: webp,
      });
      if (!res.ok) throw new Error(`the picture upload failed: ${res.status} ${clip(await res.text(), 200)}`);
    },
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return problemResponse(problem(405, 'method_not_allowed'));
  if (!tickAllowed(req.headers.get('x-lmu-studio'), Deno.env.get('LMU_STUDIO_SECRET') ?? '')) return problemResponse(problem(401, 'unauthorized'));
  const body = await readJson(req, STUDIO_MAX_BODY);
  if (isProblem(body)) return problemResponse(body);
  if (!isObject(body)) return problemResponse(problem(400, 'bad_request'));
  const store = studioStore(db());
  try {
    if (body.action === 'claim') return json(200, await claim(store, body.dry === true));
    if (body.action === 'fail') {
      if (!Number.isInteger(body.jobId) || typeof body.error !== 'string') return problemResponse(problem(400, 'bad_request'));
      return json(200, { recorded: await recordFailure(store, body.jobId as number, body.error) });
    }
    if (body.action === 'submit') {
      const read = readSubmission(body);
      if (Array.isArray(read)) return json(422, { error: 'refused', problems: read });
      const result = await submit(store, art(), read, body.dry === true);
      return 'conflict' in result ? problemResponse(problem(409, 'conflict', 'the job is not waiting in the studio')) : json(200, result);
    }
    if (body.action === 'picture') {
      if (typeof body.articleId !== 'string') return problemResponse(problem(400, 'bad_request'));
      const picture = readPicture(body.picture);
      if (typeof picture === 'string') return json(422, { error: 'refused', problems: [picture] });
      const result = await repicture(store, art(), body.articleId, picture);
      return 'missing' in result ? problemResponse(problem(404, 'not_found', 'no stored story has that id')) : json(200, result);
    }
    return problemResponse(problem(400, 'bad_request', 'action is claim, fail, submit or picture'));
  } catch (error) {
    if (lmuCode(error) === 'conflict') return problemResponse(problem(409, 'conflict', 'the job is not waiting in the studio'));
    console.error('lmu-articles-studio failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
