import Link from 'next/link';
import { getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/models';

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
              {post.title[locale]}
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
