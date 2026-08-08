import { resolveImageUrl } from '@/lib/notion';

// Short-lived cache on 404s so a burst of bogus/retried requests for the same
// bad ref doesn't repeatedly cost a Notion API call (or, for the unconfigured
// case, so the response is at least cacheable — that branch never calls Notion).
const NOT_FOUND_HEADERS = { 'Cache-Control': 'public, max-age=60' };

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string[] }> }) {
  const { ref } = await params;
  if (!process.env.NOTION_TOKEN) return new Response('Not configured', { status: 404, headers: NOT_FOUND_HEADERS });
  const url = await resolveImageUrl(ref);
  if (!url) return new Response('Not found', { status: 404, headers: NOT_FOUND_HEADERS });
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'public, max-age=1800' },
  });
}
