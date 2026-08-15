import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    // Pre-redesign routes the home page absorbed as sections; temporary
    // (307) so the URLs can come back as real pages if the sections outgrow
    // the single-page layout. '/projects' DID come back (2026-08-15): it is
    // the blog-style project index the deck's "All projects" link targets,
    // so only '/career' still redirects.
    return [
      { source: '/:locale(en|th)/career', destination: '/:locale#cv', permanent: false },
    ];
  },
};

export default nextConfig;
