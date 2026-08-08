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
// rather than forcing unknown slugs to 404. The trade-off is content.ts's
// intentional ISR rethrow: if Notion is unreachable on the very first request
// for a brand-new slug there is no cache yet to fall back on, so that one
// request 500s instead of 404ing — acceptable for a personal site, since it
// self-heals on retry once Notion is reachable again.
export const dynamicParams = true;

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
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
