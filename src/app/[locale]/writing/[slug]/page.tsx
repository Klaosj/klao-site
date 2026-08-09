import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPost, getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import { assertLocale } from '@/lib/locale';
import { LOCALES } from '@/lib/models';
import { SITE_URL } from '@/lib/site';
import PostBody from '@/components/PostBody';

export async function generateStaticParams() {
  const posts = await getPosts();
  return LOCALES.flatMap((locale) => posts.map((post) => ({ locale, slug: post.slug })));
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
//
// This also leaves the `locale` segment on this route dynamically
// resolvable at the framework level (no ancestor sets dynamicParams: false,
// unlike the four leaf pages in this route group -- see layout.tsx's
// generateStaticParams comment). A bogus locale here (e.g.
// `/xx/writing/<slug>`) isn't rejected by Next's static-path fallback the
// way `/favicon.ico` is; it's caught one line below by `assertLocale`
// instead, which is fine specifically for this route since it already has
// to run its own body for the equivalent bogus-slug case.
export const dynamicParams = true;

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint). Gives each post its own title --
// the real SEO loss Important #3 called out, since posts and projects are
// this site's actual discoverable content -- and a self-referential
// canonical. Mirrors PostPage's own unknown-slug guard below so a bogus/
// crawler slug 404s from generateMetadata too rather than reading
// `post.title[l]` off a null post.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const knownSlugs = await getPosts();
  if (!knownSlugs.some((p) => p.slug === slug)) notFound();
  const post = await getPost(slug);
  if (!post) notFound();
  return {
    title: post.title[l],
    alternates: { canonical: `${SITE_URL}/${l}/writing/${slug}` },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = assertLocale(rawLocale);
  const knownSlugs = await getPosts();
  if (!knownSlugs.some((p) => p.slug === slug)) notFound();
  const post = await getPost(slug);
  if (!post) notFound();
  const body = post.body[locale].length ? post.body[locale] : post.body.en;
  return (
    // See projects/page.tsx and layout.tsx for why this page owns its own
    // reading-width column and top padding now.
    <article className="mx-auto w-full max-w-3xl px-6 pb-16 pt-28">
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
