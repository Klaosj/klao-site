'use client';

// This boundary's 404 error document ships without [locale]/layout.tsx's
// stylesheet link -- layout.tsx is the only other importer of globals.css,
// so without this import the page renders unstyled. Verified against the
// production build.
import '../globals.css';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// QA C3 fix (see .superpowers/qa/2026-08-09-QA-SUMMARY.md). Next's built-in
// 404 shipped with no <html lang>, zero <a> elements and English-only copy
// on a bilingual site. This file (and src/app/not-found.tsx, its root-level
// counterpart for a different class of unmatched URL -- see that file's own
// comment) replaces it.
//
// not-found.tsx files deliberately receive NO props -- no `params` -- so
// the active locale has to be recovered from the URL itself, the same
// `pathname?.split('/')[1] === 'th'` check LocaleToggle.tsx already uses for
// the identical reason.
export function resolveLocale(pathname: string | null): Locale {
  return pathname?.split('/')[1] === 'th' ? 'th' : 'en';
}

// Split from the default export so tests can render it directly with an
// explicit `locale` prop -- every other section component in this codebase
// (ContactBand, CvBand, SiteNav, ...) takes `locale` as a prop rather than
// resolving it internally, and testing the default export directly would
// mean stubbing next/navigation's router context just to reach the 'th'
// branch, which nothing else in this repo's test suite does.
//
// NOT imported by src/app/not-found.tsx, even though its markup is nearly
// identical: cross-importing a named export between two Next.js
// route-convention files was tried first and broke at runtime under
// Turbopack ("resolveLocale is not a function") -- the app-router loader
// for page/not-found/layout files doesn't reliably carry extra named
// exports through its client-reference pipeline, only the conventional
// default export. That file keeps its own small, self-contained copy
// instead (see its comment for the full explanation).
export function NotFoundContent({ locale }: { locale: Locale }) {
  const t = dict[locale];

  // projects / writing / career are real top-level routes (see
  // src/app/[locale]/{projects,writing,career}/page.tsx); home is the
  // locale root itself. Every href is locale-prefixed so a visitor who hit
  // /th/nope lands back in Thai, not English.
  const moreLinks: { href: string; label: string }[] = [
    { href: `/${locale}/projects`, label: t.projects },
    { href: `/${locale}/writing`, label: t.writing },
    { href: `/${locale}/career`, label: t.career },
  ];

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center bg-deep px-6 py-[16vh] text-center">
      {/* React 19's built-in <title> hoisting (Next 15 App Router renders it
          directly, same as any other host element) -- gives this specific
          boundary a real, locale-correct title instead of silently
          inheriting the home page's default "Klao — Suwichak Jarunopratamp"
          from [locale]/layout.tsx's generateMetadata, which not-found.tsx
          has no generateMetadata hook of its own to override. */}
      <title>{`${t.notFoundTitle} · Klao`}</title>

      <p className={`mb-5 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        404
      </p>
      <h1 className="max-w-[20ch] text-[clamp(28px,4.6vw,52px)] font-bold leading-[1.15] tracking-[-0.025em] text-on-dark">
        {t.notFoundTitle}
      </h1>
      <p className="mt-5 max-w-[46ch] text-[14.5px] leading-[1.7] text-on-dark-soft">{t.notFoundBody}</p>

      {/* .btn opts this capsule into the site's magnetic-pointer effect
          (globals.css), same idiom as ContactBand's mailto CTA and CvBand's
          resume link. */}
      <Link
        href={`/${locale}`}
        className="btn mt-10 inline-flex items-center gap-3 rounded-full bg-light px-8 py-4 text-[13.5px] font-semibold text-dark"
      >
        {t.backHome} <span aria-hidden="true">→</span>
      </Link>

      <nav className="mt-12 flex flex-wrap justify-center gap-8 text-[12.5px]">
        {moreLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-on-dark-soft underline underline-offset-4 transition-colors hover:text-on-dark"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}

// The default export Next actually mounts for this segment. Only reachable
// when Next explicitly throws notFound() from within an already-matched
// [locale] route (e.g. writing/[slug]/page.tsx's unknown-slug guard) --
// verified against the running dev server: [locale]/layout.tsx renders
// first in that case (so <html lang> is already correct before this ever
// mounts), and the RSC payload for GET /en/writing/<bogus-slug> names this
// exact file (`"[locale]/not-found.tsx"`) as the boundary's fallback. It is
// NOT reached for a path that matches no page at all anywhere in the tree
// (e.g. /en/nope) -- Next's router never partially renders [locale] for
// those; see src/app/not-found.tsx for that case instead.
export default function NotFound() {
  const pathname = usePathname();
  return <NotFoundContent locale={resolveLocale(pathname)} />;
}
