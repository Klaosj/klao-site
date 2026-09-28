import { resolveImageUrl } from '@/lib/notion';

// Notion hands out file URLs that are signed and expire after about an hour,
// so the site never puts one in its HTML: every Notion image is linked as
// /api/img/<ref> (notion-mappers.ts fileProxy, post blocks), and this route
// asks Notion for a fresh URL when the image is requested.
//
// Until P5 gate a, the route answered with a 302 to that signed URL on
// Notion's S3 bucket in us-west-2. That made the hero tour's first frame --
// the page's LCP element, preloaded at high priority (HeroTourStage T18-f) --
// cost a redirect plus a new cross-origin, cross-region connection. Measured
// on the Notion-connected preview (Lighthouse mobile, applied Slow-4G + 4x
// CPU): LCP 3.39 s /en and 3.38 s /th against the 2.5 s budget, and the
// live site's 1.96 s; the image's load duration alone was 2.65-2.73 s for
// 52 KB. Serving the same file from this origin cut LCP by about 1.6 s in
// the A/B. Numbers and waterfall: .superpowers/sdd/2026-09-25-white-edition-
// p5-cleanup-qa/gate-a-report.md, section 4.
//
// So the route now fetches the image on the server and answers with the
// bytes. The browser keeps the HTTP/2 connection it already has, and
// Vercel's edge caches the answer (s-maxage), so only the first visitor per
// region after a deploy or an expiry waits for Notion and S3. The browser
// and the edge keep a copy for an hour, then serve the stale copy for up to
// a day while one request refreshes it: an image Klao replaces in Notion
// shows within about an hour, like the text through ISR. It also ends the
// old coupling between a cached 302 (30 min) and Notion's 60-minute URLs.
//
// Not an open proxy: the request only chooses a Notion ref (a block, or a
// page id plus a property name), resolveImageUrl validates it and asks the
// Notion API, and the one URL fetched below is the one Notion returned --
// nothing in the request's path or query is ever fetched. Keep it that way.
// What Notion returns is Klao's own content, so only an image/* answer is
// passed on, capped in size and time, and marked nosniff with a sandbox CSP:
// an SVG uploaded to Notion now lives on this origin, and if someone opens
// it directly, its scripts must not run here.
const IMAGE_CACHE = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';
// Vercel Functions cap a response body at 4.5 MB (FUNCTION_PAYLOAD_TOO_LARGE,
// vercel.com/docs/functions/limitations, checked 28 Sep 2026), so the guard
// sits below it. Site images are meant to be <= 250 KB; anything this big
// is a mistake in Notion, and the placeholder is the honest answer.
const MAX_BYTES = 4 * 1024 * 1024;
// A slow upstream must not hold the function (or the LCP) hostage. For scale:
// S3 answered the 52 KB hero image in about 1 s from Bangkok (gate a, §4).
const TIMEOUT_MS = 8_000;

// Any path that can't produce a real Notion-hosted image -- Notion not
// configured for this deployment, a malformed/invalid ref, a well-formed
// ref Notion can no longer resolve (expired reference, unshared database,
// Notion 5xx), or an upstream fetch that fails, times out, is too big or is
// not an image -- redirects to the bundled neutral placeholder instead of a
// raw 404. A 404 here left the browser painting its own broken-image glyph
// inside the card, which is exactly the gap in spec §5's "broken image ->
// neutral placeholder": public/images/placeholder.svg already exists and is
// used for the *missing* case (ProjectCard.tsx renders it when `imageSrc`
// is null), but was dead code for the *unresolvable* case the moment Notion
// got connected.
//
// Chose to unify all these cases on one response rather than keeping the
// malformed/invalid-ref path on a bare 404 "because it's cheap": the actual
// cost concern documented in resolveImageUrl (Notion's ~3 req/s
// per-integration limit) is about avoiding a Notion API call, not about the
// HTTP status code -- resolveImageUrl's validId() check already
// short-circuits before any Notion call for a malformed ref, so redirecting
// it costs one extra same-origin static-asset request, not an API call.
// Splitting the malformed case back out to a distinct 404 would need
// resolveImageUrl to report *why* it returned null, for no real benefit:
// both cases should look identical to a visitor.
//
// A short max-age (vs. an hour for a served image above) means a
// since-fixed token, a since-shared database, or a since-recovered Notion
// or S3 outage is picked up on the next request instead of staying stuck on
// the placeholder for an hour.
const PLACEHOLDER_REDIRECT: ResponseInit = {
  status: 302,
  headers: { Location: '/images/placeholder.svg', 'Cache-Control': 'public, max-age=60' },
};
const placeholder = () => new Response(null, PLACEHOLDER_REDIRECT);

// Logged without the signed URL: the ref is enough to find the Notion row.
function upstreamFailed(ref: string[], why: unknown): Response {
  console.warn('[img] serving the placeholder for', ref.join('/'), why);
  return placeholder();
}

// Reads the whole body, but stops (and cancels the download) the moment it
// passes MAX_BYTES, so a missing or wrong Content-Length can't get a huge
// file past the guard. Buffering is fine at this size, and it means a
// failure can still become the placeholder: once a 200 has started
// streaming, it can't.
async function readCapped(body: ReadableStream<Uint8Array>): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  return bytes;
}

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string[] }> }) {
  const { ref } = await params;
  if (!process.env.NOTION_TOKEN) return placeholder();
  const url = await resolveImageUrl(ref);
  if (!url) return placeholder();

  // One deadline for the whole exchange, the body included: the signal also
  // aborts a body that is still arriving.
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(new Error(`no answer within ${TIMEOUT_MS} ms`)), TIMEOUT_MS);
  try {
    // no-store: Vercel's edge is the cache (see IMAGE_CACHE); Next's data
    // cache would only fill with copies keyed by URLs that expire in an hour.
    const res = await fetch(url, { signal: deadline.signal, cache: 'no-store' });
    const type = res.headers.get('content-type') ?? '';
    const declared = Number(res.headers.get('content-length'));
    if (res.status !== 200 || !/^image\//i.test(type) || declared > MAX_BYTES || !res.body) {
      await res.body?.cancel().catch(() => {});
      return upstreamFailed(ref, `upstream ${res.status}, ${type || 'no content-type'}, ${declared || '?'} bytes`);
    }
    const bytes = await readCapped(res.body);
    if (!bytes) return upstreamFailed(ref, `upstream body over ${MAX_BYTES} bytes`);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': IMAGE_CACHE,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (e) {
    return upstreamFailed(ref, e);
  } finally {
    clearTimeout(timer);
  }
}
