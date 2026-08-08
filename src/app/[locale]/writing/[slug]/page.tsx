import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPost, getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/models';
import PostBody from '@/components/PostBody';

export async function generateStaticParams() {
  const posts = await getPosts();
  return ['en', 'th'].flatMap((locale) => posts.map((post) => ({ locale, slug: post.slug })));
}

// Content lives in Notion and is deliberately published between deploys (see
// klao-site project notes), so a slug added after the last build must still
// resolve without a redeploy — that requires the default `dynamicParams: true`
// rather than forcing unknown slugs to 404. The real cost is broader than just
// a brand-new slug's first request: because content.ts rethrows outside the
// build phase, EVERY request for a slug not in generateStaticParams — legit
// new posts, but also bogus and crawler slugs, forever — is an uncached live
// Notion lookup, and any of them 500s instead of 404ing whenever Notion is
// degraded or rate-limited. 404-correctness for unknown slugs is permanently
// coupled to Notion's uptime.
//
// The pre-check below narrows that exposure. getPosts() is *not* wrapped in
// React's cache() (unlike getProjectsCached/getProfileCached in content.ts),
// and the Notion SDK doesn't go through the global fetch Next.js patches, so
// this is not a free cache hit in live-Notion mode — it's a second live call.
// But it's a strictly cheaper one: a single metadata list query, versus
// getPost()'s per-slug filtered query *plus* a full block-content fetch that
// a bogus/crawler slug would otherwise trigger on every single request. In
// fixture mode (no NOTION_TOKEN — how this build currently runs) getPosts()
// is a synchronous local read, so the check is genuinely free there. Either
// way, an unknown slug now 404s without ever reaching fetchPostBySlug.
export const dynamicParams = true;

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const knownSlugs = await getPosts();
  if (!knownSlugs.some((p) => p.slug === slug)) notFound();
  const post = await getPost(slug);
  if (!post) notFound();
  const body = post.body[locale].length ? post.body[locale] : post.body.en;
  return (
    <article>
      <p className="text-sm">
        <Link href={`/${locale}/writing`} className="text-soft hover:text-ink">
          ← {dict[locale].back}
        </Link>
      </p>
      <h1 className="mt-4 font-display text-3xl">{post.title[locale]}</h1>
      <p className="mt-2 text-xs text-soft">{formatDate(post.date, locale)}</p>
      <div className="mt-8">
        <PostBody blocks={body} />
      </div>
    </article>
  );
}
