import { resolveImageUrl } from '@/lib/notion';

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string[] }> }) {
  const { ref } = await params;
  if (!process.env.NOTION_TOKEN) return new Response('Not configured', { status: 404 });
  const url = await resolveImageUrl(ref);
  if (!url) return new Response('Not found', { status: 404 });
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'public, max-age=1800' },
  });
}
