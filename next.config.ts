import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // T18-g (CO-30): the folder above this project (~/Desktop/Klao Workspace)
  // has a package-lock.json of its own, so Next's lockfile walk picked that
  // folder as the workspace root and warned on every dev and build. The
  // root is this project. `__dirname` is the folder next.config.ts sits in:
  // Next compiles this file to CommonJS, so it is defined (import.meta is
  // not). Next also copies the value into outputFileTracingRoot.
  turbopack: { root: __dirname },
  // P5 flag day: src/app/global-not-found.tsx is the 404 for any path that
  // matches no page (e.g. /en/nope, /th/nope) or no locale (/foo.png), with
  // its own <html>/<head>. Before it, a cold webpack `next dev` crashed on
  // the first such path ("not-found.tsx doesn't have a root layout": this
  // project has no src/app/layout.tsx) and 500'd every request after it
  // until a restart.
  // Still experimental in Next 15.5.26 (the dev banner lists it under
  // "Experiments") -- re-check on each Next upgrade. The old root
  // src/app/not-found.tsx is deleted, so turning this off means restoring
  // that file from git first; tests/next-config.test.ts pins both.
  experimental: { globalNotFound: true },
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
