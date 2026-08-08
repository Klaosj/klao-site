import Link from 'next/link';
import type { Metadata } from 'next';
import { getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/models';
import { SITE_URL } from '@/lib/site';

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l: Locale = locale === 'th' ? 'th' : 'en';
  return {
    title: dict[l].writing,
    alternates: { canonical: `${SITE_URL}/${l}/writing` },
  };
}

export default async function WritingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const posts = await getPosts();
  return (
    <div>
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
