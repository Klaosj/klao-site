import Link from 'next/link';
import type { Metadata } from 'next';
import { getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { formatDate } from '@/lib/format';
import { assertLocale } from '@/lib/locale';
import type { Locale } from '@/lib/models';
import { SITE_URL } from '@/lib/site';

// See src/app/[locale]/page.tsx for why this is set per leaf page rather
// than on the shared layout. (This is `/[locale]/writing` -- the *listing*
// page -- not `/[locale]/writing/[slug]`, which deliberately keeps
// dynamicParams: true and is unaffected by this file.)
export const dynamicParams = false;

// QA I4 -- see projects/page.tsx's identical comment for why `description`
// and `openGraph`/`twitter` need to be set here as full objects of their
// own, not just `title`/`alternates`: without them this route silently
// serves the home route's description and share card.
const descriptions: Record<Locale, string> = {
  en: "Klao's writing on business development, data, and building software solo — posts in both English and Thai.",
  th: 'งานเขียนของเกลา ว่าด้วยเรื่อง Business Development ข้อมูล และการสร้างซอฟต์แวร์ด้วยตัวคนเดียว มีทั้งภาษาไทยและอังกฤษ',
};

// Same one pair of site-wide share-card PNGs as projects/page.tsx -- see
// that file's comment and design/og/README.md.
const ogAlt: Record<Locale, string> = {
  en: 'Klao — writing on business development, data, and building software solo.',
  th: 'เกลา — งานเขียนเรื่อง Business Development ข้อมูล และการสร้างซอฟต์แวร์ด้วยตัวคนเดียว',
};

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  const title = dict[l].writing;
  const description = descriptions[l];
  const url = `${SITE_URL}/${l}/writing`;
  const ogImage = { url: `/og/og-${l}.png`, width: 1200, height: 630, alt: ogAlt[l] };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · Klao`,
      description,
      type: 'website',
      locale: l === 'th' ? 'th_TH' : 'en_US',
      url,
      siteName: 'Klao',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · Klao`,
      description,
      images: [ogImage],
    },
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
      {/* Say so, rather than rendering an empty <ul>. Both fixture posts were
          placeholder stubs and were pulled on 2026-08-09, which left this page
          as a heading above nothing -- a visitor cannot tell that apart from a
          page that failed to load. Same treatment CvBand already gives an
          unpopulated Career database. */}
      {posts.length === 0 && (
        <p className="mt-6 text-[14.5px] text-soft">{dict[locale].writingUnpublished}</p>
      )}
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
