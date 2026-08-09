import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPost, getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import { assertLocale } from '@/lib/locale';
import { LOCALES, type ContentBlock, type Locale, type Post, type RichSpan } from '@/lib/models';
import { SITE_URL } from '@/lib/site';
import PostBody from '@/components/PostBody';

// --- QA I4: derive a real per-post description ---------------------------
// A post's body is Notion-authored `ContentBlock[]` (models.ts), not a plain
// string, so there is no ready-made "the description" anywhere on a Post --
// one has to be built from the post's own first paragraph. Exported (not a
// route-local closure) so tests/route-metadata.test.ts can exercise it
// directly against constructed Post fixtures, covering two cases this
// file's own generateMetadata below can never reach on its own: a post whose
// body has no paragraph block at all (e.g. only a heading or a quote), and a
// post whose body is empty in BOTH locales. That second case is deliberate,
// not paranoid -- another agent may empty src/content/fixtures/posts.json to
// `[]` this same wave (both current posts are placeholders), and even short
// of that, Notion content is user-edited and can legitimately ship a post
// with no paragraph block yet. The deriver must not assume a paragraph, or a
// post, exists.

function plainText(spans: RichSpan[]): string {
  return spans.map((s) => s.text).join('');
}

const MAX_DESCRIPTION_LENGTH = 155;

// Word-boundary truncation that works for BOTH locales. A plain
// `slice(0, n)`, or splitting on `/\s+/`, is an English assumption: Thai
// prose runs with no spaces between words at all (see the real fixture
// body in src/content/fixtures/posts.json), so cutting mid-word there is
// just as wrong as cutting mid-word in English would be. `Intl.Segmenter`
// with `granularity: 'word'` (available in the Node version this project
// runs on -- verified empirically, not assumed) tokenizes both scripts
// correctly, so walking its segments and stopping before the character
// budget is exceeded lands on a real word boundary in either language,
// instead of slicing a Thai cluster or an English word in half.
function truncateAtWordBoundary(text: string, locale: Locale, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const segmenter = new Intl.Segmenter(locale === 'th' ? 'th' : 'en', { granularity: 'word' });
  let out = '';
  for (const { segment } of segmenter.segment(trimmed)) {
    if ((out + segment).length > maxLength) break;
    out += segment;
  }
  // A pathological maxLength shorter than the very first segment leaves
  // `out` empty -- fall back to a hard character slice rather than shipping
  // a description that is just an ellipsis.
  return out.trim() ? `${out.trimEnd()}…` : `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

// Locale-correct fallback for the two defensive cases above: no paragraph
// block to summarize, or an empty body outright. Never English-on-/th (the
// task's hard rule) and never blank -- an empty <meta name="description">
// is worse than a generic one, since search engines then improvise a
// snippet from arbitrary on-page text (e.g. the nav) instead.
const fallbackDescriptions: Record<Locale, string> = {
  en: "A post from Klao's writing on business development and building software solo.",
  th: 'บทความจากงานเขียนของเกลา ว่าด้วยเรื่อง Business Development และการสร้างซอฟต์แวร์ด้วยตัวคนเดียว',
};

export function derivePostDescription(post: Post, locale: Locale): string {
  // Mirrors PostPage's own body-resolution fallback below (`post.body[locale].length
  // ? post.body[locale] : post.body.en`): an empty TH body still summarizes
  // the EN paragraph rather than falling straight to the generic fallback,
  // and a post empty in both locales falls through to finding no paragraph
  // at all, landing on `fallbackDescriptions` below.
  const blocks = post.body[locale].length ? post.body[locale] : post.body.en;
  const paragraph = blocks.find(
    (b): b is Extract<ContentBlock, { type: 'paragraph' }> => b.type === 'paragraph',
  );
  const text = paragraph ? plainText(paragraph.spans).trim() : '';
  if (!text) return fallbackDescriptions[locale];
  return truncateAtWordBoundary(text, locale, MAX_DESCRIPTION_LENGTH);
}

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
//
// QA I4: `description` and `openGraph`/`twitter` are set here as full
// objects of our own for the same reason as projects/page.tsx and
// writing/page.tsx (see their identical comments) -- without them this was
// the worst instance of the bug, since a post's own writing is this site's
// only genuinely unique indexable content, and it was serving the
// homepage's description verbatim in search results and link previews.
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
  const title = post.title[l];
  const description = derivePostDescription(post, l);
  const url = `${SITE_URL}/${l}/writing/${slug}`;
  // Same one pair of site-wide share-card PNGs as every other route (see
  // projects/page.tsx's comment and design/og/README.md) -- only the alt
  // text is post-specific.
  const ogImage = { url: `/og/og-${l}.png`, width: 1200, height: 630, alt: `${title} · Klao` };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      // 'article', not 'website' (every other route here uses 'website') --
      // this is the one route whose content actually is a dated article, and
      // `publishedTime` is only a valid field on the 'article' OpenGraph
      // variant (node_modules/next/dist/lib/metadata/types/opengraph-types.d.ts).
      type: 'article',
      publishedTime: `${post.date}T00:00:00.000Z`,
      locale: l === 'th' ? 'th_TH' : 'en_US',
      url,
      siteName: 'Klao',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
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
