import type { MetadataRoute } from 'next';
import { getPosts } from '@/lib/content';
import { LOCALES } from '@/lib/models';
import { SITE_URL } from '@/lib/site';

const staticPaths = ['', '/projects', '/writing', '/career'];

// Without this, `.next/prerender-manifest.json` shows `/sitemap.xml` with
// `initialRevalidateSeconds: false` (built once, never again) while every
// content route below it is 3600 -- so a post published to Notion appears
// on `/writing` within the hour but never enters the sitemap, and since
// hreflang lives ONLY in the sitemap (see docs/DEPLOY.md §8, no
// `<link rel="alternate">` tags in page HTML), a new post also never gets
// any hreflang at all. That directly contradicts README.md's "content
// updates need no redeploy" -- this file calls getPosts() same as every
// other content route, so it needs the same revalidate window.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();

  // A "logical page" is a path shared by both locales (e.g. '/projects' or
  // '/writing/some-slug'). Each logical page gets one sitemap <url> entry
  // per locale, and every entry for that page carries the SAME
  // `alternates.languages` map -- both locale URLs for that specific page,
  // plus `x-default` pointing at the EN URL. That makes every pair
  // reciprocal (the EN entry's `th` alternate and the TH entry's `en`
  // alternate agree) and self-referential to the right page -- fixing Task
  // 10 review Important #2, where layout.tsx previously emitted one static
  // `{ en: '/en', th: '/th' }` map on every page regardless of which page
  // it was, so e.g. a post's "th" alternate pointed at the Thai home page
  // instead of the Thai post.
  const pages: { path: string; lastModified?: string }[] = [
    ...staticPaths.map((path) => ({ path })),
    // lastModified is a signal Google actually uses (unlike priority/
    // changefreq, which it ignores and which this file deliberately omits).
    // Post.date is exactly that signal; static pages have no equivalent
    // "last modified" source, so they're left unset rather than faked.
    ...posts.map((post) => ({ path: `/writing/${post.slug}`, lastModified: post.date })),
  ];

  return pages.flatMap(({ path, lastModified }) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      ...(lastModified ? { lastModified } : {}),
      alternates: {
        languages: {
          en: `${SITE_URL}/en${path}`,
          th: `${SITE_URL}/th${path}`,
          'x-default': `${SITE_URL}/en${path}`,
        },
      },
    })),
  );
}
