import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    // Pre-redesign routes. The home page absorbed them as sections; temporary
    // (307) so the URLs can come back as real pages if the sections outgrow
    // the single-page layout.
    return [
      { source: '/:locale(en|th)/projects', destination: '/:locale#work', permanent: false },
      { source: '/:locale(en|th)/career', destination: '/:locale#cv', permanent: false },
    ];
  },
};

export default nextConfig;
