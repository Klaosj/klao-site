import { resolveImageUrl } from '@/lib/notion';

// Any path that can't produce a real Notion-hosted image URL -- Notion not
// configured for this deployment, a malformed/invalid ref, or a well-formed
// ref Notion can no longer resolve (expired reference, unshared database,
// Notion 5xx) -- redirects to the bundled neutral placeholder instead of a
// raw 404. A 404 here left the browser painting its own broken-image glyph
// inside the card, which is exactly the gap in spec §5's "broken image ->
// neutral placeholder": public/images/placeholder.svg already exists and is
// used for the *missing* case (ProjectCard.tsx renders it when `imageSrc`
// is null), but was dead code for the *unresolvable* case the moment Notion
// got connected.
//
// Chose to unify all three cases on one response rather than keeping the
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
// A short max-age (vs. 1800s for a resolved image below) means a
// since-fixed token, a since-shared database, or a since-recovered Notion
// outage is picked up on the next request instead of staying stuck on the
// placeholder for half an hour.
const PLACEHOLDER_REDIRECT: ResponseInit = {
  status: 302,
  headers: { Location: '/images/placeholder.svg', 'Cache-Control': 'public, max-age=60' },
};

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string[] }> }) {
  const { ref } = await params;
  if (!process.env.NOTION_TOKEN) return new Response(null, PLACEHOLDER_REDIRECT);
  const url = await resolveImageUrl(ref);
  if (!url) return new Response(null, PLACEHOLDER_REDIRECT);
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'public, max-age=1800' },
  });
}
