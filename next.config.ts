import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // T18-g (CO-30): the folder above this project (~/Desktop/Klao Workspace)
  // has a package-lock.json of its own, so Next's lockfile walk picked that
  // folder as the workspace root and warned on every dev and build. The
  // root is this project. `__dirname` is the folder next.config.ts sits in:
  // Next compiles this file to CommonJS, so it is defined (import.meta is
  // not). Next also copies the value into outputFileTracingRoot.
  turbopack: { root: __dirname },
  async redirects() {
    // Pre-redesign routes the home page absorbed as sections; temporary
    // (307) so the URLs can come back as real pages if the sections outgrow
    // the single-page layout. '/projects' DID come back (2026-08-15): it is
    // the blog-style project index the deck's "All projects" link targets,
    // so only '/career' still redirects.
    return [
      // White Edition P3 (C7): the career section's anchor is #career now.
      { source: '/:locale(en|th)/career', destination: '/:locale#career', permanent: false },
    ];
  },
};

export default nextConfig;
