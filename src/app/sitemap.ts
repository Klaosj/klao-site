import type { MetadataRoute } from 'next';
import { getPosts } from '@/lib/content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  const locales = ['en', 'th'];
  const staticPaths = ['', '/projects', '/writing', '/career'];
  const staticEntries = locales.flatMap((locale) =>
    staticPaths.map((path) => ({ url: `${SITE_URL}/${locale}${path}` })),
  );
  const postEntries = locales.flatMap((locale) =>
    posts.map((post) => ({ url: `${SITE_URL}/${locale}/writing/${post.slug}` })),
  );
  return [...staticEntries, ...postEntries];
}
