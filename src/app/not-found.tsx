'use client';

// This boundary renders in Next's synthetic shell outside [locale]/layout.tsx
// (see the file-level comment below) -- layout.tsx is the only other place
// that imports globals.css, so without this import the 404 ships with zero
// stylesheets. Verified against the production build.
import './globals.css';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// QA C3 fix (see .superpowers/qa/2026-08-09-QA-SUMMARY.md). This is the
// ROOT not-found boundary -- the one that actually fires for a path that
// matches no page anywhere in the app (e.g. /en/nope, /th/nope, and a bare
// /nope once middleware.ts's `/nope` -> `/en/nope` redirect resolves).
// Verified empirically against the running dev server (not assumed): Next
// builds a *separate* synthetic tree for this case
// (createNotFoundLoaderTree in next/dist/.../server/app-render/app-render.js)
// whose root node carries NO app layout unless `experimental.globalNotFound`
// is on in next.config.ts (it isn't, and that file is out of scope for this
// fix) -- Next instead wraps this file in its own internal "DefaultLayout"
// (pagePath `__next_builtin__layout.js` in the RSC payload), a bare,
// un-lang'd `<html><body>`. [locale]/layout.tsx, and therefore its `<html
// lang={l}>`, never runs for this case at all, regardless of the URL's
// locale prefix, and there is no file of ours to fix that on (there is no
// src/app/layout.tsx in this project -- see [locale]/layout.tsx's own
// top-of-file comment for why -- and adding one is out of this task's
// file-ownership scope; same for next.config.ts).
//
// This file duplicates [locale]/not-found.tsx's markup rather than
// importing from it: cross-importing a named export between two Next.js
// route-convention files was tried first and failed at runtime under
// Turbopack ("resolveLocale is not a function") -- the app-router loader
// for `page`/`not-found`/`layout` files doesn't reliably preserve extra
// named exports through its client-reference pipeline, only the
// conventional default export. Route-convention files are not safe to use
// as plain shared modules, so the small amount of markup below is kept as
// an intentional, self-contained duplicate instead of fighting that.
function resolveLocale(pathname: string | null): Locale {
  return pathname?.split('/')[1] === 'th' ? 'th' : 'en';
}

export default function RootNotFound() {
  const pathname = usePathname();
  const locale = resolveLocale(pathname);
  const t = dict[locale];

  // The mitigation for the <html lang> gap explained above: Next's implicit
  // outer shell has no lang attribute in the raw SSR payload (curl sees
  // none -- reported honestly in the fix writeup), but WCAG 3.1.1 is about
  // what assistive tech reads from the live DOM, which this corrects for
  // every visit with JS enabled -- which this page already requires, since
  // it depends on usePathname().
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const moreLinks: { href: string; label: string }[] = [
    { href: `/${locale}/projects`, label: t.projects },
    { href: `/${locale}/writing`, label: t.writing },
    { href: `/${locale}/career`, label: t.career },
  ];

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center bg-deep px-6 py-[16vh] text-center">
      <title>{`${t.notFoundTitle} · Klao`}</title>

      <p className={`mb-5 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        404
      </p>
      <h1 className="max-w-[20ch] text-[clamp(28px,4.6vw,52px)] font-bold leading-[1.15] tracking-[-0.025em] text-on-dark">
        {t.notFoundTitle}
      </h1>
      <p className="mt-5 max-w-[46ch] text-[14.5px] leading-[1.7] text-on-dark-soft">{t.notFoundBody}</p>

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
