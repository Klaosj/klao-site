import Link from 'next/link';
import type { Metadata } from 'next';
import { getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import { assertLocale } from '@/lib/locale';
import { SITE_URL } from '@/lib/site';

// See src/app/[locale]/page.tsx for why this is set per leaf page rather
// than on the shared layout. (This is `/[locale]/writing` -- the *listing*
// page -- not `/[locale]/writing/[slug]`, which deliberately keeps
// dynamicParams: true and is unaffected by this file.)
export const dynamicParams = false;

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: dict[l].writing,
    alternates: { canonical: `${SITE_URL}/${l}/writing` },
  };
}

export default async function WritingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const posts = await getPosts();
  return (
    // See projects/page.tsx and layout.tsx for why this page owns its own
    // reading-width column and top padding now.
    <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-28">
      <h1 className="font-display text-3xl">{dict[locale].writing}</h1>
      <ul className="mt-6 space-y-5">
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/${locale}/writing/${post.slug}`} className="font-medium hover:underline">
              {post.title[locale] || post.title.en}
            </Link>
            <p className="mt-1 text-xs text-soft">
              {formatDate(post.date, locale)}
              {post.tags.length > 0 && <> · {post.tags.join(' · ')}</>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
