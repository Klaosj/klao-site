// Single source of truth for the deployed site origin. Consumed by
// layout.tsx (metadataBase/canonical), the four page-level generateMetadata
// functions, sitemap.ts, and robots.ts -- previously each of layout.tsx,
// sitemap.ts, and robots.ts computed `process.env.NEXT_PUBLIC_SITE_URL ??
// 'http://localhost:3000'` independently, which had two silent failure
// modes:
//
//   - Unset in a real deploy: the sitemap/robots.txt silently ship a bunch
//     of localhost URLs. The build exits 0 -- nothing fails, the site is
//     just quietly unindexable. Fixed below by throwing when the env var is
//     missing AND we can tell this is an actual Vercel build/runtime (see
//     the VERCEL check) rather than a local build.
//
//     Deliberately NOT keyed on NODE_ENV === 'production': `next build`
//     always sets NODE_ENV=production, including for a plain local
//     `npm run build` (this project's own dev workflow, and how Task 10/11
//     verification is run) -- so that check can't distinguish "a real
//     deploy with no site URL configured" from "a developer building
//     locally," and would force NEXT_PUBLIC_SITE_URL to be set just to run
//     `npm run build` on a laptop, which conflicts with this project's
//     fixture-mode-first design (see src/lib/content.ts: it runs on bundled
//     fixtures with zero env vars). `VERCEL` is set to '1' in every one of
//     Vercel's own build and runtime environments, so it's a much more
//     precise signal for "this is actually being deployed."
//
//   - A trailing slash (or a trailing slash plus a pasted-in trailing
//     space -- realistic when this gets pasted into Vercel's dashboard,
//     e.g. "https://klao.dev/ ") produces `https://klao.dev//en` in the
//     sitemap and `//sitemap.xml` in robots.txt, while `metadataBase` (a
//     URL object) silently trims/normalizes both away -- so sitemap/robots
//     and canonical/hreflang URLs would disagree. Fixed by trimming
//     whitespace and stripping trailing slashes once, here.
//
//   - A value with no protocol (e.g. "klao.dev" instead of
//     "https://klao.dev") would ship broken sitemap/robots strings and
//     then blow up wherever `new URL(SITE_URL)` runs (layout.tsx's
//     `metadataBase`) with an opaque `TypeError` that never mentions
//     NEXT_PUBLIC_SITE_URL. Fixed by validating with `new URL()` here, at
//     the single point of resolution, with an error message that names the
//     variable and shows the bad value.
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) {
    const cleaned = raw.trim().replace(/\/+$/, '');
    try {
      new URL(cleaned);
    } catch {
      throw new Error(
        `NEXT_PUBLIC_SITE_URL is set to "${raw}", which is not a valid absolute URL (missing ` +
          'protocol? e.g. "https://klao.dev"). Fix the NEXT_PUBLIC_SITE_URL environment variable.',
      );
    }
    return cleaned;
  }
  if (process.env.VERCEL) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL is not set. Required on Vercel so the sitemap, robots.txt, and ' +
        'canonical/hreflang URLs point at the real site instead of localhost.',
    );
  }
  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();
